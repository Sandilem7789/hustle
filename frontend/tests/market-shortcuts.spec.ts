import { expect, Page, test } from '@playwright/test';

const products = [
  { id: 'p1', name: 'Vetkoek', description: 'Fresh fat cakes', price: 5, businessId: 'b1', businessName: 'Liskomz Tuck Shop', createdAt: '2026-09-02T08:00:00Z', category: 'FAST_FOOD' },
  { id: 'p2', name: 'Maize Meal 5kg', description: 'Staple', price: 65, businessId: 'b2', businessName: 'Jobe Poultry & Produce', createdAt: '2026-09-03T08:00:00Z', category: 'GROCERY' },
  { id: 'p3', name: 'Beaded Bracelet Set', description: 'Handmade', price: 60, businessId: 'b3', businessName: 'Nibela Crafts', createdAt: '2026-09-01T08:00:00Z', category: 'CRAFTS' },
];

async function mockApi(page: Page) {
  await page.route('**/api/communities', route => route.fulfill({ json: [] }));
  await page.route('**/api/products**', route => {
    const url = new URL(route.request().url());
    const id = url.pathname.match(/\/api\/products\/([^/]+)$/)?.[1];
    if (id) {
      const product = products.find(p => p.id === id);
      return product ? route.fulfill({ json: product }) : route.fulfill({ status: 404, json: { message: 'Product not found' } });
    }
    const category = url.searchParams.get('category');
    const businessId = url.searchParams.get('businessId');
    return route.fulfill({ json: products.filter(p => (!category || p.category === category) && (!businessId || p.businessId === businessId)) });
  });
}

const cards = (page: Page) => page.locator('.grid .p-card:not(.p-skeleton)');
const names = (page: Page) => cards(page).locator('.p-name');

test.describe('Marketplace sort', () => {
  test('sorts newest first by default, then by price both ways', async ({ page }) => {
    await mockApi(page);
    await page.goto('/marketplace');
    await expect(names(page)).toHaveText(['Maize Meal 5kg', 'Vetkoek', 'Beaded Bracelet Set']);

    const sort = page.getByLabel('Sort');
    await expect(sort).toHaveValue('newest');

    await sort.selectOption({ label: 'Price: low to high' });
    await expect(names(page)).toHaveText(['Vetkoek', 'Beaded Bracelet Set', 'Maize Meal 5kg']);

    await sort.selectOption({ label: 'Price: high to low' });
    await expect(names(page)).toHaveText(['Maize Meal 5kg', 'Beaded Bracelet Set', 'Vetkoek']);

    await sort.selectOption({ label: 'Newest' });
    await expect(names(page)).toHaveText(['Maize Meal 5kg', 'Vetkoek', 'Beaded Bracelet Set']);
  });

  test('the sort choice survives search and category changes', async ({ page }) => {
    await mockApi(page);
    await page.goto('/marketplace');
    await page.getByLabel('Sort').selectOption('priceAsc');

    await page.getByLabel('Search products and shops').fill('e');
    await expect(names(page)).toHaveText(['Vetkoek', 'Beaded Bracelet Set', 'Maize Meal 5kg']);
    await page.getByRole('button', { name: 'Clear search' }).first().click();

    await page.getByRole('radio', { name: 'Grocery' }).check();
    await expect(names(page)).toHaveText(['Maize Meal 5kg']);
    await page.getByRole('radio', { name: 'All', exact: true }).check();
    await expect(page.getByLabel('Sort')).toHaveValue('priceAsc');
    await expect(names(page)).toHaveText(['Vetkoek', 'Beaded Bracelet Set', 'Maize Meal 5kg']);
  });

  test('the sort control shares the result-count row at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await mockApi(page);
    await page.goto('/marketplace');
    const count = await page.locator('.result-count').boundingBox();
    const sort = await page.getByLabel('Sort').boundingBox();
    expect(count && sort).toBeTruthy();
    expect(Math.abs((count!.y + count!.height / 2) - (sort!.y + sort!.height / 2))).toBeLessThan(16);
    expect(sort!.height).toBeGreaterThanOrEqual(48);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  });
});

const customer = {
  token: 'customer-test-token',
  customerToken: 'customer-test-token',
  userId: 'customer-1',
  firstName: 'Test',
  lastName: 'Buyer',
  phone: '0820000001',
  roles: ['CUSTOMER'],
};

async function logIn(page: Page) {
  await page.addInitScript(user => localStorage.setItem('hustle_unified_auth', JSON.stringify(user)), customer);
}

