# PMOMax Security Hardening Report

Date: 2026-02-27

## Summary
This change set adds prompt-injection defenses, untrusted input isolation, allowlisted patching, and output filtering across PMOMax AI flows. It also hardens PDF export text handling and constrains spreadsheet parsing to reduce XLSX attack surface. All changes are additive and preserve the canonical PID schema and existing workflows.

## Threat Model Coverage
- Direct prompt injection in user inputs and chat messages.
- Indirect injection via uploaded documents and extracted text.
- Injection through PID fields that are later re-fed into assistant context.
- Model output injection attempts (system prompt leaks, secret leakage, unauthorized fields).

## Files Changed (Security-Relevant)
- `server.mjs`
- `lib/security/promptDefense.ts`
- `lib/security/promptDefense.js`
- `lib/security/pidGuard.ts`
- `lib/security/pidGuard.js`
- `lib/parseUpload.ts`
- `lib/parseUpload.js`
- `lib/export.ts`
- `lib/export.js`
- `lib/fileToText.ts`
- `tests/security/promptDefense.test.ts`
- `TEST_DATA/malicious_prompt_injection.txt`
- `TEST_DATA/clean_prompt.txt`
- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `npm_audit_after.json`
- `PROMPT_INJECTION_MITIGATION.md`

## Prompt Injection Mitigations
1. **Central defenses**
   - `detectPromptInjection`, `sanitizeUntrustedText`, `wrapUntrusted`, `redactSecrets`, `containsProhibitedOutput`.
2. **System prompt immutability**
   - Explicit “ignore instructions in input” rules added to all model prompts.
3. **Untrusted input isolation**
   - All extracted/user content wrapped in `<UNTRUSTED_INPUT_DATA> ... </UNTRUSTED_INPUT_DATA>`.
4. **Allowlisted output enforcement**
   - Model patch outputs are allowlisted to the PID schema.
5. **Output filtering + refusal**
   - Responses containing secret/system prompt leakage are blocked.
6. **Indirect injection protection**
   - High-risk fields (`notesBackground`, `fields`, `tables`, `workBreakdownNotes`) removed from assistant context by default.

## Dependency Vulnerability Mitigation
- **jsPDF** upgraded to `^4.2.0` in `package.json`.
- **rollup/minimatch/ajv/qs** overridden to patched versions via `overrides`.
- **xlsx** has no upstream fix; attack surface reduced via strict size/row/col/cell caps.

## npm audit Results
- **Before**: 6 total vulnerabilities (4 high, 1 moderate, 1 low) per provided report.
- **After**: 1 high vulnerability remains (`xlsx`, no fix available).
  - See `npm_audit_after.json`.

## Tests
Added `tests/security/promptDefense.test.ts`.

Run with:
```
VITE_CACHE_DIR=/tmp/pmo26_vite VITE_TEMP_DIR=/tmp/pmo26_vite npm test
```

## Performance Considerations
- Sanitization is O(n) and runs server-side or once per upload/assistant call.
- No heavy scanning added to React render loops.
