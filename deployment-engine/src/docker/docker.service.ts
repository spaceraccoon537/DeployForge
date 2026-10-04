import { execFile } from "node:child_process";

function runDocker(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "docker",
      args,
      { windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
      }
    );
  });
}

export async function buildDockerImage(
  projectPath: string,
  imageName: string
): Promise<void> {
  console.log(`Building Docker image: ${imageName}`);

  const output = await runDocker(["build", "-t", imageName, projectPath]);
  if (output) console.log(output);

  console.log("Docker image built successfully.");
}

export async function runDockerContainer(
  imageName: string,
  containerName: string,
  port: number
): Promise<void> {
  console.log(`Starting container: ${containerName}`);

  const containerId = await runDocker([
    "run",
    "-d",
    "--name",
    containerName,
    "-p",
    `${port}:3000`,
    imageName
  ]);
  console.log(`Container started: ${containerId}`);
}

export async function stopContainer(containerName: string): Promise<void> {
  await runDocker(["stop", containerName]);
}

export async function startContainer(containerName: string): Promise<void> {
  await runDocker(["start", containerName]);
}

export async function removeContainer(containerName: string): Promise<void> {
  await runDocker(["rm", "-f", containerName]);
}