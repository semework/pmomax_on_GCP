const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.PMOMAX_BASE_URL || 'https://pmo-architect-zxofcfyioq-ue.a.run.app';
const OUT_DIR = path.join(process.cwd(), 'public', 'App_screenshots');
const DEMO_TEXT_PATH = path.join(process.cwd(), 'data', 'demoText.ts');
const MANUAL_FILE = path.join(OUT_DIR, '_MANUAL_NEEDED.txt');

const TARGETS = [
  'app_populated.png',
  'assistant_blank.png',
  'assistant_conversation_two_turns.png',
  'create_ai_assistant.png',
  'create_ai_assistant_create.png',
  'create_ai_assistant_new_project.png',
  'create_ai_assistant_new_project_bottom.png',
  'export_panel_visible.png',
  'export_pdf_opened.png',
  'export_word_opened.png',
  'general_notes_filled.png',
  'help_modal_open.png',
  'help_modal_scrolled.png',
  'navigation_new.png',
  'parsing_input_demo_text.png',
  'parsing_loading_state.png',
  'people_governance.png',
  'risks_mitigations_issues.png',
  'scope_constraints_new.png',
  'start_home_empty.png',
  'start_left_panel_clean.png',
  'team_milestone_deliverables.png',
  'unfilled_navigation_new.png',
  'user_guide_bottom.png',
  'user_guide_top.png',
];

function readDemoText() {
  try {
    const raw = fs.readFileSync(DEMO_TEXT_PATH, 'utf8');
    const match = raw.match(/`([\s\S]*)`/);
    return match && match[1] ? match[1].trim() : 'Demo PID text';
  } catch {
    return 'Demo PID text';
  }
}

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function saveElementShot(page, name, selector, manual, options = {}) {
  const out = path.join(OUT_DIR, name);
  try {
    const el = await page.waitForSelector(selector, { timeout: 15000 });
    await el.screenshot({ path: out, ...options });
    console.log('Saved', name);
    return true;
  } catch (e) {
    manual.push(`${name} -> failed selector: ${selector} (${e.message})`);
    return false;
  }
}

async function savePageShot(page, name, manual, options = {}) {
  const out = path.join(OUT_DIR, name);
  try {
    await page.screenshot({ path: out, ...options });
    console.log('Saved', name);
    return true;
  } catch (e) {
    manual.push(`${name} -> page screenshot failed (${e.message})`);
    return false;
  }
}

async function clickIfPresent(page, selector, wait = 700) {
  try {
    const el = await page.waitForSelector(selector, { timeout: 8000 });
    await el.click({ force: true });
    await page.waitForTimeout(wait);
    return true;
  } catch {
    return false;
  }
}

async function closeAnyModal(page) {
  await clickIfPresent(page, 'button:has-text("Close")', 500);
}

