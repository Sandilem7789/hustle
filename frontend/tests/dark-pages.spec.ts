import { expect, Page, test } from '@playwright/test';

type Rgba = [number, number, number, number];

function parse(color: string): Rgba {
  const [r, g, b, a = 1] = color.match(/[\d.]+/g)!.map(Number);
  return [r, g, b, a];
}

// Translucent badge fills are blended over the surface beneath them before measuring
function over(top: Rgba, base: Rgba): Rgba {
  const a = top[3];
  return [0, 1, 2].map(i => top[i] * a + base[i] * (1 - a)).concat(1) as Rgba;
}

function luminance([r, g, b]: Rgba): number {
  const [lr, lg, lb] = [r, g, b].map(v => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return lr * 0.2126 + lg * 0.7152 + lb * 0.0722;
}

function contrast(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// The nearest opaque background behind an element
async function colours(page: Page, selector: string) {
  return page.locator(selector).first().evaluate(el => {
    const text = getComputedStyle(el).color;
    const layers: string[] = [];
    for (let node: Element | null = el; node; node = node.parentElement) {
      const bg = getComputedStyle(node).backgroundColor;
      if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') layers.push(bg);
      if (bg.startsWith('rgb(')) break;
    }
    return { text, layers };
  });
}

async function readable(page: Page, selector: string): Promise<number> {
  const { text, layers } = await colours(page, selector);
  const background = layers.map(parse).reduceRight((base, top) => over(top, base), [255, 255, 255, 1] as Rgba);
  return contrast(parse(text), background);
}

const products = [
  { id: 'p1', name: 'Vetkoek', description: 'Fresh fat cakes', price: 5, businessId: 'b1', businessName: 'Liskomz Tuck Shop', createdAt: '2026-09-01', category: 'FAST_FOOD' },
];

async function useDark(page: Page, lang: 'en' | 'zu' = 'en') {
  await page.addInitScript(l => {
    localStorage.setItem('thenga_theme', 'dark');
    localStorage.setItem('thenga_lang', l);
  }, lang);
}

test.describe('Business page in dark mode', () => {
  test('the shop name, products and labels are readable', async ({ page }) => {
    await useDark(page);
    await page.route('**/api/**', route => route.fulfill({ json: [] }));
    await page.route('**/api/products**', route => route.fulfill({ json: products }));
    await page.goto('/business/b1');

    await expect(page.getByRole('heading', { level: 1, name: 'Liskomz Tuck Shop' })).toBeVisible();
    for (const selector of ['.biz-name', '.product-name', '.cat-tag', '.price', '.back-btn', '.login-buy-btn']) {
      expect(await readable(page, selector), selector).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('labels follow isiZulu', async ({ page }) => {
    await useDark(page, 'zu');
    await page.route('**/api/**', route => route.fulfill({ json: [] }));
    await page.route('**/api/products**', route => route.fulfill({ json: products }));
    await page.goto('/business/b1');

    await expect(page.getByRole('button', { name: 'Buyela Emakethe' })).toBeVisible();
    await expect(page.locator('.cat-tag')).toHaveText('Ukudla Okusheshayo');
    await expect(page.getByRole('button', { name: 'Ngena Ukuze Uthenge' })).toBeVisible();
  });
});

const customer = {
  token: 'customer-test-token', customerToken: 'customer-test-token', userId: 'customer-1',
  firstName: 'Test', lastName: 'Buyer', phone: '0820000001', roles: ['CUSTOMER'],
};

const statuses = ['PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'EN_ROUTE', 'DELIVERED', 'COLLECTED', 'CANCELLED'];
const orders = statuses.map((status, i) => ({
  id: `${String(i).repeat(8)}-0000`, customerId: 'customer-1', customerName: 'Test Buyer', hustlerName: 'Liskomz Tuck Shop',
  businessProfileId: 'b1', transactionType: 'B2C', fulfillmentType: status === 'COLLECTED' ? 'COLLECTION' : 'DELIVERY',
  status, totalAmount: 10, createdAt: `2026-10-0${i + 1}T08:00:00Z`,
  items: [{ id: `i${i}`, productId: 'p1', productName: 'Vetkoek', unitPrice: 5, quantity: 2 }],
}));

async function openOrders(page: Page, lang: 'en' | 'zu' = 'en') {
  await useDark(page, lang);
  await page.addInitScript(user => localStorage.setItem('hustle_unified_auth', JSON.stringify(user)), customer);
  await page.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.route('**/api/orders/my', route => route.fulfill({ json: orders }));
  await page.goto('/orders');
  // Orders still on the go show first; finished ones sit under the Done tab
  await expect(page.locator('.order-card')).toHaveCount(4);
}

test.describe('My Orders in dark mode', () => {
  test('every status badge is readable', async ({ page }) => {
    await openOrders(page);
    for (const [i, status] of statuses.entries()) {
      if (i === 4) await page.getByRole('button', { name: 'Done' }).click();
      const cls = '.status-' + status.toLowerCase().replace(/_/g, '-');
      expect(await readable(page, cls), status).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('labels follow isiZulu', async ({ page }) => {
    await openOrders(page, 'zu');
    await expect(page.getByRole('heading', { level: 1, name: 'Ama-oda Ami' })).toBeVisible();
    await expect(page.locator('.status-en-route')).toHaveText('Isendleleni');
    await expect(page.locator('.meta-chip').first()).toContainText('Ukulethwa');
    await expect(page.locator('.total-label').first()).toHaveText('Isamba');
    await page.getByRole('button', { name: 'Kuqediwe' }).click();
    await expect(page.locator('.status-cancelled')).toHaveText('Ikhanseliwe');
  });
});
