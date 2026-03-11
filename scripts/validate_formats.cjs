// scripts/validate_formats.cjs
// Node CJS script to check `lib/supportedFormats.ts` exports and page/word constants.
const fs = require('fs');
const path = require('path');

function parseSupportedFormatsTs() {
  const p = path.join(__dirname, '..', 'lib', 'supportedFormats.ts');
  if (!fs.existsSync(p)) throw new Error('supportedFormats.ts not found');
  const src = fs.readFileSync(p, 'utf8');
  const maxPagesMatch = src.match(/export const MAX_PAGES\s*=\s*(\d+)/);
  const wordsPerPageMatch = src.match(/export const WORDS_PER_PAGE\s*=\s*(\d+)/);
  const inputAcceptMatch = src.match(/export const INPUT_ACCEPT\s*=\s*([^;]+)/);
  const formatsMatch = src.match(/export const SUPPORTED_FORMATS\s*=\s*(\[[\s\S]*?\]);/m);

  const MAX_PAGES = maxPagesMatch ? Number(maxPagesMatch[1]) : null;
  const WORDS_PER_PAGE = wordsPerPageMatch ? Number(wordsPerPageMatch[1]) : null;
  const INPUT_ACCEPT = inputAcceptMatch ? inputAcceptMatch[1].trim() : null;
  const SUPPORTED_FORMATS_SRC = formatsMatch ? formatsMatch[1] : null;

  return { MAX_PAGES, WORDS_PER_PAGE, INPUT_ACCEPT, SUPPORTED_FORMATS_SRC, src };
}

function run() {
  const info = parseSupportedFormatsTs();
  console.log('MAX_PAGES:', info.MAX_PAGES);
  console.log('WORDS_PER_PAGE:', info.WORDS_PER_PAGE);
  console.log('INPUT_ACCEPT (raw):', info.INPUT_ACCEPT ? info.INPUT_ACCEPT.slice(0, 200) : 'MISSING');

  if (!info.SUPPORTED_FORMATS_SRC) {
    console.error('ERROR: SUPPORTED_FORMATS not found in supportedFormats.ts');
    process.exit(2);
  }

  if (!info.MAX_PAGES || !info.WORDS_PER_PAGE) {
    console.error('ERROR: MAX_PAGES or WORDS_PER_PAGE missing');
    process.exit(3);
  }

  const maxWords = info.MAX_PAGES * info.WORDS_PER_PAGE;
  console.log('Derived MAX_WORDS:', maxWords);

  console.log('Format validation OK (basic checks passed)');
}

if (require.main === module) run();
module.exports = { run };
