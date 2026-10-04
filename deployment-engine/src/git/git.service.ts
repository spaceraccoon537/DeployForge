import { execFile } from "node:child_process";

export async function cloneRepository(
  repositoryUrl: string,
  destination: string,
  branch = "main"
): Promise<void> {
  console.log(`Cloning repository: ${repositoryUrl}`);
  console.log(`Branch: ${branch}`);

  await new Promise<void>((resolve, reject) => {
    execFile(
      "git",
      ["clone", "--branch", branch, "--single-branch", repositoryUrl, destination],
      { windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });

  const commitHash = await new Promise<string>((resolve, reject) => {
    execFile(
      "git",
      ["-C", destination, "rev-parse", "HEAD"],
      { windowsHide: true },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout.trim());
      }
    );
  });

  console.log(`COMMIT:${commitHash}`);
  console.log("Repository cloned successfully.");
}