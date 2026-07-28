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
    _setOverride = {};
    document.getElementById('mainContent').style.display = '';
    renderDay();
  }, plannedSets);
}

test.describe('add / remove set', () => {
  test('the set logger shows Add + Remove and the planned rows', async ({ page }) => {
    await page.goto(APP);
    await renderExercise(page, 3);
    const logger = page.locator('.set-logger').first();
    await expect(logger).toContainText('Add set');
    await expect(logger).toContainText('Remove set');
    expect(await page.locator('.set-row').count()).toBe(3);
  });

  test('add appends a row, remove drops it again', async ({ page }) => {
    await page.goto(APP);
    await renderExercise(page, 3);
    const afterAdd = await page.evaluate(() => { addSet(0, 0); return document.querySelectorAll('.set-row').length; });
    expect(afterAdd).toBe(4);
    await expect(page.locator('.set-rows')).toContainText('S4');
    const afterRemove = await page.evaluate(() => { removeSet(0, 0); return document.querySelectorAll('.set-row').length; });
    expect(afterRemove).toBe(3);
  });

  test('removing a set drops that set\'s logged data', async ({ page }) => {
    await page.goto(APP);
    const remaining = await page.evaluate(() => {
      DAYS = [{ id: 0, label: 'MON', name: 'PUSH', type: 'push', col: '#fff', focus: '',
        exercises: [{ name: 'Bench', sets: '3', reps: '8', note: '', alts: [] }], stretches: [] }];
      activeDay = 0; activeView = 'day'; _setOverride = {};
      const today = new Date().toISOString().slice(0, 10);
      appData = { checked: {}, sessions: { [today]: { 0: { 0: [
        { wt: 60, reps: 8 }, { wt: 60, reps: 8 }, { wt: 60, reps: 8 }, { wt: 55, reps: 10 },
      ] } } } };
      document.getElementById('mainContent').style.display = '';
      renderDay();
      removeSet(0, 0); // drops the 4th (last) logged set
      return appData.sessions[today][0][0].length;
    });
    expect(remaining).toBe(3);
  });

  test('remove is hidden and a no-op at a single set (min 1)', async ({ page }) => {
    await page.goto(APP);
    await renderExercise(page, 1);
    await expect(page.locator('.set-logger').first()).not.toContainText('Remove set');
    const count = await page.evaluate(() => { removeSet(0, 0); return document.querySelectorAll('.set-row').length; });
    expect(count).toBe(1);
  });

  test('logged sets beyond the plan keep their rows (persistence)', async ({ page }) => {
    await page.goto(APP);
    await page.evaluate(() => {
      DAYS = [{ id: 0, label: 'MON', name: 'PUSH', type: 'push', col: '#fff', focus: '',
        exercises: [{ name: 'Bench', sets: '3', reps: '8', note: '', alts: [] }], stretches: [] }];
      activeDay = 0; activeView = 'day'; _setOverride = {};
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
