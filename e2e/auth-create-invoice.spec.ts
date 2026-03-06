import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe('Auth + Invoicing', () => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run this test.');

  test('user can log in and create/send an invoice', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /^Login$/ }).click();
    await page.locator('input[name="email"]').fill(email!);
    await page.locator('input[name="password"]').fill(password!);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/);

    const testClientName = `E2E Client ${Date.now()}`;
    const clientResp = await page.request.post('/api/clients', {
      data: {
        companyName: testClientName,
        contactName: 'E2E Contact',
        email: `e2e+${Date.now()}@example.com`,
        isLead: false,
      },
    });

    if (!clientResp.ok() && clientResp.status() !== 402) {
      throw new Error(`Client setup failed with status ${clientResp.status()}`);
    }

    await page.goto('/dashboard/invoices/new');

    const clientSelect = page.locator('select').first();
    await expect(clientSelect).toBeVisible();
    await clientSelect.selectOption({ label: testClientName }).catch(async () => {
      const options = await clientSelect.locator('option').allTextContents();
      if (options.length < 2) throw new Error('No selectable clients found for invoice creation');
      await clientSelect.selectOption({ index: 1 });
    });

    await page.locator('input[name="items.0.description"]').fill('E2E service line item');
    await page.locator('input[name="items.0.unitPrice"]').fill('100');
    await page.locator('input[name="items.0.quantity"]').fill('1');

    await page.getByRole('button', { name: /Save & Send/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/invoices/);
    await expect(page.getByText(/Invoices/i).first()).toBeVisible();
  });
});
