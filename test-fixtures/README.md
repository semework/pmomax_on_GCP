Test fixtures and validation

This folder is a placeholder for manual/smoke tests for `fileToText` and supported formats.

How to use:

1. Place sample files into `test-fixtures/` (e.g., sample.pdf, sample.docx, sample.csv, sample.md).
2. Run the format validator (quick check):

```bash
node scripts/validate_formats.js
```

Note: `fileToText` depends on browser APIs and some optional native packages (pdfjs-dist, mammoth) for full parsing. For automated parsing validation you can:

- Run the front-end dev server and manually drag/drop sample files into the Input panel.
- Or write a Node test harness that loads server-side helpers (e.g., `server/docxParse.js`) directly for DOCX. Some parsers require installing `mammoth` or `pdfjs-dist` in the environment.

If you want, I can add an automated Node-based harness that runs DOCX and CSV checks (requires `mammoth` and `xlsx`).
