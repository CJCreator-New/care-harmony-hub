---
Status: ready-for-agent
Severity: P3
Role: devops/build
Page: N/A
Viewport: N/A
Browser: N/A
---

# [P3] Duplicate Key "validate:rls" in `package.json`

## Description
During Vite dev server startup under test mode, the bundler reports:
```
[WebServer] WARNING Duplicate key "validate:rls" in object literal [duplicate-object-key]
    package.json:73:4:
      73 │     "validate:rls": "npx tsx scripts/validate-rls.ts",
    The original key "validate:rls" is here:
    package.json:16:4:
      16 │     "validate:rls": "tsx scripts/validate-rls.ts",
```

## Steps to Reproduce
1. Start test runner `npx playwright test ...`
2. Observe Vite build warning about duplicate key "validate:rls" in `package.json`.

## Expected Result
Keys in `package.json` scripts dictionary should be unique.

## Actual Result
Warning emitted during every test run.

## Recommended Fix
Remove line 73 or merge with line 16.

## Regression Test Required
No.
