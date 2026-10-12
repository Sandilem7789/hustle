import { expect, Page, test } from '@playwright/test';

const products = [
  { id: 'p1', name: 'Vetkoek', description: 'Fresh fat cakes', price: 5, businessId: 'b1', businessName: 'Liskomz Tuck Shop', createdAt: '2026-09-02T08:00:00Z', category: 'FAST_FOOD' },
  { id: 'p2', name: 'Maize Meal 5kg', description: 'Staple', price: 65, businessId: 'b2', businessName: 'Jobe Poultry & Produce', createdAt: '2026-09-03T08:00:00Z', category: 'GROCERY' },
  { id: 'p3', name: 'Beaded Bracelet Set', description: 'Handmade', price: 60, businessId: 'b3', businessName: 'Nibela Crafts', createdAt: '2026-09-01T08:00:00Z', category: 'CRAFTS' },
];

async function mockApi(page: Page) {
  await page.route('**/api/communities', route => route.fulfill({ json: [] }));
  await page.route('**/api/products**', route => {
    const category = new URL(route.request().url()).searchParams.get('category');
    return route.fulfill({ json: category ? products.filter(p => p.category === category) : products });
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

    await page.getByLabel('Search products and businesses').fill('e');
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
