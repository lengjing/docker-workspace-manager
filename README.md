# Workspace Manager

基于 Next.js App Router 的全栈 Docker Workspace 管理系统

## 技术栈

- Next.js 14
- React 18
- TypeScript
- TailwindCSS + shadcn/ui
- TypeORM + SQLite
- Dockerode

## 功能

- 工作台管理
  - 创建工作台
  - 自动分配 SSH 端口
  - 绑定已有宿主机卷
  - 启动容器时执行 tail -f /dev/null
- 存储管理
  - 记录卷路径
  - 供工作台选择

## 运行

```bash
pnpm install
pnpm dev
