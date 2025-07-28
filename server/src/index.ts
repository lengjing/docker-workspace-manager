import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AppDataSource } from './data-source';
import { Workspace } from './entities/Workspace';
import Dockerode from 'dockerode';
import getPort from 'get-port';

const docker = new Dockerode();
const app = express();
const port = 4000;

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// 保存容器ID与代理目标的映射
const containerRoutes: Record<string, string> = {};

app.get('/workspaces', async (req, res) => {
  const containers = await docker.listContainers({
    "all": true,
  });

  res.json({ containers })
})

app.get('/workspaces/:id', async (req, res) => {
  const container = docker.getContainer(req.params.id)
  res.json({ container })
})

app.post('/workspaces', async (req, res) => {
  const container = await docker.createContainer({
    Image: 'busybox:latest',
    name: req.body?.name,
    Tty: true, // -t
    OpenStdin: true, // -i
    Cmd: ['sh'], // 默认命令
  });

  await AppDataSource.getRepository(Workspace).save({
    name: req.body?.name,
    containerId: container.id,
    sshPort: await getPort({ port: 3000 }),
    status: (await container.inspect()).State.Status,
  });

  res.json({ done: true })
})

app.post('/workspaces/:id/start', async (req, res) => {
  await docker.getContainer(req.params.id)?.start()

  docker.getContainer(req.params.id)?.exec({
    Cmd: ['sh', '-c', '/tools/code-server/bin/code-server'],
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
  await docker.getContainer(req.params.id)?.restart()
  res.json({ done: true })
})

app.post('/workspaces/:id/stop', async (req, res) => {
  await docker.getContainer(req.params.id)?.stop()
  res.json({ done: true })
})

app.post('/workspaces/:id/remove', async (req, res) => {
  await docker.getContainer(req.params.id)?.remove()
  res.json({ done: true })
})

app.get('/images', async (req, res) => {
  const images = await docker.listImages()

  res.json({ images })
})

// 启动服务
app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});
