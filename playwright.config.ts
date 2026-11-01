import { defineConfig, devices } from "@playwright/test";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://toktickit:toktickit@localhost:5432/toktickit_test?schema=public";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run dev:server",
      url: "http://localhost:3000/api/health",
      reuseExistingServer: true,
      timeout: 30000,
      env: {
        DATABASE_URL: process.env.DATABASE_URL,
      },
    },
    {
      command: "npm run dev:client",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
