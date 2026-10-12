import { expect, Page, test } from '@playwright/test';

const products = [
  { id: 'p1', name: 'Vetkoek & Mince', description: 'Fresh fat cakes', price: 5, businessId: 'b1', businessName: 'Liskomz Tuck Shop', createdAt: '2026-09-01', category: 'FAST_FOOD' },
  { id: 'p2', name: 'Maize Meal 5kg', description: 'Staple', price: 65, businessId: 'b2', businessName: 'Jobe Poultry & Produce', createdAt: '2026-09-01', category: 'GROCERY' },
  { id: 'p3', name: 'Amagwinya Box', description: 'Six pieces', price: 25, businessId: 'b1', businessName: 'Liskomz Tuck Shop', createdAt: '2026-09-01', category: 'FAST_FOOD' },
];

const customer = {
  token: 'test-token',
  customerToken: 'customer-token',
  userId: 'u1',
  firstName: 'Test',
  lastName: 'Buyer',
  phone: '0820000000',
  roles: ['CUSTOMER'],
};

async function mockApi(page: Page) {
  await page.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.route('**/api/products**', route => {
    const url = new URL(route.request().url());
    const detail = url.pathname.match(/\/api\/products\/([^/]+)$/);
    if (detail) {
      const product = products.find(p => p.id === detail[1]);
      return product
        ? route.fulfill({ json: product })
        : route.fulfill({ status: 404, json: { message: 'Product not found' } });
    }
    const businessId = url.searchParams.get('businessId');
    return route.fulfill({ json: businessId ? products.filter(p => p.businessId === businessId) : products });
  });
}

test.describe('Product page', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockApi(page);
  });

  test('tapping a marketplace card opens the product page', async ({ page }) => {
    await page.goto('/marketplace');
    await page.getByRole('link', { name: 'Maize Meal 5kg' }).click();

    await expect(page).toHaveURL(/\/product\/p2$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Maize Meal 5kg' })).toBeVisible();
    await expect(page.getByText('R 65.00')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Jobe Poultry & Produce' })).toHaveAttribute('href', '/business/b2');

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/marketplace$/);
  });

  test('a deep link shows the product, its category and description', async ({ page }) => {
    await page.goto('/product/p1');

    await expect(page.getByRole('heading', { level: 1, name: 'Vetkoek & Mince' })).toBeVisible();
    await expect(page.getByText('Fast Food')).toBeVisible();
    await expect(page.getByText('Fresh fat cakes')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login to buy' })).toBeVisible();

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/marketplace$/);
  });

  test('an unknown product shows a not-found state', async ({ page }) => {
    await page.goto('/product/missing');

    await expect(page.getByRole('heading', { name: "We couldn't find this item. It may have been removed." })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse the marketplace' })).toHaveAttribute('href', '/marketplace');
  });

  test('a failed load offers a retry', async ({ page }) => {
    let fail = true;
    await page.route('**/api/products/p1', route => fail
      ? route.fulfill({ status: 500, json: { message: 'boom' } })
      : route.fulfill({ json: products[0] }));
    await page.goto('/product/p1');

    await expect(page.getByRole('alert')).toContainText("We couldn't load this item");
    fail = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Vetkoek & Mince' })).toBeVisible();
  });

  test('logged out, Login to buy returns to the product after login', async ({ page }) => {
    await page.goto('/product/p1');
    await page.getByRole('button', { name: 'Login to buy' }).click();
    await expect(page).toHaveURL(/\/login\?return=%2Fproduct%2Fp1$/);
  });

  test('Add to Cart updates the cart badge', async ({ page }) => {
    await page.addInitScript(user => localStorage.setItem('hustle_unified_auth', JSON.stringify(user)), customer);
    await page.goto('/product/p1');
    await expect(page.locator('.toolbar-cart-badge')).toHaveCount(0);

    await page.getByRole('button', { name: 'Add to Cart' }).click();

    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.locator('.toolbar-cart-badge')).toHaveText('1');
  });
});
