import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AppDataSource, initializeDataSource } from './data-source';
import { Workspace } from './entities/Workspace';
import Dockerode from 'dockerode';
import getPort from 'get-port';
import path from 'path';

const docker = new Dockerode({
  // host: '/var/run/docker.sock'
});
const app = express();
const port = 4000;

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

initializeDataSource()

const network = 'bridge'; // 默认网络

const volumeName = 'dwm-shared-data'; // 共享卷名称

async function setupSharedVolume() {
  // 创建 Docker 卷
  const volumes = await docker.listVolumes();
  const volumeExists = volumes.Volumes.some(v => v.Name === volumeName);
  if (volumeExists) {
    console.log('Volume "shared-data" already exists.');
    return;
  }
  const volume = await docker.createVolume({
    Name: volumeName
  });

  // 在容器 A 中，挂载 volume 到 /mnt/shared
  const containerA = await docker.createContainer({
    Image: 'alpine',
    Cmd: ['sh', '-c', 'echo "Hello from A" > /mnt/shared/hello.txt && sleep 300'],
    HostConfig: {
      Mounts: [
        {
          Type: 'volume',
          Source: volumeName,
          Target: '/mnt/shared',
        }
      ]
    }
  });

  await containerA.start();
  console.log('Container A started.');
}

app.use('/workspaces/:name/vscode', (req, res, next) => {
  return createProxyMiddleware({
    target: `http://${req.params.name}:8080`,
    changeOrigin: true,
    // pathRewrite: {
    //   '^\s\S*$': '', // 重写路径
    // },
  })(req, res, next);
});

app.get('/workspaces', async (req, res) => {
  const workspaces = await AppDataSource.getRepository(Workspace).find()

  res.json(workspaces)
})

app.get('/workspaces/:id', async (req, res) => {
  const workspace = await AppDataSource.getRepository(Workspace).findOneBy({ containerId: req.params.id })

  res.json(workspace)
})

app.post('/workspaces', async (req, res) => {
  const { image, name } = req.body;
  console.log(path.resolve('./tools'))
  const container = await docker.createContainer({
    Image: image,
    name: name,
    Tty: true, // -t
    OpenStdin: true, // -i
    // Cmd: ['sh'], // 默认命令
    HostConfig: {
      Binds: [`${path.resolve('./tools')}:/tools`],
    },
    NetworkingConfig: {
      EndpointsConfig: {
        [network]: {
          // Aliases: [name],
        },
      },
    },
  });

  await AppDataSource.getRepository(Workspace).save({
    name,
    containerId: container.id,
    sshPort: await getPort({ port: 22000 }),
    status: (await container.inspect()).State.Status,
  });

  res.json({ done: true })
})

app.post('/workspaces/:id/start', async (req, res) => {
  const workspace = await AppDataSource.getRepository(Workspace).findOneBy({ id: parseInt(req.params.id) })
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  await docker.getContainer(workspace.containerId)?.start()
  await AppDataSource.getRepository(Workspace).update(workspace, {
    status: (await docker.getContainer(workspace.containerId)?.inspect()).State.Status,
  })

  docker.getContainer(workspace.containerId)?.exec({
    Cmd: ['sh', '-c', `/tools/code-server-4.102.2-linux-amd64/bin/code-server --auth none --bind-addr 0.0.0.0:8080 --base-path /workspaces/${workspace.name}/vscode --disable-telemetry`],
    AttachStdout: true,
    AttachStderr: true,
  }, (err, exec) => {
    if (err) {
      console.error('Exec error:', err);
      return res.status(500).json({ error: 'Failed to start workspace' });
    }
    exec.start({ Detach: false, Tty: true }, (err, stream) => {
      if (err) {
        console.error('Exec start error:', err);
        return res.status(500).json({ error: 'Failed to start workspace' });
      }
      stream.on('data', (data) => {
        console.log('Exec output:', data.toString());
      });
      stream.on('end', () => {
        console.log('Exec completed');
      });
    });
  });
  res.json({ done: true })
})

app.post('/workspaces/:id/restart', async (req, res) => {
  const workspace = await AppDataSource.getRepository(Workspace).findOneBy({ id: parseInt(req.params.id) })
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }
  await docker.getContainer(workspace.containerId)?.restart()
  res.json({ done: true })
})

app.post('/workspaces/:id/stop', async (req, res) => {
  const workspace = await AppDataSource.getRepository(Workspace).findOneBy({ id: parseInt(req.params.id) })
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }
  await docker.getContainer(workspace.containerId)?.stop()
  await AppDataSource.getRepository(Workspace).update(workspace, {
    status: (await docker.getContainer(workspace.containerId)?.inspect()).State.Status,
  })
  res.json({ done: true })
})

app.post('/workspaces/:id/remove', async (req, res) => {
  const workspace = await AppDataSource.getRepository(Workspace).findOneBy({ id: parseInt(req.params.id) })
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }
  await docker.getContainer(workspace.containerId)?.remove()
  await AppDataSource.getRepository(Workspace).remove(workspace)
  res.json({ done: true })
})

app.get('/images', async (req, res) => {
  const images = await docker.listImages()

  res.json(images)
})

// 启动服务
app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});
