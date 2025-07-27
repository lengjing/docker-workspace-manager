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

// 中间件：动态代理 Jupyter 服务
app.use('/jupyter/:containerId/', async (req: Request, res: Response, next: NextFunction) => {
  const containerId = req.params.containerId;

  // 已缓存，直接代理
  if (containerRoutes[containerId]) {
    return createProxyMiddleware({
      target: containerRoutes[containerId],
      pathRewrite: { [`^/jupyter/${containerId}`]: '' },
      changeOrigin: true,
      ws: true,
    })(req, res, next);
  }

  // try {
  //   const container = docker.getContainer(containerId);
  //   const data = await container.inspect();

  //   const ip = data?.NetworkSettings?.IPAddress;
  //   const port = 8888;

  //   if (!ip) throw new Error('容器未分配 IP 地址');
  //   const target = `http://${ip}:${port}`;
  //   containerRoutes[containerId] = target;

  //   console.log(`Proxy created: /jupyter/${containerId}/ → ${target}`);

  //   return createProxyMiddleware({
  //     target,
  //     pathRewrite: { [`^/jupyter/${containerId}`]: '' },
  //     changeOrigin: true,
  //     ws: true,
  //   })(req, res, next);
  // } catch (err) {
  //   res.status(500).send(`容器 ${containerId} 不存在或未启动: ${(err as Error).message}`);
  // }
});

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
  console.log(req.body)
  const container = await docker.createContainer({
    Image: 'busybox:latest',
    name: req.body?.name,
    Tty: true, // -t
    OpenStdin: true, // -i
    Cmd: ['sh'], // 默认命令
  });
  await container.start(); // -d (后台运行)

  container

  // const sshPort = await getPort({ port: 22000 })
  // const coderPort = await getPort({ port: 22000 })

  // await docker.createContainer({
  //   "Image": "sidecar",
  //   "ExposedPorts": {
  //     [sshPort]: 22,
  //     [coderPort]: 8888
  //   }
  // })

  // await AppDataSource.getRepository(Workspace).save({
  //   name: '',
  //   sshPort: sshPort,
  // })

  res.json({ done: true })
})

app.post('/workspaces/:id/start', async (req, res) => {
  await docker.getContainer(req.params.id)?.start()
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

app.get('/workspaces/:id/jupyter', () => {
  // get container
  // exec container
  // install jupyter
  // run jupyter
})

app.get('/images', async (req, res) => {
  const images = await docker.listImages()

  res.json({ images })
})

// 启动服务
app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});
