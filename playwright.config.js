// @ts-check
require('dotenv').config(); // loads .env (TEST_USER_EMAIL / TEST_USER_PASSWORD) if present
const { defineConfig, devices } = require('@playwright/test');

// The app is a single static HTML file. We serve the repo root over HTTP so
// service-worker registration and module scripts behave like production
// (localhost counts as a secure context).
const PORT = 8123;

// Authenticated (real-login) tests only run when a test account is configured.
// Without creds we run just the hermetic suite — so a fresh clone / CI without
// secrets still goes green.
const HAS_TEST_USER = !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD);
const STORAGE_STATE = 'playwright/.auth/user.json';

const chrome = { ...devices['Desktop Chrome'] };

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
    // Hermetic tests (no login, Supabase stubbed). Always run.
    {
      name: 'chromium',
      use: chrome,
      testIgnore: /authed[\\/]/,
    },
    // Real-login setup + authed tests — only when a test user is configured.
    ...(HAS_TEST_USER
      ? [
          { name: 'setup', use: chrome, testMatch: /.*\.setup\.js/ },
          {
            name: 'chromium-authed',
            use: { ...chrome, storageState: STORAGE_STATE },
            testMatch: /authed[\\/].*\.spec\.js/,
            dependencies: ['setup'],
          },
        ]
      : []),
  ],
  webServer: {
    command: `node tests/static-server.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/ppl_training_split.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
