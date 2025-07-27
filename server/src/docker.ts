import Dockerode from "dockerode";

const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });

const getRandomPort = () => {
  // 简单模拟分配
  return Math.floor(22000 + Math.random() * 1000);
}

const createContainer = async ({
  name,
  image,
  volumeMountPath,
  sshPort
}: {
  name: string;
  image: string;
  volumeMountPath: string;
  sshPort: number;
}): Promise<string> => {

  const container = await docker.createContainer({
    Image: image,
    name: `workspace_${name}_${Date.now()}`,
    // Cmd: ["/bin/bash", "-c", "tail -f /dev/null"],
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

const listContainers = docker.listContainers

const listImages = docker.listImages

export default {
  listImages,
  listContainers,
  createContainer,
  getRandomPort
}