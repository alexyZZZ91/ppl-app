const { test, expect } = require('@playwright/test');

const APP = '/ppl_training_split.html';

test.describe('share a program (hermetic)', () => {
  test('shared inbox renders in the Friends screen with Adopt/Dismiss', async ({ page }) => {
    await page.goto(APP);
    await page.evaluate(() => {
      _friendData = { friends: [], incoming: [], outgoing: [] };
      _sharedInbox = [{ id: 's1', owner_username: 'amy', name: "@amy's program", plan: [] }];
      renderFriends();
      document.getElementById('friendsContent').style.display = '';
    });
    const fc = page.locator('#friendsContent');
    await expect(fc).toContainText('Shared with you · 1');
    await expect(fc).toContainText("@amy's program");
    await expect(fc).toContainText('from @amy');
    await expect(fc.getByRole('button', { name: 'Adopt' })).toBeVisible();
    await expect(fc.getByRole('button', { name: 'Dismiss' })).toBeVisible();
  });

  test('share modal lists friends with a Send button', async ({ page }) => {
    await page.goto(APP);
    await page.evaluate(() => {
      _friendData = { friends: [{ otherId: 'f1', username: 'ben' }], incoming: [], outgoing: [] };
      openShareModal();
    });
    const ov = page.locator('#shareProgOverlay');
    await expect(ov).toBeVisible();
    await expect(ov).toContainText('Share your program');
    await expect(ov).toContainText('@ben');
    await expect(ov.getByRole('button', { name: 'Send' })).toBeVisible();
  });

  test('share modal shows an empty state with no friends', async ({ page }) => {
    await page.goto(APP);
    await page.evaluate(() => {
      _friendData = { friends: [], incoming: [], outgoing: [] };
      openShareModal();
    });
    await expect(page.locator('#shareProgOverlay')).toContainText('Add friends first');
  });
});
