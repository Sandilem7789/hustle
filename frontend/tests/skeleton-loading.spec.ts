import { expect, test } from '@playwright/test';

test('business page shows shaped placeholders only while products are pending', async ({ page }) => {
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>(resolve => { releaseResponse = resolve; });
  await page.route('**/api/products**', async route => {
    await responseGate;
    await route.fulfill({ json: [{
      id: 'product-1', name: 'Handmade basket', description: 'Woven locally', price: 80,
      businessId: 'business-1', businessName: 'Village Crafts', createdAt: '2026-10-09'
    }] });
  });

  await page.goto('/business/business-1');
  await expect(page.locator('app-loading-skeleton .skeleton-card')).toHaveCount(3);
  await expect(page.getByRole('status')).toHaveText('Loading');
  await expect(page.locator('.product-card')).toHaveCount(0);

  releaseResponse();
  await expect(page.locator('app-loading-skeleton .skeleton-card')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.locator('.product-card')).toContainText(['Handmade basket']);
});
