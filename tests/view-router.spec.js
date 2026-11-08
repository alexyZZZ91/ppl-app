const { test, expect } = require('@playwright/test');

const APP = '/ppl_training_split.html';

// Keep renderTabs() (called inside showView) happy without a login.
const SAFE_STATE = () => {
  appData = { checked: {}, sessions: {} };
  _friendData = { friends: [], incoming: [], outgoing: [] };
  _sharedInbox = [];
};

test.describe('view router', () => {
  test('VIEWS registry maps every view to its container', async ({ page }) => {
    await page.goto(APP);
    const views = await page.evaluate(() =>
      Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, v.el])));
    expect(views).toEqual({
      day: 'mainContent',
      rest: 'mainContent',
      hist: 'histContent',
      friends: 'friendsContent',
      board: 'boardContent',
    });
  });

  test('showView records activeView and shows only the target container', async ({ page }) => {
    await page.goto(APP);
    const res = await page.evaluate((safe) => {
      eval(safe); // SAFE_STATE body
      showView('friends');
      const shown = (id) => document.getElementById(id).style.display !== 'none';
      return {
        active: activeView,
        friends: shown('friendsContent'),
        main: shown('mainContent'),
        hist: shown('histContent'),
        board: shown('boardContent'),
      };
    }, `(${SAFE_STATE.toString()})()`);
    expect(res.active).toBe('friends');
    expect(res).toMatchObject({ friends: true, main: false, hist: false, board: false });
  });

  test('day and rest share the main container; others hide', async ({ page }) => {
    await page.goto(APP);
    const res = await page.evaluate((safe) => {
      eval(safe);
      showView('day');
      const dayMain = document.getElementById('mainContent').style.display !== 'none';
      showView('rest');
      return {
        active: activeView,
        dayMain,
        restMain: document.getElementById('mainContent').style.display !== 'none',
        histHidden: document.getElementById('histContent').style.display === 'none',
        boardHidden: document.getElementById('boardContent').style.display === 'none',
      };
    }, `(${SAFE_STATE.toString()})()`);
    expect(res).toMatchObject({ active: 'rest', dayMain: true, restMain: true, histHidden: true, boardHidden: true });
  });
});
