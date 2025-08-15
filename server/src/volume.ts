import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

interface WorkspaceOptions {
  userId: string;
  sizeMB: number; // 存储大小，单位 MB
  baseDir?: string; // 宿主机基础目录
}

async function createWorkspace(options: WorkspaceOptions) {
  const baseDir = options.baseDir || "/mnt/workspaces";
  const workspaceDir = path.join(baseDir, options.userId);
  const imageFile = path.join(baseDir, `${options.userId}.img`);
  const sizeStr = `${options.sizeMB}M`;

  // 1. 创建基础目录
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  // 2. 创建固定大小文件
  console.log(`Creating storage file ${imageFile} (${sizeStr})...`);
  await execAsync(`fallocate -l ${sizeStr} ${imageFile}`);

  // 3. 格式化为 ext4
  console.log(`Formatting storage file as ext4...`);
  await execAsync(`mkfs.ext4 ${imageFile}`);

  // 4. 挂载 loop device
  console.log(`Mounting storage file to ${workspaceDir}...`);
  await execAsync(`sudo mount -o loop ${imageFile} ${workspaceDir}`);

  // 5. 启动 Docker 容器挂载存储
  const containerName = `workspace_${options.userId}`;
  console.log(`Starting Docker container ${containerName}...`);
  await execAsync(
    `docker run -d --name ${containerName} -v ${workspaceDir}:/home/user/data ubuntu:22.04 tail -f /dev/null`
  );

  console.log(`Workspace for user ${options.userId} created successfully!`);
}

// 示例调用
createWorkspace({ userId: "user123", sizeMB: 1024 })
  .then(() => console.log("All done!"))
  .catch(console.error);
