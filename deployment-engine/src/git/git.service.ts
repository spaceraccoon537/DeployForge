import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function cloneRepository(
  repositoryUrl: string,
  destination: string,
  branch = "main"
): Promise<void> {
  console.log(`Cloning repository: ${repositoryUrl}`);
  console.log(`Branch: ${branch}`);

  const command = `git clone --branch ${branch} --single-branch ${repositoryUrl} "${destination}"`;

  await execAsync(command);

  console.log("Repository cloned successfully.");
}