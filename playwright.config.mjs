import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "visual.spec.mjs",
  timeout: 30_000,
  retries: 0,
  reporter: "list",
  use: {
    browserName: "chromium",
    headless: true,
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium-browser",
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    },
  },
  webServer: {
    command: "python3 -m http.server 8000 --directory .",
    url: "http://127.0.0.1:8000/docs/",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});