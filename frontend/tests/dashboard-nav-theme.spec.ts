import { expect, test, type Page } from '@playwright/test';

function luminance(rgb: string): number {
  const channels = rgb.match(/\d+/g)!.slice(0, 3).map(Number);
  const linear = channels.map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const staffUser = {
  token: 'staff-test-token', customerToken: 'customer-test-token', userId: 'staff-1',
  firstName: 'Test', lastName: 'Coordinator', phone: '0820000000',
  roles: ['COORDINATOR', 'HUSTLER'], businessProfileId: 'business-1',
  businessName: 'Test Business', businessType: 'Services'
};
const hustler = { token: 'h-token', businessProfileId: 'business-1', businessName: 'Test Business', firstName: 'Thandi', lastName: 'M' };
const driver = { token: 'd-token', driverId: 'driver-1', firstName: 'Sipho', lastName: 'D', vehicleType: 'Bakkie', communityName: 'KwaNgwenya' };

// Each dashboard's header band and its tab switch
const dashboards = [
  { path: '/facilitator', head: '.dash-head', tabs: '.seg-tabs' },
  { path: '/dashboard?tab=money', head: '.dash-head', tabs: '.seg-tabs' },
  { path: '/driver', head: '.dash-head', tabs: '.seg-tabs' },
  { path: '/coordinator', head: '.staff-shell__header', tabs: '.seg-tabs' },
  { path: '/operations', head: '.staff-shell__header', tabs: null }
];

async function open(page: Page, path: string, theme: 'light' | 'dark') {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(([t, u, h, d]) => {
    localStorage.setItem('thenga_theme', t as string);
    localStorage.setItem('hustle_unified_auth', JSON.stringify(u));
    localStorage.setItem('hustle_auth', JSON.stringify(h));
    localStorage.setItem('hustle_driver_auth', JSON.stringify(d));
  }, [theme, staffUser, hustler, driver] as const);
  await page.route('**/api/**', route => route.fulfill({ status: 200, json: [] }));
  await page.goto(path);
}

for (const d of dashboards) {
  test(`${d.path} navigation is light in light mode and readable`, async ({ page }) => {
    await open(page, d.path, 'light');
    const head = page.locator(d.head).first();
    await expect(head).toBeVisible();
    const bg = await head.evaluate(el => getComputedStyle(el).backgroundColor);
    const fg = await head.evaluate(el => getComputedStyle(el).color);
    expect(luminance(bg)).toBeGreaterThan(0.8);
    expect(contrast(bg, fg)).toBeGreaterThanOrEqual(4.5);

    if (d.tabs) {
      const active = page.locator(`${d.tabs} > button[aria-pressed="true"]`).first();
      await expect(active).toBeVisible();
      const on = await active.evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, fg: getComputedStyle(el).color }));
      expect(contrast(on.bg, on.fg)).toBeGreaterThanOrEqual(4.5);
      const idle = page.locator(`${d.tabs} > button[aria-pressed="false"]`).first();
      const idleFg = await idle.evaluate(el => getComputedStyle(el).color);
      const trackBg = await page.locator(d.tabs).first().evaluate(el => getComputedStyle(el).backgroundColor);
      expect(contrast(trackBg, idleFg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test(`${d.path} navigation stays ink in dark mode`, async ({ page }) => {
    await open(page, d.path, 'dark');
    const head = page.locator(d.head).first();
    await expect(head).toBeVisible();
    const bg = await head.evaluate(el => getComputedStyle(el).backgroundColor);
    const fg = await head.evaluate(el => getComputedStyle(el).color);
    expect(luminance(bg)).toBeLessThan(0.05);
    expect(contrast(bg, fg)).toBeGreaterThanOrEqual(4.5);
  });
}

test('bottom nav marks the current page with a gold pill and uses icons, not emoji', async ({ page }) => {
  await open(page, '/dashboard', 'light');
  const current = page.locator('.bottom-nav-item.active .bottom-nav-icon').first();
  await expect(current).toBeVisible();
  expect(await current.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(229, 163, 29)');
  const nav = page.locator('.bottom-nav').first();
  expect(luminance(await nav.evaluate(el => getComputedStyle(el).backgroundColor))).toBeGreaterThan(0.8);
  await expect(nav.locator('mat-icon').first()).toBeVisible();
  expect(await nav.innerText()).not.toMatch(/\p{Extended_Pictographic}/u);
});

test('the hustler rail on a big screen is light, with the current tab in gold', async ({ page }) => {
  await open(page, '/dashboard', 'light');
  await page.setViewportSize({ width: 1280, height: 900 });
  const rail = page.locator('.dash-rail');
  await expect(rail).toBeVisible();
  expect(luminance(await rail.evaluate(el => getComputedStyle(el).backgroundColor))).toBeGreaterThan(0.8);
  const current = rail.locator('[aria-current="page"]');
  await expect(current).toHaveCount(1);
  expect(await current.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(229, 163, 29)');
});
