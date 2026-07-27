const { test, expect } = require('@playwright/test');

const APP = '/ppl_training_split.html';

test.describe('email signup', () => {
  test('passes emailRedirectTo back to the app so the confirm link returns here', async ({ page }) => {
    await page.goto(APP);
    // Stub signUp so no real account is created; capture the options.
    await page.evaluate(() => {
      window.__signup = null;
      _sb.auth.signUp = async (opts) => { window.__signup = opts; return { data: {}, error: null }; };
    });

    await page.getByRole('button', { name: 'SIGN UP' }).click();
    await page.fill('#authEmail', 'someone@example.com');
    await page.fill('#authPass', 'a-test-password');
    await page.locator('#authSubmitBtn').click();

    const opts = await page.evaluate(() => window.__signup);
    expect(opts.options.emailRedirectTo).toContain('/ppl_training_split.html');
  });
});
