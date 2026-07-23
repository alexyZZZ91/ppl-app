const { test, expect } = require('@playwright/test');

// These run with the saved session from auth.setup.js, so the page loads
// already signed in as the test user.
const APP = '/ppl_training_split.html';

test.describe('authenticated session', () => {
  test('lands in the app (no auth overlay) with the @handle in the header', async ({ page }) => {
    await page.goto(APP);

    await expect(page.locator('#authOverlay')).toBeHidden();
    const hdr = page.locator('#hdrUser');
    await expect(hdr).toBeVisible();
    await expect(hdr).toContainText('@'); // the Phase 0 handle span
  });

  test('shows the day strip / training tabs once signed in', async ({ page }) => {
    await page.goto(APP);
    await expect(page.locator('#dayStrip')).toBeVisible();
  });
});
