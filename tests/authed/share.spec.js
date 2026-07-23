const { test, expect } = require('@playwright/test');

const APP = '/ppl_training_split.html';

// Signed in as the test user. Verifies the share entry point is wired into the
// header and opens the share modal.
test.describe('share a program (authenticated)', () => {
  test('the "share plan" header button opens the share modal', async ({ page }) => {
    await page.goto(APP);
    await expect(page.locator('#hdrUser')).toBeVisible();

    await page.getByRole('button', { name: 'share plan' }).click();

    const ov = page.locator('#shareProgOverlay');
    await expect(ov).toBeVisible();
    await expect(ov).toContainText('Share your program');
  });
});
