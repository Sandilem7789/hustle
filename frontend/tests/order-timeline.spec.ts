import { expect, Page, test } from '@playwright/test';

const customer = {
  token: 'customer-test-token',
  customerToken: 'customer-test-token',
  userId: 'customer-1',
  firstName: 'Test',
  lastName: 'Buyer',
  phone: '0820000001',
  roles: ['CUSTOMER'],
};

const order = (id: string, fulfillmentType: string, status: string, createdAt: string) => ({
  id, customerId: 'customer-1', customerName: 'Test Buyer', hustlerName: 'Liskomz Tuck Shop', businessProfileId: 'b1',
  transactionType: 'B2C', fulfillmentType, status, totalAmount: 10, createdAt,
  items: [{ id: `${id}-i`, productId: 'p1', productName: 'Vetkoek', unitPrice: 5, quantity: 2 }],
});

const orders = [
  order('aaaa1111-0000', 'DELIVERY', 'DRIVER_ASSIGNED', '2026-10-04T08:00:00Z'),
  order('bbbb2222-0000', 'COLLECTION', 'CONFIRMED', '2026-10-03T08:00:00Z'),
  order('cccc3333-0000', 'DELIVERY', 'DELIVERED', '2026-10-02T08:00:00Z'),
  order('dddd4444-0000', 'DELIVERY', 'CANCELLED', '2026-10-01T08:00:00Z'),
];

async function openOrders(page: Page) {
  await page.addInitScript(user => localStorage.setItem('hustle_unified_auth', JSON.stringify(user)), customer);
  await page.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.route('**/api/orders/my', route => route.fulfill({ json: orders }));
  await page.goto('/orders');
}

const card = (page: Page, id: string) => page.locator('.order-card').filter({ hasText: `#${id}` });
const steps = (page: Page, id: string) => card(page, id).getByRole('list', { name: 'Order progress' }).getByRole('listitem');

test.describe('Order status timeline', () => {
  test('a delivery in progress shows done, current and upcoming steps', async ({ page }) => {
    await openOrders(page);
    const s = steps(page, 'AAAA1111');
    await expect(s.locator('.tl-label')).toHaveText(['Order placed (done)', 'Seller confirmed (done)', 'Driver assigned', 'On the way', 'Delivered']);
    await expect(s.nth(2)).toHaveAttribute('aria-current', 'step');
    await expect(s.nth(2)).toHaveClass(/tl-current/);
    await expect(s.nth(3)).toHaveClass(/tl-todo/);
    await expect(card(page, 'AAAA1111').locator('[aria-current]')).toHaveCount(1);
  });

  test('a collection order has no driver steps', async ({ page }) => {
    await openOrders(page);
    await expect(steps(page, 'BBBB2222').locator('.tl-label')).toHaveText(['Order placed (done)', 'Seller confirmed', 'Collected']);
    await expect(steps(page, 'BBBB2222').nth(1)).toHaveAttribute('aria-current', 'step');
  });

  test('a delivered order is complete', async ({ page }) => {
    await openOrders(page);
    const s = steps(page, 'CCCC3333');
    await expect(s).toHaveCount(5);
    await expect(s.filter({ hasText: '(done)' })).toHaveCount(5);
    await expect(s.nth(4)).toHaveAttribute('aria-current', 'step');
  });

  test('a cancelled order shows its own state instead of the line', async ({ page }) => {
    await openOrders(page);
    const cancelled = card(page, 'DDDD4444');
    await expect(cancelled).toContainText('This order was cancelled.');
    await expect(cancelled.getByRole('list', { name: 'Order progress' })).toHaveCount(0);
  });

  test('readable at 360px with no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await openOrders(page);
    await expect(steps(page, 'AAAA1111')).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  });
});