test.describe('Marketplace quick add', () => {
  test('Add turns into a stepper, updates the cart badge, and returns at zero', async ({ page }) => {
    await logIn(page);
    await mockApi(page);
    await page.goto('/marketplace');

    const badge = page.locator('.toolbar-cart-badge');
    await expect(badge).toHaveCount(0);

    await page.getByRole('button', { name: 'Add Vetkoek to cart' }).click();
    const stepper = page.getByRole('group', { name: 'Vetkoek quantity in cart' });
    await expect(stepper).toContainText('1');
    await expect(badge).toHaveText('1');
    await expect(page.getByRole('button', { name: 'Add one more Vetkoek' })).toBeFocused();

    await page.getByRole('button', { name: 'Add one more Vetkoek' }).click();
    await expect(stepper).toContainText('2');
    await expect(badge).toHaveText('2');

    await page.getByRole('button', { name: 'Remove one Vetkoek' }).click();
    await expect(badge).toHaveText('1');
    await page.getByRole('button', { name: 'Remove one Vetkoek' }).click();
    await expect(stepper).toHaveCount(0);
    await expect(badge).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add Vetkoek to cart' })).toBeFocused();
    await expect(page).toHaveURL(/\/marketplace$/);
  });

  test('touch targets are at least 48px at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await logIn(page);
    await mockApi(page);
    await page.goto('/marketplace');
    const add = await page.getByRole('button', { name: 'Add Vetkoek to cart' }).boundingBox();
    expect(add!.height).toBeGreaterThanOrEqual(48);
    await page.getByRole('button', { name: 'Add Vetkoek to cart' }).click();
    for (const name of ['Remove one Vetkoek', 'Add one more Vetkoek']) {
      const box = await page.getByRole('button', { name }).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(48);
      expect(box!.height).toBeGreaterThanOrEqual(48);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  });

  test('logged out, Add sends the buyer to login', async ({ page }) => {
    await mockApi(page);
    await page.goto('/marketplace');
    await page.getByRole('button', { name: 'Add Vetkoek to cart' }).click();
    await expect(page).toHaveURL(/\/login\?return=%2Fmarketplace$/);
  });
});

test.describe('Marketplace recently viewed', () => {
  const recent = (page: Page) => page.getByRole('region', { name: 'Recently viewed' });
  const recentNames = (page: Page) => recent(page).locator('.recent-name');

  async function view(page: Page, name: string) {
    await cards(page).getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/marketplace$/);
  }

  test('appears after viewing, survives reload, de-duplicates and hides while searching', async ({ page }) => {
    await mockApi(page);
    await page.goto('/marketplace');
    await expect(cards(page)).toHaveCount(3);
    await expect(recent(page)).toHaveCount(0);

    await view(page, 'Vetkoek');
    await expect(recentNames(page)).toHaveText(['Vetkoek']);

    await view(page, 'Maize Meal 5kg');
    await view(page, 'Vetkoek');
    await expect(recentNames(page)).toHaveText(['Vetkoek', 'Maize Meal 5kg']);

    await page.reload();
    await expect(recentNames(page)).toHaveText(['Vetkoek', 'Maize Meal 5kg']);
    await expect(recent(page)).toContainText('R 5');

    await page.getByLabel('Search products and shops').fill('maize');
    await expect(recent(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Clear search' }).first().click();
    await expect(recentNames(page)).toHaveText(['Vetkoek', 'Maize Meal 5kg']);

    await recent(page).getByRole('link', { name: /Maize Meal 5kg/ }).click();
    await expect(page).toHaveURL(/\/product\/p2$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Maize Meal 5kg' })).toBeVisible();
  });

  test('keeps a saved item that is no longer listed, without inventing availability', async ({ page }) => {
    const gone = { id: 'gone-1', name: 'Old Paraffin Candle', description: '', price: 12, businessId: 'b9', businessName: 'Closed Shop', createdAt: '2026-08-01T08:00:00Z' };
    await page.addInitScript(item => localStorage.setItem('thenga_recent', JSON.stringify([item])), gone);
    await mockApi(page);
    await page.goto('/marketplace');
    await expect(cards(page)).toHaveCount(3);
    await expect(recentNames(page)).toHaveText(['Old Paraffin Candle']);
    await expect(recent(page)).not.toContainText(/stock|available|unavailable/i);

    await recent(page).getByRole('link', { name: /Old Paraffin Candle/ }).click();
    await expect(page).toHaveURL(/\/product\/gone-1$/);
    await expect(page.getByRole('heading', { name: /couldn't find this item/ })).toBeVisible();
  });

  test('holds at most ten items', async ({ page }) => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...products[0], id: `x${i}`, name: `Item ${i}` }));
    await page.addInitScript(items => localStorage.setItem('thenga_recent', JSON.stringify(items)), many);
    await mockApi(page);
    await page.goto('/marketplace');
    await expect(recent(page).locator('.recent-item')).toHaveCount(10);
  });

  test('ignores unreadable storage', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('thenga_recent', '{not json'));
    await mockApi(page);
    await page.goto('/marketplace');
    await expect(cards(page)).toHaveCount(3);
    await expect(recent(page)).toHaveCount(0);
  });
});
