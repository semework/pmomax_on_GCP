import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const baseUrl = process.env.PMOMAX_BASE_URL || 'http://localhost:5173';
const baseDir = path.join(process.cwd(), 'pmomax-video-assets');
const dirs = {
  min01: path.join(baseDir, '01min', 'screenshots'),
  min02: path.join(baseDir, '02min', 'screenshots'),
  min03: path.join(baseDir, '03min', 'screenshots'),
};

const ensureCleanDir = (dir) => {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
};

const copyTo = (srcName, destDir) => {
  const src = path.join(dirs.min03, srcName);
  const dst = path.join(destDir, srcName);
  if (fs.existsSync(src)) fs.copyFileSync(src, dst);
};

(async function main() {
  ensureCleanDir(dirs.min01);
  ensureCleanDir(dirs.min02);
  ensureCleanDir(dirs.min03);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();

  console.log('Opening', baseUrl);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('header', { timeout: 20000 });

  const demoTextPath = path.join(process.cwd(), 'data', 'demoText.ts');
  const demoTextRaw = fs.readFileSync(demoTextPath, 'utf8');
  const demoMatch = demoTextRaw.match(/`([\s\S]*)`/);
  const demoText = demoMatch?.[1] ? demoMatch[1].trim() : '';

  const shot = async (name, selector, fullPage = false) => {
    const out = path.join(dirs.min03, name);
    if (selector) {
      const el = await page.waitForSelector(selector, { timeout: 15000 });
      await el.screenshot({ path: out });
    } else {
      await page.screenshot({ path: out, fullPage });
    }
    console.log('Saved', out);
  };

  const clickSelector = async (selector, label) => {
    const el = await page.waitForSelector(selector, { timeout: 15000 });
    await el.click({ force: true });
    console.log('Clicked', label);
    await page.waitForTimeout(700);
  };

  const clickByText = async (text) => clickSelector(`text="${text}"`, text);

  // 1) Header logo only
  await shot('pmomax_logo_app_header.png', 'header img[alt="PMOMax logo"]');

  // 2) Landing / intro
  await shot('intro_landing_full.png', null, true);
  await shot('start_left_panel_clean.png', 'aside');
  await shot('input_panel_empty.png', '#input-panel-textarea');

  // 3) Load Demo for accurate PID + Gantt
  await clickSelector('button[aria-label="Load Demo PID"]', 'Load Demo');
  await page.waitForSelector('text=01 — Project Info', { timeout: 20000 });

  await shot('pid_sections_filled.png', '#main-content');

  // Section-specific captures
  const sectionShot = async (id, name) => {
    await page.evaluate((sectionId) => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
    }, id);
    await page.waitForTimeout(500);
    await shot(name, `#${id}`);
  };

  await sectionShot('scope', 'scope_constraints.png');
  await sectionShot('people', 'people_resources_budget.png');
  await sectionShot('risks', 'risks_issues_communications.png');
  await sectionShot('governance', 'governance_compliance.png');

  // Gantt
  await sectionShot('gantt', 'gantt_section.png');
  await shot('gantt_overview.png', '#gantt-fig');

  // AI Assistant chat
  const assistantInput = 'input[aria-label="Ask the PMOMax AI assistant"]';
  await page.waitForSelector(assistantInput, { timeout: 15000 });
  await page.fill(assistantInput, 'Summarize the top risks for this PID.');
  await clickSelector('button[aria-label="Send message to AI assistant"]', 'Send AI message');
  await page.waitForSelector('.scroll-smooth >> text=AI Assistant', { timeout: 20000 });
  await shot('ai_assistant_chat.png', '.scroll-smooth');

  // Help modal
  await clickSelector('button[aria-label="Open help"]', 'Open Help');
  await page.waitForSelector('[aria-label="Help"]', { timeout: 15000 });
  await shot('help_modal_open.png', '[aria-label="Help"]');
  await clickByText('Close');

  // User guide modal
  await clickSelector('button[aria-label="Open user guide"]', 'Open User Guide');
  await page.waitForSelector('[aria-label="PMOMax User Guide"]', { timeout: 15000 });
  await shot('user_guide_open.png', '[aria-label="PMOMax User Guide"]');
  await clickByText('Close');

  // Parsed data screenshot (paste demo text + Parse)
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
  await shot('parsed_data_full.png', '#main-content');
  await shot('input_panel_parsed.png', '#input-panel-textarea');

  await browser.close();

  // Distribute screenshots to 01min and 02min
  const min01Files = [
    'pmomax_logo_app_header.png',
    'intro_landing_full.png',
    'start_left_panel_clean.png',
    'input_panel_empty.png',
  ];

  const min02Files = [
    'pid_sections_filled.png',
    'gantt_overview.png',
    'ai_assistant_chat.png',
    'parsed_data_full.png',
    'scope_constraints.png',
    'people_resources_budget.png',
    'risks_issues_communications.png',
    'governance_compliance.png',
    'help_modal_open.png',
    'user_guide_open.png',
  ];

  min01Files.forEach((f) => copyTo(f, dirs.min01));
  min02Files.forEach((f) => copyTo(f, dirs.min02));

  console.log('Finished capture and distribution.');
})();
