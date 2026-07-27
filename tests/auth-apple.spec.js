const { test, expect } = require('@playwright/test');

const APP = '/ppl_training_split.html';

test.describe('Apple sign-in', () => {
  test('the Apple button appears on the sign-in page', async ({ page }) => {
    await page.goto(APP);
    await expect(page.getByRole('button', { name: /Continue with Apple/i })).toBeVisible();
  });

  test('clicking it calls signInWithOAuth with provider "apple"', async ({ page }) => {
    await page.goto(APP);
    // Stub the OAuth call so no real redirect happens.
    await page.evaluate(() => {
      window.__oauth = null;
      _sb.auth.signInWithOAuth = async (opts) => { window.__oauth = opts; return { data: {}, error: null }; };
    });
    await page.getByRole('button', { name: /Continue with Apple/i }).click();
    const opts = await page.evaluate(() => window.__oauth);
    expect(opts.provider).toBe('apple');
    expect(opts.options.redirectTo).toContain('ppl_training_split.html');
  });
});
