import { expect, Page, test } from '@playwright/test';

const communities = [
  { id: 'c-ngwenya', name: 'KwaNgwenya' },
  { id: 'c-nibela', name: 'KwaNibela' },
];

const products = [
  { id: 'p1', name: 'Vetkoek', description: 'Fresh fat cakes', price: 5, businessId: 'b1', businessName: 'Liskomz Tuck Shop', createdAt: '2026-09-01', category: 'FAST_FOOD' },
  { id: 'p2', name: 'Maize Meal 5kg', description: 'Staple', price: 65, businessId: 'b2', businessName: 'Jobe Poultry & Produce', createdAt: '2026-09-01', category: 'GROCERY' },
  { id: 'p3', name: 'Beaded Bracelet Set', description: 'Handmade', price: 60, businessId: 'b3', businessName: 'Nibela Crafts', createdAt: '2026-09-01', category: 'CRAFTS' },
];

async function mockApi(page: Page, opts: { failProducts?: boolean; productCalls?: URL[] } = {}) {
  await page.route('**/api/communities', route => route.fulfill({ json: communities }));
  await page.route('**/api/products**', route => {
    const url = new URL(route.request().url());
    opts.productCalls?.push(url);
    if (opts.failProducts) return route.fulfill({ status: 500, json: { message: 'boom' } });
    const category = url.searchParams.get('category');
    return route.fulfill({ json: category ? products.filter(p => p.category === category) : products });
  });
}

const cards = (page: Page) => page.locator('.p-card:not(.p-skeleton)');

test.describe('Marketplace', () => {
  test('search filters as you type and clearing restores every item', async ({ page }) => {
    await mockApi(page);
    await page.goto('/marketplace');
    await expect(cards(page)).toHaveCount(3);

    await page.getByLabel('Search products and businesses').fill('maize');
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('Maize Meal 5kg');

    await page.getByLabel('Search products and businesses').fill('nothing-like-this');
    await expect(page.getByText('No items match “nothing-like-this”.')).toBeVisible();

    await page.getByRole('button', { name: 'Clear search' }).first().click();
    await expect(cards(page)).toHaveCount(3);
    await expect(page.getByLabel('Search products and businesses')).toBeFocused();
  });

  test('the search query survives a category change', async ({ page }) => {
    await mockApi(page);
    await page.goto('/marketplace');
    await page.getByLabel('Search products and businesses').fill('vet');
    await page.getByRole('radio', { name: 'Fast Food' }).check();

    await expect(page.getByLabel('Search products and businesses')).toHaveValue('vet');
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('Vetkoek');
  });

  test('More categories reveals all, and a selected extra stays visible when collapsed', async ({ page }) => {
    await mockApi(page);
    await page.goto('/marketplace');
    const categoryRadios = page.locator('input[name=category]');
    await expect(categoryRadios).toHaveCount(3);

    const toggle = page.getByRole('button', { name: 'More categories' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(categoryRadios).toHaveCount(9);

    await page.getByRole('radio', { name: 'Crafts & Art' }).check();
    await page.getByRole('button', { name: 'Fewer categories' }).click();
    await expect(categoryRadios).toHaveCount(4);
    await expect(page.getByRole('radio', { name: 'Crafts & Art' })).toBeChecked();
  });

  test('choosing a community sends it to the products API', async ({ page }) => {
    const productCalls: URL[] = [];
    await mockApi(page, { productCalls });
    await page.goto('/marketplace');
    await expect(cards(page)).toHaveCount(3);

    await page.getByRole('radio', { name: 'KwaNibela' }).check();
    await expect.poll(() => productCalls.at(-1)?.searchParams.get('communityId')).toBe('c-nibela');

    await page.getByRole('radio', { name: 'All communities' }).check();
    await expect.poll(() => productCalls.at(-1)?.searchParams.has('communityId')).toBe(false);
  });

  test('a failed load shows an error with retry, not an empty marketplace', async ({ page }) => {
    await mockApi(page, { failProducts: true });
    await page.goto('/marketplace');

    await expect(page.getByRole('alert')).toContainText("We couldn't load items");
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByText('No items listed here yet.')).toHaveCount(0);
  });
});
