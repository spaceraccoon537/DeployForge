import { deploy } from "./deployment/deployment.service.js";

const repositoryUrl = process.argv[2];

if (!repositoryUrl) {
  console.error(
    "Usage: npm run dev -- <github-repository-url>"
  );

  process.exit(1);
}

await deploy({
  repositoryUrl,
  branch: "main",
  projectName: "test-app",
  port: 3001
});