// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// The app is a single static HTML file. We serve the repo root over HTTP so
// service-worker registration and module scripts behave like production
// (localhost counts as a secure context).
const PORT = 8123;

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `node tests/static-server.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/ppl_training_split.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
