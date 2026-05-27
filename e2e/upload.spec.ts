import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

const TEST_DIR = path.resolve(process.cwd(), 'TEST_DATA');

function isTestFile(name: string) {
  return !name.startsWith('.') && !name.toLowerCase().endsWith('.ds_store');
}

test.describe('Upload all TEST_DATA files', () => {
  test.setTimeout(900_000);

  test('uploads and parses every file', async ({ page }, testInfo) => {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL
      || (testInfo.project.use as { baseURL?: string } | undefined)?.baseURL
      || 'http://localhost:5173';
    const files = (await fs.readdir(TEST_DIR)).filter(isTestFile).sort();
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const filePath = path.join(TEST_DIR, file);
      const stat = await fs.stat(filePath);
      if (stat.size < 10) {
        console.log(`[upload.spec] Skipping ${file}: file is empty (${stat.size} bytes)`);
        continue;
      }
      const startedAt = Date.now();
      console.log(`[upload.spec] Parsing ${file} (${Math.round(stat.size / 1024)} KB)`);
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toHaveCount(1);

      await fileInput.setInputFiles(filePath);

      const projectInfoHeading = page.getByRole('heading', { name: /01 — Project Info/i });
      const errorBanner = page.locator('p.mt-1.text-xs.text-rose-400');
      const requiredHeadings = [
        /01 — Project Info/i,
        /02 — Overview & Rationale/i,
        /03 — Objectives & KPIs/i,
        /04 — Scope & Deliverables/i,
        /05 — Assumptions, Constraints, Dependencies/i,
        /06 — Schedule & Gantt/i,
        /07 — People, Resources & Budget/i,
        /08 — Risks, Issues & Communications/i,
        /09 — Governance, Compliance, Open Questions/i,
      ];

      const outcome = await Promise.race([
        projectInfoHeading.waitFor({ timeout: 180_000 }).then(() => 'ok' as const),
        errorBanner.waitFor({ timeout: 180_000 }).then(() => 'error' as const),
      ]);

      if (outcome === 'error') {
        const msg = (await errorBanner.first().textContent())?.trim() || 'Unknown error';
        throw new Error(`Parse failed for ${file}: ${msg}`);
      }

      await expect(projectInfoHeading).toBeVisible();
      await expect(errorBanner).toHaveCount(0);
      for (const heading of requiredHeadings) {
        await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      }
      const durationSec = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`[upload.spec] Parsed ${file} in ${durationSec}s`);
    }
  });
});
