// scripts/validate_formats.js
// Small validation script to check `lib/supportedFormats.ts` exports and page/word constants.
const path = require('path');
const fs = require('fs');

const supported = require('../lib/supportedFormats').default;

function run() {
  console.log('SUPPORTED_FORMATS:', supported.SUPPORTED_FORMATS.map(f => f.ext).join(', '));
  console.log('INPUT_ACCEPT:', supported.INPUT_ACCEPT);
  console.log('MAX_PAGES:', supported.MAX_PAGES);
  console.log('WORDS_PER_PAGE:', supported.WORDS_PER_PAGE);
  console.log('MAX_WORDS:', supported.MAX_WORDS);

  if (!supported.SUPPORTED_FORMATS || supported.SUPPORTED_FORMATS.length === 0) {
    console.error('ERROR: SUPPORTED_FORMATS is empty');
    process.exit(2);
  }

  if (!supported.INPUT_ACCEPT || !supported.INPUT_ACCEPT.includes('.pdf')) {
    console.warn('WARNING: INPUT_ACCEPT may be missing common extensions like .pdf');
  }

  if (supported.MAX_WORDS !== supported.MAX_PAGES * supported.WORDS_PER_PAGE) {
    console.error('ERROR: MAX_WORDS does not equal MAX_PAGES * WORDS_PER_PAGE');
    process.exit(3);
  }

  console.log('Format validation OK');
}

if (require.main === module) run();
module.exports = { run };
