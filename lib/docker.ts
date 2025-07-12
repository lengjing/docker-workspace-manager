import Docker from "dockerode";
const docker = new Docker();

export async function getRandomPort(): Promise<number> {
  // 简单模拟分配
  return Math.floor(22000 + Math.random() * 1000);
}

export async function createDockerContainer({
  name,
  image,
  volumeMountPath,
  sshPort
}: {
  name: string;
  image: string;
  volumeMountPath: string;
  sshPort: number;
}): Promise<string> {
  const container = await docker.createContainer({
    Image: image,
    name: `workspace_${name}_${Date.now()}`,
    Cmd: ["/bin/bash", "-c", "tail -f /dev/null"],
    HostConfig: {
      Binds: [`${volumeMountPath}:/data`],
      PortBindings: {
        "22/tcp": [{ HostPort: sshPort.toString() }]
      },
      // Resources: {
      //   // 这里可扩展支持CPU/GPU限制
      //   // NanoCPUs: 1000000000,
      //   // Memory: 512 * 1024 * 1024
      // },
    },
    ExposedPorts: {
      "22/tcp": {}
    }
  });

  await container.start();
  return container.id;
}
