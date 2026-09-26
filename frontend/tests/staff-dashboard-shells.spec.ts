import { expect, test } from '@playwright/test';

const staffUser = {
  token: 'staff-test-token',
  customerToken: 'customer-test-token',
  userId: 'staff-1',
  firstName: 'Test',
  lastName: 'Coordinator',
  phone: '0820000000',
  roles: ['COORDINATOR'],
  businessProfileId: 'business-1',
  businessName: 'Test Business',
  businessType: 'Services'
};

const dashboards = [
  { path: '/facilitator', heading: 'Facilitator', scroller: '.queue-scroll' },
  { path: '/coordinator', heading: 'Coordinator', scroller: '.queue-scroll' },
  { path: '/operations', heading: 'Operations', scroller: '.ops-content' }
];

test.describe('authenticated staff dashboard shells', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((user) => {
      window.localStorage.setItem('hustle_unified_auth', JSON.stringify(user));
    }, staffUser);
    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });
  });

  for (const dashboard of dashboards) {
    test(`${dashboard.heading} keeps its chrome fixed while its work area scrolls`, async ({ page }) => {
      await page.goto(dashboard.path);

      const shell = page.locator('.staff-shell');
      const header = page.locator('.staff-shell__header');
      const footer = page.locator('.staff-shell__footer');
      const scroller = page.locator(dashboard.scroller).first();

      await expect(shell).toBeVisible();
      await expect(page.getByRole('heading', { name: dashboard.heading, exact: true })).toBeVisible();
      await expect(footer.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      const headerBefore = await header.boundingBox();
      const footerBefore = await footer.boundingBox();
      expect(headerBefore).not.toBeNull();
      expect(footerBefore).not.toBeNull();

      await scroller.evaluate((element) => {
        const filler = document.createElement('div');
        filler.style.height = '1600px';
        filler.setAttribute('aria-hidden', 'true');
        element.appendChild(filler);
        element.scrollTop = 500;
      });

      await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)).toBe(0);

      const headerAfter = await header.boundingBox();
      const footerAfter = await footer.boundingBox();
      expect(headerAfter?.y).toBeCloseTo(headerBefore!.y, 0);
      expect(footerAfter?.y).toBeCloseTo(footerBefore!.y, 0);

      const shellBox = await shell.boundingBox();
      expect(shellBox).not.toBeNull();
      expect(shellBox!.y + shellBox!.height).toBeLessThanOrEqual(844 - 64 + 1);
    });
  }

  test('the shell expands into the space freed by desktop navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/operations');

    const shell = page.locator('.staff-shell');
    const scroller = page.locator('.ops-content');
    await expect(shell).toBeVisible();
    await expect(page.locator('.bottom-nav')).toBeHidden();

    await scroller.evaluate((element) => {
      const filler = document.createElement('div');
      filler.style.height = '1600px';
      filler.setAttribute('aria-hidden', 'true');
      element.appendChild(filler);
      element.scrollTop = 500;
    });

    await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)).toBe(0);

    const shellBox = await shell.boundingBox();
    expect(shellBox).not.toBeNull();
    expect(shellBox!.y + shellBox!.height).toBeLessThanOrEqual(901);
  });
});
