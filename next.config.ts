import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/:path*', // 访问 /api/xxx
        destination: 'http://127.0.0.1:4000/:path*', // 实际代理到外部接口
      },
      {
        source: '/workspaces/:id/vscode',
        destination: 'http://127.0.0.1:4000/workspaces/:id/vscode',
      }
    ];
  },
};

export default nextConfig;
