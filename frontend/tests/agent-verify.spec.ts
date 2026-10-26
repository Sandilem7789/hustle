import { expect, Page, Request, test } from '@playwright/test';

const staffUser = {
  token: 'staff-test-token',
  customerToken: 'customer-test-token',
  userId: 'staff-1',
  firstName: 'Sibusiso',
  lastName: 'Ndlovu',
  phone: '0820000000',
  roles: ['FACILITATOR'],
};

const base = {
  communityId: 'c1', communityName: 'KwaNgwenya', cohortNumber: 8, callStatus: 'NOT_CALLED',
  ageFlag: false, approvedCountInCohort: 0, email: null, districtSection: 'Taxi stop',
};

const applicants = [
  { ...base, id: 'a1', firstName: 'Nomvula', lastName: 'Khumalo', age: 29, phone: '0712344821', typeOfHustle: 'Vetkoek stall',
    pipelineStage: 'CAPTURED', createdAt: '2026-10-20T08:00:00Z', updatedAt: '2026-10-20T08:00:00Z' },
  { ...base, id: 'a2', firstName: 'Lwazi', lastName: 'Dube', age: 16, phone: '0719990001', typeOfHustle: 'Car wash',
    pipelineStage: 'CALLING', createdAt: '2026-10-21T08:00:00Z', updatedAt: '2026-10-21T08:00:00Z' },
  { ...base, id: 'a3', firstName: 'Sipho', lastName: 'Ngcobo', age: 40, phone: '0715553390', typeOfHustle: 'Spaza shop',
    pipelineStage: 'BUSINESS_VERIFICATION', createdAt: '2026-10-01T08:00:00Z', updatedAt: '2026-10-22T08:00:00Z' },
  { ...base, id: 'a4', firstName: 'Zanele', lastName: 'Mthembu', age: 33, phone: '0711111173', typeOfHustle: 'Clothing',
    pipelineStage: 'APPROVED', createdAt: '2026-09-01T08:00:00Z', updatedAt: '2026-10-02T08:00:00Z' },
];

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function mockApi(page: Page): Promise<Request[]> {
  const writes: Request[] = [];
  await page.route('**/api/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    if (method !== 'GET') writes.push(req);

    const one = url.pathname.match(/^\/api\/applicants\/(a\d)$/);
    if (method === 'GET' && url.pathname === '/api/applicants') return route.fulfill({ json: applicants });
    if (method === 'GET' && one) return route.fulfill({ json: applicants.find(a => a.id === one[1]) });
    if (method === 'GET' && url.pathname.endsWith('/verification')) return route.fulfill({ status: 404, json: { message: 'Not found' } });
    if (method === 'POST' && url.pathname === '/api/uploads') return route.fulfill({ json: { url: '/api/uploads/stall.png' } });
    if (method === 'GET' && url.pathname.startsWith('/api/uploads/')) return route.fulfill({ body: PNG, contentType: 'image/png' });
    if (method !== 'GET') return route.fulfill({ json: {} });
    return route.fulfill({ json: [] });
  });
  return writes;
}

test.describe('Community Agent verification', () => {
  test.beforeEach(async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: -27.81, longitude: 32.41, accuracy: 8 });
    await page.addInitScript(user => localStorage.setItem('hustle_unified_auth', JSON.stringify(user)), staffUser);
  });

  test('the queue splits applicants into To visit, With the Hub and Done, and masks phones', async ({ page }) => {
    await mockApi(page);
    await page.goto('/facilitator');

    await expect(page.getByRole('heading', { name: 'Verify', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /To visit 2/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /With the Hub 1/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Done 1/ })).toBeVisible();

    const first = page.locator('.card').first();
    await expect(first).toContainText('Nomvula Khumalo');
    await expect(first).toContainText('Phone ending 4821');
    await expect(page.locator('.list')).not.toContainText('0712344821');

    await page.getByRole('button', { name: /With the Hub/ }).click();
    await expect(page.locator('.card')).toHaveCount(1);
    await expect(page.locator('.card')).toContainText('Waiting for final approval');

    await expect(page.getByRole('link', { name: /Programme tools/ })).toHaveAttribute('href', '/facilitator/programme');
  });

  test('approving needs a meeting, an ID check, a pin and a photo, then sends to the Hub', async ({ page }) => {
    const writes = await mockApi(page);
    await page.goto('/facilitator/visit/a1');

    const send = page.getByRole('button', { name: 'Send to Hub Coordinator' });
    await expect(send).toBeDisabled();

    await page.getByLabel('I am with this person now').check();
    await page.getByLabel('I saw their ID. They are 18 or older.').check();
    await expect(send).toBeDisabled();

    await page.getByRole('button', { name: "Pin where I'm standing" }).click();
    await expect(page.getByText(/Pinned · accurate to 8 m/)).toBeVisible();
    await expect(send).toBeDisabled();

    await page.locator('.photos input[type=file]').setInputFiles({ name: 'stall.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.locator('.photos img')).toHaveCount(1);
    await page.getByLabel('Notes from the interview').fill('Three years at the taxi stop.');
    await expect(send).toBeEnabled();

    await send.click();
    await expect(page).toHaveURL(/\/facilitator$/);
    await expect(page.getByRole('status')).toContainText('Sent to the Hub Coordinator.');

    const interview = writes.find(r => r.url().endsWith('/api/applicants/a1/interview'));
    const verification = writes.find(r => r.url().endsWith('/api/applicants/a1/verification'));
    expect(interview?.postDataJSON()).toMatchObject({ outcome: 'PASS', conductedBy: 'Sibusiso Ndlovu', notes: 'Three years at the taxi stop.' });
    expect(verification?.postDataJSON()).toMatchObject({
      outcome: 'VERIFIED', latitude: -27.81, longitude: 32.41, photoUrls: ['/api/uploads/stall.png'], verifiedBy: 'Sibusiso Ndlovu',
    });
    expect(writes.indexOf(interview!)).toBeLessThan(writes.indexOf(verification!));
  });

  test('an applicant under 18 cannot be approved', async ({ page }) => {
    await mockApi(page);
    await page.goto('/facilitator/visit/a2');

    await expect(page.getByText('cannot approve sellers under 18')).toBeVisible();
    await expect(page.getByRole('radio', { name: /Approve/ })).toBeDisabled();
    await expect(page.getByLabel('I saw their ID. They are 18 or older.')).toBeDisabled();
  });

  test('rejecting needs a reason and closes the application with it', async ({ page }) => {
    const writes = await mockApi(page);
    await page.goto('/facilitator/visit/a1');

    await page.getByRole('radio', { name: /Reject/ }).check();
    const reject = page.getByRole('button', { name: 'Reject application' });
    await expect(reject).toBeDisabled();
    await page.getByRole('textbox', { name: 'Reason' }).fill('No business running yet');
    await reject.click();

    await expect(page).toHaveURL(/\/facilitator$/);
    const stage = writes.find(r => r.url().endsWith('/api/applicants/a1/stage'));
    expect(stage?.postDataJSON()).toEqual({ stage: 'REJECTED', reason: 'No business running yet' });
  });

  test('a verified applicant opens read-only', async ({ page }) => {
    await mockApi(page);
    await page.goto('/facilitator/visit/a3');

    await expect(page.getByRole('status')).toContainText('Waiting for final approval');
    await expect(page.getByLabel('I am with this person now')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Send to Hub Coordinator' })).toHaveCount(0);
  });
});
