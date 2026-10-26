import { expect, test, type Page } from '@playwright/test';

const seller = {
  token: 'seller-token', customerToken: 'c-token', userId: 'u1', firstName: 'Thandi', lastName: 'M',
  phone: '0820000000', roles: ['CUSTOMER', 'HUSTLER'], businessProfileId: 'b1', businessName: 'Liskomz Tuck Shop',
};
const hustler = { token: 'seller-token', businessProfileId: 'b1', businessName: 'Liskomz Tuck Shop', firstName: 'Thandi', lastName: 'M' };
const products = [
  { id: 'p1', name: 'Bunny Chow', description: '', price: 35, businessId: 'b1', businessName: 'Liskomz Tuck Shop', createdAt: '2026-10-01', category: 'FAST_FOOD' },
  { id: 'p2', name: 'Amagwinya', description: '', price: 5, businessId: 'b1', businessName: 'Liskomz Tuck Shop', createdAt: '2026-10-02', category: 'FAST_FOOD' },
  { id: 'p3', name: 'Cold drink', description: '', price: 15, businessId: 'b1', businessName: 'Liskomz Tuck Shop', createdAt: '2026-10-03', category: 'GROCERY' },
];

async function openSell(page: Page, sales: unknown[]) {
  await page.addInitScript(([u, h]) => {
    localStorage.setItem('hustle_unified_auth', JSON.stringify(u));
    localStorage.setItem('hustle_auth', JSON.stringify(h));
  }, [seller, hustler] as const);
  await page.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.route('**/api/products/my', route => route.fulfill({ json: products }));
  await page.route('**/api/income/summary', route => route.fulfill({ json: {} }));
  await page.route('**/api/sales', route => {
    if (route.request().method() !== 'POST') return route.fulfill({ json: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 } });
    const body = route.request().postDataJSON();
    sales.push(body);
    return route.fulfill({ json: { id: body.id, totalAmount: body.totalAmount, saleDate: '2026-10-26', createdAt: '2026-10-26T11:42:00Z', items: [] } });
  });
  await page.goto('/dashboard?tab=sell');
}

test.describe('Make a sale', () => {
  test('on a phone: tap products, charge, give change and save the sale', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const sales: any[] = [];
    await openSell(page, sales);

    await page.getByRole('button', { name: /Bunny Chow/ }).click();
    await page.getByRole('button', { name: /Bunny Chow/ }).click();
    await page.getByRole('button', { name: /Amagwinya/ }).click();
    await expect(page.locator('.tile.in')).toHaveCount(2);
    await expect(page.locator('.charge-bar')).toContainText('3 items');
    await expect(page.locator('.charge-bar')).toContainText('R 75');

    await page.getByRole('button', { name: /Charge/ }).click();
    await expect(page.getByRole('heading', { name: 'Take payment' })).toBeVisible();
    await page.getByRole('button', { name: 'R 100' }).click();
    await expect(page.locator('.change-row')).toContainText('Give change');
    await expect(page.locator('.change-row')).toContainText('R 25');

    await page.getByRole('button', { name: /Complete sale · R 75/ }).click();
    await expect(page.getByRole('heading', { name: 'Sale saved' })).toBeVisible();
    await expect(page.locator('.receipt-meta')).toContainText('R 100 received · R 25 change');
    expect(sales).toHaveLength(1);
    expect(sales[0].totalAmount).toBe(75);
    expect(sales[0].items).toEqual([
      { productId: 'p1', itemName: 'Bunny Chow', unitPrice: 35, quantity: 2 },
      { productId: 'p2', itemName: 'Amagwinya', unitPrice: 5, quantity: 1 },
    ]);

    await page.getByRole('button', { name: 'New sale' }).click();
    await expect(page.getByRole('heading', { name: 'Make a sale' })).toBeVisible();
    await expect(page.locator('.tile.in')).toHaveCount(0);
  });

  test('cash short of the total cannot complete the sale', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await openSell(page, []);
    await page.getByRole('button', { name: /Bunny Chow/ }).click();
    await page.getByPlaceholder('Other').fill('20');
    await expect(page.locator('.change-row')).toContainText('Still owed');
    await expect(page.getByRole('button', { name: /Complete sale/ })).toBeDisabled();
  });

  test('the section nav marks Make a sale as the current page on a big screen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await openSell(page, []);
    await expect(page.locator('.app-toolbar')).toBeHidden();
    await expect(page.locator('.side-rail [aria-current="page"]')).toHaveText('Make a sale');
  });
});
