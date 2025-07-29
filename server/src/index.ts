import Dockerode from 'dockerode';
import express from 'express';
import getPort from 'get-port';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { AppDataSource, initializeDataSource } from './data-source';
import { Workspace } from './entities/Workspace';

const docker = new Dockerode({
  // host: '/var/run/docker.sock'
});
const app = express();
const port = 4000;
const startSshPort = 22000;
const startCodeServerPort = 8080;

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

initializeDataSource()

app.use('/vscode/:name/:any', async (req, res, next) => {
  const ws = await AppDataSource.getRepository(Workspace).findOneBy({ name: req.params.name })

  return createProxyMiddleware({
    target: `http://127.0.0.1:${ws?.codeServerPort}`,
    changeOrigin: true,
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

const getPorts = async () => {
  const usedPorts = await AppDataSource.getRepository(Workspace).find({ select: ['sshPort', 'codeServerPort'] });
  const usedSshPorts = usedPorts.map(v => v.sshPort)
  const usedCodeServerPorts = usedPorts.map(v => v.codeServerPort)

  let sshPort: number;
  let codeServerPort: number

  while (true) {
    sshPort = await getPort({ port: startSshPort });
    if (!usedSshPorts.includes(sshPort)) break;
  }

  while (true) {
    codeServerPort = await getPort({ port: startCodeServerPort });
    if (!usedCodeServerPorts.includes(codeServerPort)) break;
  }

  return { sshPort, codeServerPort }
}


app.post('/workspaces', async (req, res) => {
  const { image, name } = req.body;

  const { sshPort, codeServerPort } = await getPorts()

  const container = await docker.createContainer({
    Image: image,
    name: name,
    Tty: true, // -t
    OpenStdin: true, // -i
    Cmd: ['sh', '-c', `CS_BASE_URL=/vscode/${name}/ \
      /tools/code-server-4.102.2-linux-amd64/bin/code-server --auth none --bind-addr 0.0.0.0:8080 --disable-telemetry`],
    AttachStdout: true,
    AttachStderr: true,
    HostConfig: {
      Binds: [`${path.resolve('./tools')}:/tools`],
      PortBindings: { '8080/tcp': [{ HostPort: `${codeServerPort}` }] },
      // 等同于 `--gpus all`
      DeviceRequests: [
        {
          Driver: 'nvidia',
          Count: -1, // -1 表示 all
          Capabilities: [['gpu']],
        }
      ]
    }
  });

  await AppDataSource.getRepository(Workspace).save({
    name,
    containerId: container.id,
    sshPort,
    codeServerPort,
    status: (await container.inspect()).State.Status,
  });

  res.json({ done: true })
})

app.post('/workspaces/:id/start', async (req, res) => {
  const workspace = await AppDataSource.getRepository(Workspace).findOneBy({ id: parseInt(req.params.id) })
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  const container = docker.getContainer(workspace.containerId);

  await container.start()
  await AppDataSource.getRepository(Workspace).update(workspace, {
    status: (await container.inspect()).State.Status,
  })

  // container.exec({
  //   AttachStdout: true,
  //   AttachStderr: true,
  // }, (err, exec) => {
  //   if (err) {
  //     console.error('Exec error:', err);
  //     return res.status(500).json({ error: 'Failed to start workspace' });
  //   }
  //   exec.start({ Detach: false, Tty: true }, (err, stream) => {
  //     if (err) {
  //       console.error('Exec start error:', err);
  //       return res.status(500).json({ error: 'Failed to start workspace' });
  //     }
  //     stream.on('data', (data) => {
  //       console.log('Exec output:', data.toString());
  //     });
  //     stream.on('end', () => {
  //       console.log('Exec completed');
  //     });
  //   });
  // });
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
