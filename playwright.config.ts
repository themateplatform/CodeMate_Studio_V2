import { defineConfig } from "@playwright/test";

const defaultPort = process.env.PLAYWRIGHT_PORT ?? "5010";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${defaultPort}`;
const webServerCommand = process.env.PLAYWRIGHT_WEB_SERVER ?? `CODESPACE_NAME= PORT=${defaultPort} npm run dev`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 10_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    extraHTTPHeaders: {
      "Content-Type": "application/json",
    },
  },
  webServer: {
    command: webServerCommand,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: true,
  },
});
