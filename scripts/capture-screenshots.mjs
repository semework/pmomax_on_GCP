import fs from 'fs';
import path from 'path';
import { chromium, webkit } from 'playwright';

const OUTDIR = path.resolve(process.cwd(), 'screenshots');
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

const viewports = [
  { name: 'iphone_390x844', width: 390, height: 844 },
  { name: 'ipad_768x1024', width: 768, height: 1024 },
  { name: 'ipadpro_1024x1366', width: 1024, height: 1366 }
];

const browsers = [
  { key: 'webkit', instance: webkit }, // Safari
  { key: 'chromium', instance: chromium } // Chrome/Brave
];

const url = process.env.SCREENSHOT_URL || 'http://localhost:5173';

(async () => {
  for (const b of browsers) {
    const browserOut = path.join(OUTDIR, b.key);
    if (!fs.existsSync(browserOut)) fs.mkdirSync(browserOut, { recursive: true });

    const browser = await b.instance.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    for (const vp of viewports) {
      const page = await context.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      try {
        console.log(`Navigating ${b.key} @ ${vp.width}x${vp.height}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        // small wait for animations / fonts
        await page.waitForTimeout(800);

        const file = path.join(browserOut, `${vp.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log('Saved', file);
      } catch (e) {
        console.error('Error capturing', b.key, vp, e.message);
      } finally {
        await page.close();
      }
    }

    await context.close();
    await browser.close();
  }

  console.log('Screenshots complete.');
})();
