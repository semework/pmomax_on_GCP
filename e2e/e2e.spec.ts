import { test, expect } from '@playwright/test';

test('E2E smoke: Load Demo, Create, apply example — no runtime errors', async ({ page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173/';
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Load Demo', { timeout: 10000 });
  await page.click('text=Load Demo');
  await page.waitForSelector('text=01 — Project Info', { timeout: 10000 });
  await expect(page.locator('text=01 — Project Info')).toBeVisible();

  // Open Create flow
  await page.click('text=Create');
  await page.waitForSelector('text=Examples — Click to load', { timeout: 8000 });
  const examplesPanel = page.locator('text=Examples — Click to load').first();
  const firstExample = examplesPanel.locator('..').locator('button').first();
  await firstExample.click();

  // After applying an example, project info should appear
  await page.waitForSelector('text=01 — Project Info', { timeout: 10000 });
  await expect(page.locator('text=01 — Project Info')).toBeVisible();

  // Ensure no console or page errors were observed
  expect(errors, 'No runtime errors').toHaveLength(0);
});
