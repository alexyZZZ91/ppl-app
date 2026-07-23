const { test, expect } = require('@playwright/test');

const APP = '/ppl_training_split.html';

// Replace the Supabase directory lookup with a controllable stub so the picker
// tests are hermetic — no login, no live network. `rows` is what the
// `.limit(1)` query resolves its `data` to.
async function stubDirectory(page, rows) {
  await page.evaluate((rows) => {
    // eslint-disable-next-line no-undef
    _sb.from = () => ({
      select: () => ({
        ilike: () => ({
          limit: async () => ({ data: rows, error: null }),
        }),
      }),
    });
  }, rows);
}

// Open the picker WITHOUT returning its (long-lived) Promise to Playwright —
// otherwise page.evaluate would await it until the user confirms and time out.
// The resolved handle is stashed on window.__picked instead.
async function openPicker(page, mode = 'onboard') {
  await page.evaluate((mode) => {
    window.__picked = undefined;
    // eslint-disable-next-line no-undef
    promptUsername({ mode }).then((v) => { window.__picked = v; });
  }, mode);
}

test.describe('app shell', () => {
  test('loads to the sign-in overlay with no uncaught errors', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await page.goto(APP);

    await expect(page.locator('#authOverlay')).toBeVisible();
    await expect(page.locator('.auth-hero-logo')).toContainText('PLAN');
    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  });
});

test.describe('username picker (Phase 0)', () => {
  test('renders on demand with Continue disabled', async ({ page }) => {
    await page.goto(APP);
    await openPicker(page);

    await expect(page.locator('#usernameOverlay')).toBeVisible();
    await expect(page.locator('#unInput')).toBeVisible();
    await expect(page.locator('#unConfirm')).toBeDisabled();
  });

  test('rejects handles that are too short or have illegal characters', async ({ page }) => {
    await page.goto(APP);

    // These fail on format and short-circuit before any network call.
    const tooShort = await page.evaluate(() => _checkUsername('ab'));
    expect(tooShort.ok).toBe(false);
    expect(tooShort.msg).toMatch(/3 characters/);

    const badChars = await page.evaluate(() => _checkUsername('bad name!'));
    expect(badChars.ok).toBe(false);
    expect(badChars.msg).toMatch(/letters, numbers/);
  });

  test('accepts an available handle and confirms', async ({ page }) => {
    await page.goto(APP);
    await stubDirectory(page, []); // empty result => handle is free
    await openPicker(page);

    await page.fill('#unInput', 'alex_p91');
    await expect(page.locator('#unStatus')).toHaveText('Available');
    await expect(page.locator('#unConfirm')).toBeEnabled();

    await page.click('#unConfirm');
    await expect(page.locator('#usernameOverlay')).toBeHidden();
    expect(await page.evaluate(() => window.__picked)).toBe('alex_p91');
  });

  test('rejects a handle that is already taken', async ({ page }) => {
    await page.goto(APP);
    await stubDirectory(page, [{ user_id: 'someone-else' }]); // occupied
    await openPicker(page);

    await page.fill('#unInput', 'takenhandle');
    await expect(page.locator('#unStatus')).toHaveText('That handle is already taken');
    await expect(page.locator('#unConfirm')).toBeDisabled();
  });
});
