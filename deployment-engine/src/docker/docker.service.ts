import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function buildDockerImage(
  projectPath: string,
  imageName: string
): Promise<void> {
  console.log(`Building Docker image: ${imageName}`);

  const command = `docker build -t ${imageName} "${projectPath}"`;

  const { stdout, stderr } = await execAsync(command);

  if (stdout) {
    console.log(stdout);
  }

  if (stderr) {
    console.log(stderr);
  }

  console.log("Docker image built successfully.");
}

export async function runDockerContainer(
  imageName: string,
  containerName: string,
  port: number
): Promise<void> {
  console.log(`Starting container: ${containerName}`);

  await stopAndRemoveContainer(containerName);

  const command = [
    "docker run",
    "-d",
    `--name ${containerName}`,
    `-p ${port}:3000`,
    imageName
  ].join(" ");

  const { stdout } = await execAsync(command);

  console.log(`Container started: ${stdout.trim()}`);
}

async function stopAndRemoveContainer(
  containerName: string
): Promise<void> {
  try {
    await execAsync(`docker stop ${containerName}`);
  } catch {
    // Container may not exist.
  }

  try {
    await execAsync(`docker rm ${containerName}`);
  } catch {
    // Container may not exist.
  }
}