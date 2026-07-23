const { test, expect } = require('@playwright/test');

const APP = '/ppl_training_split.html';
const TODAY = '2026-07-23'; // Thursday; its week starts Monday 2026-07-20

// Run computeStreakStats in the page with a controlled "today".
async function streak(page, dates, goal, today = TODAY) {
  return page.evaluate(({ dates, goal, today }) => {
    const s = {};
    for (const d of dates) s[d] = { '0': { _completed: d + 'T10:00:00Z' } };
    return computeStreakStats(s, goal, today);
  }, { dates, goal, today });
}

// Build N consecutive daily dates from a Monday.
function week(monday, n) {
  const out = [];
  const base = new Date(monday + 'T00:00:00Z').getTime();
  for (let i = 0; i < n; i++) out.push(new Date(base + i * 86400000).toISOString().slice(0, 10));
  return out;
}

test.describe('streak computation (hermetic)', () => {
  test('empty history → zero', async ({ page }) => {
    await page.goto(APP);
    const r = await streak(page, [], 3);
    expect(r).toMatchObject({ current: 0, longest: 0, totalSessions: 0, thisWeekMet: false });
  });

  test('hitting the goal this week → streak 1', async ({ page }) => {
    await page.goto(APP);
    const r = await streak(page, week('2026-07-20', 3), 3);
    expect(r).toMatchObject({ current: 1, longest: 1, thisWeekCount: 3, thisWeekMet: true });
  });

  test('in-progress week does not break a prior streak (grace)', async ({ page }) => {
    await page.goto(APP);
    // last week met (3), this week only 2 logged so far
    const dates = [...week('2026-07-13', 3), ...week('2026-07-20', 2)];
    const r = await streak(page, dates, 3);
    expect(r.current).toBe(1);
    expect(r.thisWeekMet).toBe(false);
  });

  test('three consecutive met weeks → streak 3', async ({ page }) => {
    await page.goto(APP);
    const dates = [...week('2026-07-06', 3), ...week('2026-07-13', 3), ...week('2026-07-20', 3)];
    const r = await streak(page, dates, 3);
    expect(r.current).toBe(3);
    expect(r.longest).toBe(3);
  });

  test('a missed week breaks the current streak but longest remembers', async ({ page }) => {
    await page.goto(APP);
    // week1 met(3), week2 missed(1), week3(this) met(3)
    const dates = [...week('2026-07-06', 3), '2026-07-13', ...week('2026-07-20', 3)];
    const r = await streak(page, dates, 3);
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
  });

  test('goal falls back to a minimum of 1', async ({ page }) => {
    await page.goto(APP);
    const r = await streak(page, ['2026-07-21'], 0);
    expect(r.current).toBe(1);
  });
});

test.describe('leaderboard UI (hermetic)', () => {
  test('renders a ranked friends board with medal + you marker (stubbed)', async ({ page }) => {
    await page.goto(APP);
    await page.evaluate(async () => {
      _currentUser = { id: 'me' };
      _friendData = { friends: [{ otherId: 'f1', username: 'ben' }], incoming: [], outgoing: [] };
      _boardMode = 'friends';
      const rows = [
        { user_id: 'f1', username: 'ben', current_streak: 5, longest_streak: 6 },
        { user_id: 'me', username: 'me', current_streak: 3, longest_streak: 4 },
      ];
      const chain = { select: () => chain, in: () => chain, eq: () => chain, order: () => chain, limit: () => Promise.resolve({ data: rows, error: null }) };
      _sb.from = () => chain;
      document.getElementById('boardContent').style.display = '';
      await renderBoard();
    });
    const bc = page.locator('#boardContent');
    await expect(bc).toContainText('🥇');
    await expect(bc).toContainText('@ben');
    await expect(bc.locator('.lb-row.me')).toContainText('@me');
    await expect(bc.locator('.lb-row.me')).toContainText('you');
  });
});
