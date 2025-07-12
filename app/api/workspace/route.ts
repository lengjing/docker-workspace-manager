import { NextRequest, NextResponse } from "next/server";
import { AppDataSource, initializeDataSource } from "@/lib/data-source";
import { Workspace } from "@/lib/entities/Workspace";
import { createDockerContainer, getRandomPort } from "@/lib/docker";

export async function GET() {
  await initializeDataSource();
  
  const repo = AppDataSource.getRepository(Workspace);
  const all = await repo.find();
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  await initializeDataSource();
  
  const body = await req.json();

  const repo = AppDataSource.getRepository(Workspace);

  // 自动分配 SSH 端口
  const sshPort = await getRandomPort();

  // 调用 Docker 创建
  const containerId = await createDockerContainer({
    name: body.name,
    image: "busybox:latest",
    volumeMountPath: body.volumeMountPath,
    sshPort
  });

  const workspace = repo.create({
    ...body,
    sshPort,
    dockerContainerId: containerId,
    status: "running",
  });

  await repo.save(workspace);
  return NextResponse.json(workspace);
}
