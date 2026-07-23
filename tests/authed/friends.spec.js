const { test, expect } = require('@playwright/test');

const APP = '/ppl_training_split.html';

// Runs signed in as the test user (storageState from auth.setup.js). Exercises
// the real switchFriends -> loadFriendData -> renderFriends pipeline against
// live Supabase + RLS. The test account has no friends, so we assert the
// screen renders (empty state) rather than specific relationships.
test.describe('friends (authenticated)', () => {
  test('the Friends tab opens the friends screen', async ({ page }) => {
    await page.goto(APP);
    await expect(page.locator('#dayStrip')).toBeVisible();

    await page.getByRole('button', { name: /friends/i }).click();

    const fc = page.locator('#friendsContent');
    await expect(fc.locator('#frSearch')).toBeVisible();
    await expect(fc).toContainText('Friends ·');
  });

  test('search field accepts input and queries the directory', async ({ page }) => {
    await page.goto(APP);
    await page.getByRole('button', { name: /friends/i }).click();
    const search = page.locator('#frSearch');
    await expect(search).toBeVisible();
    await search.fill('zz_no_such_handle_zz');
    // Either "No one found." or results — just assert the results area reacts.
    await expect(page.locator('#frResults')).toContainText(/No one found|@/, { timeout: 10_000 });
  });
});
