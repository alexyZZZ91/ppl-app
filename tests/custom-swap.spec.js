const { test, expect } = require('@playwright/test');

const APP = '/ppl_training_split.html';

// Render a single training day with one exercise that has alternatives.
async function renderOneExercise(page) {
  await page.evaluate(() => {
    DAYS = [{
      id: 0, label: 'MON', name: 'PUSH', type: 'push', col: '#fff', focus: '',
      exercises: [{ name: 'Barbell Bench Press', sets: '4', reps: '8-12', note: '', alts: ['Dumbbell Press'] }],
      stretches: [],
    }];
    activeDay = 0; activeView = 'day';
    appData = { checked: {}, sessions: {} };
    document.getElementById('mainContent').style.display = '';
    renderDay();
  });
}

test.describe('custom exercise swap', () => {
  test('swap panel includes a custom text input with Today/Save', async ({ page }) => {
    await page.goto(APP);
    await renderOneExercise(page);
    const panel = page.locator('#alts-e_0_0');
    await expect(panel.locator('#altcustom-e_0_0')).toBeAttached();
    // Panel starts collapsed (display:none), so assert on content, not a11y role.
    await expect(panel).toContainText('Today');
    await expect(panel).toContainText('Save');
  });

  test('typing a custom exercise and applying swaps the name for today', async ({ page }) => {
    await page.goto(APP);
    const result = await page.evaluate(() => {
      DAYS = [{
        id: 0, label: 'MON', name: 'PUSH', type: 'push', col: '#fff', focus: '',
        exercises: [{ name: 'Barbell Bench Press', sets: '4', reps: '8-12', note: '', alts: ['Dumbbell Press'] }],
        stretches: [],
      }];
      activeDay = 0; activeView = 'day';
      appData = { checked: {}, sessions: {} };
      document.getElementById('mainContent').style.display = '';
      renderDay();
      document.getElementById('altcustom-e_0_0').value = 'Hack Squat';
      applyCustomAlt('e_0_0', 0, 0, false); // Today (no persistence)
      return DAYS[0].exercises[0].name;
    });
    expect(result).toBe('Hack Squat');
  });

  test('an empty custom input does nothing', async ({ page }) => {
    await page.goto(APP);
    const name = await page.evaluate(() => {
      DAYS = [{
        id: 0, label: 'MON', name: 'PUSH', type: 'push', col: '#fff', focus: '',
        exercises: [{ name: 'Barbell Bench Press', sets: '4', reps: '8-12', note: '', alts: ['Dumbbell Press'] }],
        stretches: [],
      }];
      activeDay = 0; activeView = 'day';
      appData = { checked: {}, sessions: {} };
      document.getElementById('mainContent').style.display = '';
      renderDay();
      document.getElementById('altcustom-e_0_0').value = '   ';
      applyCustomAlt('e_0_0', 0, 0, false);
      return DAYS[0].exercises[0].name;
    });
    expect(name).toBe('Barbell Bench Press');
  });
});
