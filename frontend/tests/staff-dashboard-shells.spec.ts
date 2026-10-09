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

  for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    for (const dashboard of dashboards) {
      test(`${dashboard.heading} contains scrolling at ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(dashboard.path);
        const shell = page.locator('.staff-shell');
        const outer = page.locator('mat-sidenav-content');
        const header = page.locator('.staff-shell__header');
        const footer = page.locator('.staff-shell__footer');
        const scroller = page.locator(dashboard.scroller).first();
        await expect(shell).toBeVisible();
        await expect(footer.getByRole('button', { name: 'Sign Out' })).toBeVisible();
        await page.waitForTimeout(300);
        const headerBefore = await header.boundingBox();
        const footerBefore = await footer.boundingBox();
        await scroller.evaluate(element => {
          const filler = document.createElement('div');
          filler.style.height = '1600px';
          filler.setAttribute('aria-hidden', 'true');
          element.appendChild(filler);
          element.scrollTop = 500;
        });
        await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
        const overflow = await outer.evaluate(element => element.scrollHeight - element.clientHeight);
        expect(overflow).toBeLessThanOrEqual(0);
        await outer.evaluate(element => { element.scrollTop = 300; });
        expect(await outer.evaluate(element => element.scrollTop)).toBe(0);
        expect((await header.boundingBox())!.y).toBeCloseTo(headerBefore!.y, 0);
        expect((await footer.boundingBox())!.y).toBeCloseTo(footerBefore!.y, 0);
        const shellBox = (await shell.boundingBox())!;
        expect(shellBox.y + shellBox.height).toBeLessThanOrEqual(viewport.height - (viewport.width < 768 ? 64 : 0) + 1);
      });
    }
  }
});
