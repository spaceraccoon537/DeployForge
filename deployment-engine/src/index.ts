import { deploy } from "./deployment/deployment.service.js";

const [
  repositoryUrl,
  branch = "main",
  projectName = "deployforge-app",
  port = "3001",
  deploymentNumber = "1"
] = process.argv.slice(2);

if (!repositoryUrl) {
  console.error(`
Usage:

npm run dev -- <repositoryUrl> <branch> <projectName> <port> <deploymentNumber>
  `);

  process.exit(1);
}

await deploy({
  repositoryUrl,
  branch,
  projectName,
  port: Number(port),
  deploymentNumber: Number(deploymentNumber)
});