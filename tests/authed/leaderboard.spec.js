const { test, expect } = require('@playwright/test');

const APP = '/ppl_training_split.html';

// Signed in as the test user. Exercises the real switchBoard pipeline
// (syncUserStats + loadBoard against live RLS). Asserts the board chrome
// renders; row contents depend on data, so we don't assert specific ranks.
test.describe('leaderboard (authenticated)', () => {
  test('the Ranks tab opens the leaderboard', async ({ page }) => {
    await page.goto(APP);
    await expect(page.locator('#dayStrip')).toBeVisible();

    await page.getByRole('button', { name: /ranks/i }).click();

    const bc = page.locator('#boardContent');
    await expect(bc.getByRole('button', { name: 'Friends' })).toBeVisible();
    await expect(bc.getByRole('button', { name: 'Global' })).toBeVisible();
    await expect(bc).toContainText('Weekly consistency');
  });

  test('Global tab reveals the opt-in control', async ({ page }) => {
    await page.goto(APP);
    await page.getByRole('button', { name: /ranks/i }).click();
    await page.locator('#boardContent').getByRole('button', { name: 'Global' }).click();
    await expect(page.locator('.lb-optin')).toBeVisible();
  });
});
