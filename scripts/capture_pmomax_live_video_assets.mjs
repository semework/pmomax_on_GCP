import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const BASE_URL = process.env.PMOMAX_BASE_URL || 'https://pmo-architect-839982691485.us-east1.run.app/';
const OUTDIR = path.resolve(process.cwd(), 'REPORTS', 'pmomax_video_3min_2026-04-24', 'screenshots');

fs.mkdirSync(OUTDIR, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function dismissOverlays(page) {
  const closeTexts = ['Close', 'Got it'];
  for (const text of closeTexts) {
    const locator = page.getByRole('button', { name: new RegExp(`^${text}$`, 'i') }).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click({ force: true }).catch(() => {});
      await wait(400);
    }
  }
}

async function shot(page, name, locator = null, opts = {}) {
  const file = path.join(OUTDIR, name);
  if (locator) {
    await locator.scrollIntoViewIfNeeded();
    await wait(300);
    await locator.screenshot({ path: file, ...opts });
  } else {
    await page.screenshot({ path: file, ...opts });
  }
  console.log('Saved', file);
}

async function unionShot(page, name, locatorA, locatorB, padding = 24) {
  const file = path.join(OUTDIR, name);
  await locatorA.scrollIntoViewIfNeeded();
  await wait(250);
  const a = await locatorA.boundingBox();
  const b = await locatorB.boundingBox();
  if (!a || !b) throw new Error(`Could not compute bounding boxes for ${name}`);
  const x = Math.max(0, Math.min(a.x, b.x) - padding);
  const y = Math.max(0, Math.min(a.y, b.y) - padding);
  const right = Math.max(a.x + a.width, b.x + b.width) + padding;
  const bottom = Math.max(a.y + a.height, b.y + b.height) + padding;
  await page.screenshot({
    path: file,
    clip: {
      x,
      y,
      width: right - x,
      height: bottom - y,
    },
  });
  console.log('Saved', file);
}

async function clickButtonIfVisible(page, pattern) {
  const button = page.getByRole('button', { name: pattern }).first();
  if (await button.isVisible().catch(() => false)) {
    await button.click({ force: true });
    await wait(700);
    return true;
  }
  return false;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1024 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log('Opening', BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('header', { timeout: 30000 });
  await dismissOverlays(page);
  await wait(1200);

  await shot(page, '00_landing_overview.png');

  const loadDemoBtn = page.getByRole('button', { name: /load demo/i }).first();
  await loadDemoBtn.click({ force: true });
  await page.waitForSelector('#main-content', { timeout: 30000 });
  await page.waitForSelector('text=01 — Project Info', { timeout: 30000 });
  await wait(1200);

  await shot(page, '01_workspace_full_demo.png');

  const inputPanel = page.locator('#input-panel');
  const exportPanel = page.locator('#export-panel');
  const assistantPanel = page.locator('#assistant-panel');
  const mainContent = page.locator('#main-content');
  const gantt = page.locator('#gantt-fig');
  const projectInfo = page.locator('#project-title');
  const objectives = page.locator('#objectives');
  const scope = page.locator('#scope');
  const assumptions = page.locator('#assumptions');
  const people = page.locator('#people');
  const risks = page.locator('#risks');
  const governance = page.locator('#governance');
  const notesPanel = page.locator('#notes-panel');

  await shot(page, '02_project_controls.png', inputPanel);
  await shot(page, '03_export_panel.png', exportPanel);
  await shot(page, '04_pid_sections_filled.png', mainContent);
  await shot(page, '05_project_info_overview.png', projectInfo);
  await shot(page, '06_objectives_kpis.png', objectives);
  await unionShot(page, '07_scope_constraints.png', scope, assumptions);
  await shot(page, '08_gantt_overview.png', gantt);
  await shot(page, '09_people_resources_budget.png', people);
  await shot(page, '10_risks_issues_communications.png', risks);
  await shot(page, '11_governance_compliance.png', governance);
  await shot(page, '12_general_notes.png', notesPanel);

  await shot(page, '13_ai_assistant_default.png', assistantPanel);
  const aiInput = page.getByRole('textbox', { name: /ask the pmomax ai assistant/i }).first();
  await aiInput.fill('Summarize the top three delivery risks and the top two compliance gaps for this project.');
  await page.getByRole('button', { name: /send message to ai assistant/i }).first().click({ force: true });
  await wait(6000);
  await shot(page, '14_ai_assistant_chat.png', assistantPanel);

  await clickButtonIfVisible(page, /help/i);
  const helpDialog = page.getByRole('dialog').first();
  if (await helpDialog.isVisible().catch(() => false)) {
    await shot(page, '15_help_modal_open.png', helpDialog);
    await page.keyboard.press('Escape').catch(() => {});
    await wait(500);
  }

  await page.getByRole('button', { name: /user guide/i }).first().click({ force: true });
  const userGuide = page.getByRole('dialog', { name: /pmomax user guide/i }).first();
  await wait(800);
  if (await userGuide.isVisible().catch(() => false)) {
    await shot(page, '16_user_guide_open.png', userGuide);
    await page.keyboard.press('Escape').catch(() => {});
    await wait(500);
  }

  await page.reload({ waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('header', { timeout: 30000 });
  await wait(900);
  const createBtn = page.getByRole('button', { name: /create/i }).first();
  if (await createBtn.isVisible().catch(() => false)) {
    await createBtn.click({ force: true });
    await wait(1500);
    await shot(page, '17_create_mode.png');
  }

  await browser.close();
  console.log('Capture complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
