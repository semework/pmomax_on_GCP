const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const root = process.cwd();
  const promoRoot = path.join(root, 'docs', 'PROMO_RELEASE_1_1');
  const outDir = path.join(promoRoot, 'websites screenshots');
  fs.mkdirSync(outDir, { recursive: true });

  const htmlFiles = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (name.toLowerCase().endsWith('.html')) htmlFiles.push(p);
    }
  }
  walk(promoRoot);
  htmlFiles.sort();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });

  const manifest = [];
  for (const file of htmlFiles) {
    const page = await context.newPage();
    const rel = path.relative(promoRoot, file).replaceAll('\\', '/');
    const url = `file://${file}`;
    const outName = rel.replaceAll('/', '__').replaceAll('.html', '.png');
    const outPath = path.join(outDir, outName);

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(1400);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log('Saved', outName);
      manifest.push(`${rel} -> ${outName}`);
    } catch (e) {
      console.log('FAILED', rel, e.message);
      manifest.push(`${rel} -> FAILED: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  fs.writeFileSync(path.join(outDir, 'manifest.txt'), manifest.join('\n') + '\n', 'utf8');
  await browser.close();
})();
