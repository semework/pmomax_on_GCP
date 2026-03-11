import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

const TEST_DIR = path.resolve(process.cwd(), 'TEST_DATA');

function isTestFile(name: string) {
  return !name.startsWith('.') && !name.endsWith('.ds_store');
}

test.describe('Upload all TEST_DATA files', () => {
  test.setTimeout(180_000);

  test('uploads and parses every file', async ({ page }, testInfo) => {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL
      || (testInfo.project.use as { baseURL?: string } | undefined)?.baseURL
      || 'http://localhost:5173';
    const files = (await fs.readdir(TEST_DIR)).filter(isTestFile).sort();
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const filePath = path.join(TEST_DIR, file);
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toHaveCount(1);

      await fileInput.setInputFiles(filePath);

      // Wait for parsing to complete and PID to render
      await page.waitForSelector('text=01 — Project Info', { timeout: 120_000 });
      await expect(page.locator('text=01 — Project Info')).toBeVisible();

      // Ensure no visible error banner in sidebar
      await expect(page.locator('p.mt-1.text-xs.text-rose-400')).toHaveCount(0);
    }
  });
});
