import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async function main(){
  const screenshotsDir = path.join(process.cwd(), 'pmomax-video-assets/03min/screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();

  const url = process.env.PMOMAX_BASE_URL || 'http://localhost:5173';
  console.log('Opening', url);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('header', { timeout: 15000 });

  const demoTextPath = path.join(process.cwd(), 'data', 'demoText.ts');
  const demoTextRaw = fs.readFileSync(demoTextPath, 'utf8');
  const demoMatch = demoTextRaw.match(/`([\s\S]*)`/);
  const demoText = demoMatch?.[1] ? demoMatch[1].trim() : '';

  async function tryScreenshot(name: string, opts: { selector?: string, fullPage?: boolean } = {}){
    const out = path.join(screenshotsDir, name);
    if(opts.selector){
      const el = await page.waitForSelector(opts.selector, { timeout: 10000 });
      await el.screenshot({ path: out });
    } else {
      await page.screenshot({ path: out, fullPage: !!opts.fullPage });
    }
    console.log('Saved', out);
  }

  async function clickSelector(selector: string, label: string){
    const el = await page.waitForSelector(selector, { timeout: 10000 });
    await el.click({ force: true });
    console.log('Clicked', label);
    await page.waitForTimeout(600);
  }

  async function clickByText(text: string){
    await clickSelector(`text="${text}"`, text);
  }

  // 1. Branding & Identity: header logo only
  await tryScreenshot('pmomax_logo_app_header.png', { selector: 'header img[alt="PMOMax logo"]' });

  // 2. Landing overview (before demo load)
  await tryScreenshot('intro_landing_full.png', { fullPage: true });

  // 3. Load Demo data for accurate PID + Gantt
  await clickSelector('button[aria-label="Load Demo PID"]', 'Load Demo');
  await page.waitForSelector('text=01 — Project Info', { timeout: 15000 });

  // 4. Structured PID Core (demo)
  await tryScreenshot('pid_sections_filled.png', { selector: '#main-content' });

  // 5. Gantt (demo)
  const gantt = await page.waitForSelector('#gantt-fig', { timeout: 15000 });
  await gantt.scrollIntoViewIfNeeded();
  await tryScreenshot('gantt_overview.png', { selector: '#gantt-fig' });

  // 6. AI Assistant (run chat)
  const assistantInput = 'input[aria-label="Ask the PMOMax AI assistant"]';
  await page.waitForSelector(assistantInput, { timeout: 10000 });
  await page.fill(assistantInput, 'Summarize the top risks for this PID.');
  await clickSelector('button[aria-label="Send message to AI assistant"]', 'Send AI message');
  await page.waitForSelector('.scroll-smooth >> text=AI Assistant', { timeout: 15000 });
  await tryScreenshot('ai_assistant_chat.png', { selector: '.scroll-smooth' });

  // 7. Parsed data screenshot (paste demo text + Parse)
  await clickByText('Reset');
  await page.waitForTimeout(800);
  await page.fill('#input-panel-textarea', demoText);
  await clickByText('Parse');
  try {
    await page.waitForSelector('text=AI is architecting…', { timeout: 8000 });
    await page.waitForSelector('text=AI is architecting…', { state: 'hidden', timeout: 60000 });
  } catch {
    // ignore if overlay does not appear
  }
  await page.waitForSelector('text=01 — Project Info', { timeout: 60000 });
  await tryScreenshot('parsed_data_full.png', { selector: '#main-content' });

  // 8. Input panel (parsed)
  await tryScreenshot('input_panel_parsed.png', { selector: '#input-panel-textarea' });

  await browser.close();
  console.log('Finished capture (precise).');
})().catch(e=>{ console.error(e); process.exit(1); });
