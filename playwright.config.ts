import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "dark",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "npm run e2e:server",
    url: "http://127.0.0.1:4173/api/data",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
