const { test, expect } = require('@playwright/test');

const APP = '/ppl_training_split.html';

// Render one training day with a single exercise that has `plannedSets` sets.
async function renderExercise(page, plannedSets) {
  await page.evaluate((plannedSets) => {
    DAYS = [{
      id: 0, label: 'MON', name: 'PUSH', type: 'push', col: '#fff', focus: '',
      exercises: [{ name: 'Barbell Bench Press', sets: String(plannedSets), reps: '8-12', note: '', alts: [] }],
      stretches: [],
    }];
    activeDay = 0; activeView = 'day';
    appData = { checked: {}, sessions: {} };
    _addedSets = {};
    document.getElementById('mainContent').style.display = '';
    renderDay();
  }, plannedSets);
}

test.describe('add set', () => {
  test('the set logger shows an "Add set" button and the planned rows', async ({ page }) => {
    await page.goto(APP);
    await renderExercise(page, 3);
    await expect(page.locator('.set-logger').first()).toContainText('Add set');
    expect(await page.locator('.set-row').count()).toBe(3);
  });

  test('clicking add set appends a new set row', async ({ page }) => {
    await page.goto(APP);
    await renderExercise(page, 3);
    const rows = await page.evaluate(() => { addSet(0, 0); return document.querySelectorAll('.set-row').length; });
    expect(rows).toBe(4);
    await expect(page.locator('.set-rows')).toContainText('S4');
  });

  test('logged sets beyond the plan keep their rows (persistence)', async ({ page }) => {
    await page.goto(APP);
    await page.evaluate(() => {
      DAYS = [{
        id: 0, label: 'MON', name: 'PUSH', type: 'push', col: '#fff', focus: '',
        exercises: [{ name: 'Barbell Bench Press', sets: '3', reps: '8', note: '', alts: [] }],
        stretches: [],
      }];
      activeDay = 0; activeView = 'day'; _addedSets = {};
      const today = new Date().toISOString().slice(0, 10);
      appData = { checked: {}, sessions: { [today]: { 0: { 0: [
        { wt: 60, reps: 8 }, { wt: 60, reps: 8 }, { wt: 60, reps: 8 }, { wt: 55, reps: 10 },
      ] } } } };
      document.getElementById('mainContent').style.display = '';
      renderDay();
    });
    expect(await page.locator('.set-row').count()).toBe(4);
  });
});
