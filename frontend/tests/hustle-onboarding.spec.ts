import { expect, test } from '@playwright/test';

test.describe('Hustle Economy onboarding flow', () => {
  test('hustler can register, log in, and capture income', async ({ page }) => {
    const communities = [{ id: 'comm-1', name: 'KwaNgwenya' }];
    const incomeEntries: any[] = [];
    let summary = {
      todayIncome: 0,
      todayExpenses: 0,
      todayProfit: 0,
      weekIncome: 0,
      weekExpenses: 0,
      weekProfit: 0,
      monthIncome: 0,
      monthExpenses: 0,
      monthProfit: 0
    };

    await page.route('**/api/communities', async (route) => {
      await route.fulfill({ json: communities });
    });

    await page.route('**/api/hustlers', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, json: { id: 'app-1', status: 'PENDING' } });
        return;
      }
      await route.continue();
    });

    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        json: {
          token: 'test-token',
          businessProfileId: 'bp-1',
          businessName: 'Ama Crafts',
          firstName: 'Lindiwe',
          lastName: 'Zulu'
        }
      });
    });

    await page.route('**/api/products/my', async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.route('**/api/income/my**', async (route) => {
      await route.fulfill({ json: incomeEntries });
    });

    await page.route('**/api/income/summary', async (route) => {
      await route.fulfill({ json: summary });
    });

    await page.route('**/api/income', async (route) => {
      const payload = route.request().postDataJSON() as { date: string; amount: number; entryType: string; notes?: string; channel: string };
      const newEntry = {
        id: `entry-${incomeEntries.length + 1}`,
        date: payload.date,
        amount: payload.amount,
        channel: payload.channel,
        entryType: payload.entryType,
        notes: payload.notes ?? '',
        createdAt: new Date().toISOString()
      };
      incomeEntries.unshift(newEntry);
      const amount = Number(payload.amount);
      if (payload.entryType === 'EXPENSE') {
        summary = {
          ...summary,
          todayExpenses: summary.todayExpenses + amount,
          weekExpenses: summary.weekExpenses + amount,
          monthExpenses: summary.monthExpenses + amount,
          todayProfit: summary.todayProfit - amount,
          weekProfit: summary.weekProfit - amount,
          monthProfit: summary.monthProfit - amount
        };
      } else {
        summary = {
          ...summary,
          todayIncome: summary.todayIncome + amount,
          weekIncome: summary.weekIncome + amount,
          monthIncome: summary.monthIncome + amount,
          todayProfit: summary.todayProfit + amount,
          weekProfit: summary.weekProfit + amount,
          monthProfit: summary.monthProfit + amount
        };
      }
      await route.fulfill({ status: 201, json: newEntry });
    });

    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Register your hustle' })).toBeVisible();

    await page.getByLabel('First name *').fill('Lindiwe');
    await page.getByLabel('Last name *').fill('Zulu');
    await page.getByLabel('Email').fill('lindiwe@example.com');
    await page.getByLabel('Phone number *').fill('0821231234');
    await page.getByLabel('ID no. *').fill('9901014800081');
    await page.getByLabel('Community *').selectOption('KwaNgwenya');
    await page.getByLabel('Business name *').fill('Ama Crafts');
    await page.getByLabel('Business type *').selectOption('Service');
    await page.getByLabel('Short description *').fill('Handmade beadwork and craft workshops.');
    await page.getByLabel('Vision').fill('Create local jobs.');
    await page.getByLabel('Mission / support needed').fill('Need tooling support.');
    await page.getByLabel('Target customers *').fill('Tourists');
    await page.getByLabel('Operating area *').fill('KwaNgwenya');
    await page.getByLabel('Password * (min 6 characters)').fill('secret1');
    await page.getByLabel('Confirm password *').fill('secret1');

    await page.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByText('Application submitted! A facilitator will review it soon.')).toBeVisible();

    await page.getByRole('button', { name: 'Login here' }).click();
    await page.getByLabel('Phone number').fill('0821231234');
    await page.getByLabel('Password').fill('secret1');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.waitForURL('**/dashboard');

    await expect(page.getByText('Ama Crafts')).toBeVisible();
    await expect(page.locator('.stat-item .stat-val').first()).toContainText('R 0.00');

    await page.getByLabel('Amount (ZAR) *').fill('250');
    await page.getByLabel('Notes (optional)').fill('Sold necklaces at market.');
    await page.getByRole('button', { name: 'Log income' }).click();

    await expect(page.getByText('Income logged!')).toBeVisible();
    await expect(page.getByRole('cell', { name: /R\s?250\.00/ })).toBeVisible();
    await expect(page.locator('.stat-item .stat-val').first()).toContainText('R 250.00');
  });
});
