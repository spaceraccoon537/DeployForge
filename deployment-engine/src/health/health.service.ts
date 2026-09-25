export async function checkHealth(
  url: string,
  retries = 10,
  delay = 2000
): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Health check ${attempt}/${retries}`);

      const response = await fetch(url);

      if (response.ok) {
        console.log("Health check passed.");
        return true;
      }
    } catch {
      console.log("Application not ready yet.");
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  console.log("Health check failed.");

  return false;
}