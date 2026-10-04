import { execFile } from "node:child_process";

function runDocker(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("docker", args, { windowsHide: true }, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export function stopContainer(containerName: string): Promise<void> {
  return runDocker(["stop", containerName]);
}

export function startContainer(containerName: string): Promise<void> {
  return runDocker(["start", containerName]);
}