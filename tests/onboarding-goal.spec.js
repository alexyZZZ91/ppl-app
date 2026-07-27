const { test, expect } = require('@playwright/test');

const APP = '/ppl_training_split.html';

test.describe('onboarding: multi-select primary goal', () => {
  test('can select more than one goal from the cards', async ({ page }) => {
    await page.goto(APP);
    // Jump the wizard straight to the goal step.
    await page.evaluate(() => {
      const gi = OB_STEPS.findIndex(s => s.key === 'goal');
      _ob = { step: gi, experience: 'x', equipment: 'x', goal: [], daysPerWeek: 6,
              sessionDuration: 60, programWeeks: 8, injuries: [], otherInjury: '', username: 'x' };
      // Onboarding shows only after the auth overlay is hidden (real flow).
      document.getElementById('authOverlay').style.display = 'none';
      document.getElementById('onboardingOverlay').style.display = 'flex';
      _renderObStep();
    });
    const ov = page.locator('#onboardingOverlay');
    await expect(ov).toContainText('Primary Goal');

    await ov.getByRole('button', { name: /Build Muscle/i }).click();
    await ov.getByRole('button', { name: /Lose Fat/i }).click();

    const goals = await page.evaluate(() => _ob.goal);
    expect(goals).toContain('Build muscle');
    expect(goals).toContain('Lose fat');

    // Both cards should read as selected, and Next should be enabled.
    const enabled = await page.evaluate(() => {
      const cfg = OB_STEPS[_ob.step];
      return cfg.multi && (_ob[cfg.key] || []).length > 0;
    });
    expect(enabled).toBe(true);
  });

  test('obToggleMulti adds then removes a value', async ({ page }) => {
    await page.goto(APP);
    const res = await page.evaluate(() => {
      _ob.goal = [];
      obToggleMulti('goal', 'Build muscle');
      obToggleMulti('goal', 'Lose fat');
      const two = [..._ob.goal];
      obToggleMulti('goal', 'Build muscle'); // toggle off
      return { two, one: [..._ob.goal] };
    });
    expect(res.two).toEqual(['Build muscle', 'Lose fat']);
    expect(res.one).toEqual(['Lose fat']);
  });
});
