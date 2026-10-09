import { expect, test } from '@playwright/test';

function luminance(rgb: string): number {
  const channels = rgb.match(/\d+/g)!.slice(0, 3).map(Number);
  const linear = channels.map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

test('toolbar Login text remains readable in dark mode', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('thenga_theme', 'dark'));
  await page.goto('/');

  const login = page.locator('.toolbar-login-btn');
  await expect(login).toBeVisible();
  const colors = await login.evaluate(button => ({
    text: getComputedStyle(button).color,
    surface: getComputedStyle(button.closest('.app-toolbar')!).backgroundColor
  }));
  const contrast = (Math.max(luminance(colors.text), luminance(colors.surface)) + 0.05)
    / (Math.min(luminance(colors.text), luminance(colors.surface)) + 0.05);

  expect(contrast).toBeGreaterThanOrEqual(4.5);
});
