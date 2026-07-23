const { test, expect } = require('@playwright/test');

const APP = '/ppl_training_split.html';

// Seed friend data and render the friends screen — no login, no network.
async function renderWith(page, data) {
  await page.goto(APP);
  await page.evaluate((data) => {
    _friendData = data;
    renderFriends();
    document.getElementById('friendsContent').style.display = '';
  }, data);
}

const SAMPLE = {
  friends: [{ rowId: 'f1', otherId: 'A', username: 'amy' }],
  incoming: [{ rowId: 'i1', otherId: 'B', username: 'ben' }],
  outgoing: [{ rowId: 'o1', otherId: 'C', username: 'cat' }],
};

test.describe('friends UI (hermetic)', () => {
  test('_relStatus classifies each relationship from cached data', async ({ page }) => {
    await page.goto(APP);
    const res = await page.evaluate((data) => {
      _friendData = data;
      return { a: _relStatus('A'), b: _relStatus('B'), c: _relStatus('C'), z: _relStatus('Z') };
    }, SAMPLE);
    expect(res.a).toMatchObject({ status: 'friends', rowId: 'f1' });
    expect(res.b).toMatchObject({ status: 'incoming', rowId: 'i1' });
    expect(res.c).toMatchObject({ status: 'outgoing', rowId: 'o1' });
    expect(res.z).toMatchObject({ status: 'none' });
  });

  test('renders requests / friends / sent sections with the right actions', async ({ page }) => {
    await renderWith(page, SAMPLE);
    const fc = page.locator('#friendsContent');
    await expect(fc).toContainText('Requests · 1');
    await expect(fc).toContainText('@ben');
    await expect(fc.getByRole('button', { name: 'Accept' })).toBeVisible();
    await expect(fc).toContainText('Friends · 1');
    await expect(fc).toContainText('@amy');
    await expect(fc).toContainText('Sent · 1');
    await expect(fc).toContainText('@cat');
  });

  test('shows the empty state when there are no friends', async ({ page }) => {
    await renderWith(page, { friends: [], incoming: [], outgoing: [] });
    await expect(page.locator('#friendsContent')).toContainText('No friends yet');
  });

  test('search shows an Add button for a non-friend (directory stubbed)', async ({ page }) => {
    await page.goto(APP);
    await page.evaluate(() => {
      _currentUser = { id: 'me' };
      _friendData = { friends: [], incoming: [], outgoing: [] };
      _sb.from = () => ({
        select: () => ({ ilike: () => ({ limit: async () => ({ data: [{ user_id: 'X', username: 'zoe' }], error: null }) }) }),
      });
      renderFriends();
      document.getElementById('friendsContent').style.display = '';
    });
    await page.fill('#frSearch', 'zoe');
    const box = page.locator('#frResults');
    await expect(box).toContainText('@zoe');
    await expect(box.getByRole('button', { name: 'Add' })).toBeVisible();
  });
});
