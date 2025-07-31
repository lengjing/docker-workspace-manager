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
        source: '/vscode/:name/:path*',
        destination: 'http://127.0.0.1:4000/vscode/:name/:path*',
      }
    ];
  },
  eslint: {
    "ignoreDuringBuilds": true,
  },
};

export default nextConfig;
