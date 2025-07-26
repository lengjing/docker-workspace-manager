// server.ts
import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import Dockerode from 'dockerode';

const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });

const app = express();
const port = 3000;

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

  try {
    const container = docker.getContainer(containerId);
    const data = await container.inspect();

    const ip = data?.NetworkSettings?.IPAddress;
    const port = 8888;

    if (!ip) throw new Error('容器未分配 IP 地址');
    const target = `http://${ip}:${port}`;
    containerRoutes[containerId] = target;

    console.log(`Proxy created: /jupyter/${containerId}/ → ${target}`);

    return createProxyMiddleware({
      target,
      pathRewrite: { [`^/jupyter/${containerId}`]: '' },
      changeOrigin: true,
      ws: true,
    })(req, res, next);
  } catch (err) {
    res.status(500).send(`容器 ${containerId} 不存在或未启动: ${(err as Error).message}`);
  }
});

// 启动服务
app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});