(async () => {
  ensureOutDir();
  const demoText = readDemoText();
  const manual = [];
  const done = new Set();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();

  try {
    console.log('Opening', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForSelector('header', { timeout: 30000 });
    await page.waitForTimeout(1200);

    // Empty/start states
    if (await savePageShot(page, 'start_home_empty.png', manual, { fullPage: true })) done.add('start_home_empty.png');
    if (await saveElementShot(page, 'start_left_panel_clean.png', 'aside:first-of-type', manual)) done.add('start_left_panel_clean.png');
    if (await saveElementShot(page, 'assistant_blank.png', '#assistant-panel', manual)) done.add('assistant_blank.png');
    if (await saveElementShot(page, 'unfilled_navigation_new.png', 'text="What PMOMax extracts for you"', manual)) done.add('unfilled_navigation_new.png');

    // Parse flow
    await page.fill('#input-panel-textarea', demoText);
    if (await saveElementShot(page, 'parsing_input_demo_text.png', '#input-panel-textarea', manual)) done.add('parsing_input_demo_text.png');

    const parseButton = page.locator('button:has-text("Parse")').first();
    await parseButton.click({ force: true });
    let loadingSeen = false;
    try {
      await page.waitForSelector('text="AI is architecting"', { timeout: 12000 });
      loadingSeen = true;
    } catch {}
    if (loadingSeen) {
      if (await savePageShot(page, 'parsing_loading_state.png', manual, { fullPage: true })) done.add('parsing_loading_state.png');
    } else {
      manual.push('parsing_loading_state.png -> loading overlay too brief to capture automatically');
    }

    try {
      await page.waitForSelector('text="01 — Project Info"', { timeout: 90000 });
    } catch {
      manual.push('app_populated.png -> parsed state did not load within timeout');
    }
    await page.waitForTimeout(1500);

    if (await savePageShot(page, 'app_populated.png', manual, { fullPage: true })) done.add('app_populated.png');

    // Loaded PID sections
    if (await saveElementShot(page, 'navigation_new.png', 'aside.w-56', manual)) done.add('navigation_new.png');

    await page.evaluate(() => document.getElementById('scope')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(600);
    if (await saveElementShot(page, 'scope_constraints_new.png', '#scope', manual)) done.add('scope_constraints_new.png');

    await page.evaluate(() => document.getElementById('people')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(600);
    if (await saveElementShot(page, 'people_governance.png', '#people', manual)) done.add('people_governance.png');

    await page.evaluate(() => document.getElementById('risks')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(600);
    if (await saveElementShot(page, 'risks_mitigations_issues.png', '#risks', manual)) done.add('risks_mitigations_issues.png');

    await page.evaluate(() => document.getElementById('gantt')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(600);
    if (await saveElementShot(page, 'team_milestone_deliverables.png', '#gantt', manual)) done.add('team_milestone_deliverables.png');

    // Notes and export
    await page.fill('#notes-panel textarea', 'General notes updated for demo screenshot capture.');
    if (await saveElementShot(page, 'general_notes_filled.png', '#notes-panel', manual)) done.add('general_notes_filled.png');

    await page.evaluate(() => document.getElementById('export-panel')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(500);
    if (await saveElementShot(page, 'export_panel_visible.png', '#export-panel', manual)) done.add('export_panel_visible.png');

    // Export actions (often trigger downloads; not reliably screen-capturable as opened docs)
    const pdfBtn = await clickIfPresent(page, 'button[aria-label="Export PDF"]', 1200);
    if (pdfBtn) {
      if (await saveElementShot(page, 'export_pdf_opened.png', '#export-panel', manual)) {
        done.add('export_pdf_opened.png');
        manual.push('export_pdf_opened.png -> captured export panel after click; actual opened PDF tab must be captured manually if required.');
      }
    } else {
      manual.push('export_pdf_opened.png -> Export PDF button not clickable/capturable as opened document in headless run');
    }

    const wordBtn = await clickIfPresent(page, 'button[aria-label="Export Word"]', 1200);
    if (wordBtn) {
      if (await saveElementShot(page, 'export_word_opened.png', '#export-panel', manual)) {
        done.add('export_word_opened.png');
        manual.push('export_word_opened.png -> captured export panel after click; actual opened Word output must be captured manually if required.');
      }
    } else {
      manual.push('export_word_opened.png -> Export Word button not clickable/capturable as opened document in headless run');
    }

    // Assistant conversation
    const inputSel = 'input[aria-label="Ask the PMOMax AI assistant"]';
    if (await page.locator(inputSel).count()) {
      await page.fill(inputSel, 'Summarize this PID in 2 bullets.');
      await clickIfPresent(page, 'button[aria-label="Send message to AI assistant"]', 1000);
      await page.fill(inputSel, 'List top 2 risks.');
      await clickIfPresent(page, 'button[aria-label="Send message to AI assistant"]', 2200);
      if (await saveElementShot(page, 'assistant_conversation_two_turns.png', '#assistant-panel', manual)) done.add('assistant_conversation_two_turns.png');
    } else {
      manual.push('assistant_conversation_two_turns.png -> assistant input not available');
    }

    // Help modal
    if (await clickIfPresent(page, 'button[aria-label="Open help"]', 900)) {
      const helpDialog = 'div[role="dialog"][aria-label="Help"]';
      if (await saveElementShot(page, 'help_modal_open.png', helpDialog, manual)) done.add('help_modal_open.png');
      try {
        await page.evaluate(() => {
          const el = document.querySelector('div[role="dialog"][aria-label="Help"] .overflow-y-auto');
          if (el) el.scrollTop = 1200;
        });
        await page.waitForTimeout(600);
        if (await saveElementShot(page, 'help_modal_scrolled.png', helpDialog, manual)) done.add('help_modal_scrolled.png');
      } catch (e) {
        manual.push(`help_modal_scrolled.png -> could not scroll help modal (${e.message})`);
      }
      await closeAnyModal(page);
    } else {
      manual.push('help_modal_open.png -> could not open Help modal');
      manual.push('help_modal_scrolled.png -> could not open Help modal');
    }

    // User guide modal
    if (await clickIfPresent(page, 'button[aria-label="Open user guide"]', 900)) {
      const guideDialog = 'div[role="dialog"][aria-label="PMOMax User Guide"]';
      if (await saveElementShot(page, 'user_guide_top.png', guideDialog, manual)) done.add('user_guide_top.png');
      try {
        await page.evaluate(() => {
          const nodes = Array.from(document.querySelectorAll('div[role="dialog"][aria-label="PMOMax User Guide"] .overflow-y-auto'));
          nodes.forEach((n) => {
            if (n) n.scrollTop = 2500;
          });
        });
        await page.waitForTimeout(900);
        if (await saveElementShot(page, 'user_guide_bottom.png', guideDialog, manual)) done.add('user_guide_bottom.png');
      } catch (e) {
        manual.push(`user_guide_bottom.png -> could not scroll user guide (${e.message})`);
      }
      await closeAnyModal(page);
    } else {
      manual.push('user_guide_top.png -> could not open User Guide modal');
      manual.push('user_guide_bottom.png -> could not open User Guide modal');
    }

    // Create mode screenshots
    if (await clickIfPresent(page, 'button:has-text("Create")', 1200)) {
      if (await savePageShot(page, 'create_ai_assistant.png', manual, { fullPage: false })) done.add('create_ai_assistant.png');
      if (await savePageShot(page, 'create_ai_assistant_new_project.png', manual, { fullPage: true })) done.add('create_ai_assistant_new_project.png');

      const firstExample = page.locator('button[aria-label^="Load example:"]').first();
      if (await firstExample.count()) {
        await firstExample.click({ force: true });
        await page.waitForTimeout(1800);
        if (await savePageShot(page, 'create_ai_assistant_create.png', manual, { fullPage: true })) done.add('create_ai_assistant_create.png');

        await page.evaluate(() => {
          const nodes = Array.from(document.querySelectorAll('div'));
          for (const n of nodes) {
            if (n.scrollHeight > n.clientHeight + 50) {
              n.scrollTop = n.scrollHeight;
            }
          }
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(800);
        if (await savePageShot(page, 'create_ai_assistant_new_project_bottom.png', manual, { fullPage: false })) done.add('create_ai_assistant_new_project_bottom.png');
      } else {
        manual.push('create_ai_assistant_create.png -> no example cards found in Create mode');
        manual.push('create_ai_assistant_new_project_bottom.png -> no example cards found in Create mode');
      }
    } else {
      manual.push('create_ai_assistant.png -> Create mode button not found');
      manual.push('create_ai_assistant_new_project.png -> Create mode button not found');
      manual.push('create_ai_assistant_create.png -> Create mode button not found');
      manual.push('create_ai_assistant_new_project_bottom.png -> Create mode button not found');
    }

    // Any missed targets
    for (const t of TARGETS) {
      if (!done.has(t) && !manual.some((m) => m.startsWith(`${t} ->`))) {
        manual.push(`${t} -> not captured in automation flow`);
      }
    }

    const header = [
      `PMOMax screenshot refresh report`,
      `Base URL: ${BASE_URL}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      'Manual follow-up needed for:',
    ];
    fs.writeFileSync(MANUAL_FILE, `${header.join('\n')}\n- ${manual.join('\n- ')}\n`, 'utf8');
    console.log('Wrote', MANUAL_FILE);

    const captured = TARGETS.filter((t) => fs.existsSync(path.join(OUT_DIR, t)));
    console.log(`Captured ${captured.length}/${TARGETS.length} target screenshots.`);
    if (manual.length) {
      console.log('Manual items:', manual.length);
    }
  } finally {
    await browser.close();
  }
})();
