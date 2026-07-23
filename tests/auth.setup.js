const { test: setup, expect } = require('@playwright/test');
const path = require('node:path');

const STORAGE_STATE = path.join(__dirname, '..', 'playwright', '.auth', 'user.json');

// Signs in once with the dedicated test account and saves the session so the
// authed specs start already logged in. Credentials come from env only
// (.env locally, GitHub Actions secrets in CI) — never committed.
setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) {
    throw new Error('TEST_USER_EMAIL / TEST_USER_PASSWORD not set — see .env.example');
  }

  await page.goto('/ppl_training_split.html');

  // Sign-in form is the default auth tab.
  await page.fill('#authEmail', email);
  await page.fill('#authPass', password);
  await page.click('#authSubmitBtn');

  // A fully-onboarded test account lands straight in the app: the auth overlay
  // closes and the header (with the @handle) becomes visible.
  await expect(page.locator('#authOverlay')).toBeHidden({ timeout: 20_000 });
  await expect(page.locator('#hdrUser')).toBeVisible({ timeout: 20_000 });

  await page.context().storageState({ path: STORAGE_STATE });
});
