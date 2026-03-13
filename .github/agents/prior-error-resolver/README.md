# Prior Error Resolver Agent

## Overview

The **prior-error-resolver** is an elite investigative agent specialized in discovering and fixing **all errors—past and present**—that have caused or could cause the CareSync HIMS application to crash or fail.

This agent prioritizes **historical errors first** (git history, prior bug fixes) before tackling current issues.

## When to Invoke

Use this agent when you need to:

- ✅ **Find recurring bug patterns** from git history and prevent them forever
- ✅ **Resolve all TODOs/FIXMEs** that indicate incomplete work or potential crashes
- ✅ **Eliminate unhandled promises** that cause silent failures
- ✅ **Debug "builds clean but crashes on run"** issues
- ✅ **Identify edge cases** that slip through type checking but crash at runtime
- ✅ **Fix resource leaks**, lifecycle bugs, and race conditions
- ✅ **Resolve all errors holistically** with full test coverage

## Auto-Apply vs Manual Review

### Fixes Applied Automatically ✅
- Null checks and undefined guards
- Type guards and type narrowing
- Missing .catch() error handlers
- Unsafe type casts removal (`as any` → proper types)
- Input validation with type guards
- Array bounds checks
- Try-catch blocks around async operations
- Non-null assertion removal with fallbacks
- Resource cleanup fixes

### Requires Your Approval ⚠️
- Database schema changes
- Major architectural refactors
- New dependencies
- Security-sensitive operations
- RBAC/RLS changes
- Critical healthcare workflow changes
- Patient data handling modifications

## Invocation Syntax

```
/prior-error-resolver — Full historical + current error scan
/prior-error-resolver — Scan for git history patterns
/prior-error-resolver — Find all unhandled promise rejections
/prior-error-resolver — TODOs and FIXMEs audit
/prior-error-resolver — "Build clean but crash on run" issues
```

## Workflow

The agent executes in three phases:

### Phase 1: Historical Scan (Always First)
- Analyze git commit history for error keywords
- Extract lessons from past bug fixes
- Identify recurring patterns
- Review issue/PR history

### Phase 2: Current Runtime Issues
- Full codebase scan for runtime crash patterns
- Null/undefined access, unhandled async errors
- Missing validation, resource leaks, lifecycle bugs
- Build + test + edge case simulation

### Phase 3: Resolution
- Generate comprehensive error report
- Implement fixes safely (with tests)
- Create clean PRs with before/after evidence

## Output

The agent produces a structured **Prior Error Resolution Report** containing:

1. **Executive Summary** — Total errors found, resolved, remaining
2. **Historical Errors Fixed** — With git references
3. **New Issues Discovered** — Severity breakdown
4. **Fixes Implemented** — Per-file changes with line numbers
5. **PRs Created** — Links to open pull requests
6. **Remaining Manual Review** — Items requiring human judgment

## Configuration

| Setting | Value | Meaning |
|---------|-------|---------|
| Tool Access | `["*"]` (full) | Can use all read/write/execute/git tools |
| Auto-Apply | Enabled | Automatically applies safe fixes (null checks, type guards) |
| Priority Directories | `src/`, `services/`, `tests/` | Scans all equally; frontend + backend + test coverage |
| Risky Fixes | Manual approval | Schema changes, major refactors, security ops require prior review |

## Safety Guarantees

- ✅ **Full tool access** with judicious use
- ✅ **Auto-applies** simple/safe fixes (null checks, type guards, missing validations)
- ✅ **Manual approval required** for: schema changes, major refactors, security-sensitive operations
- ✅ Always runs tests/build after changes
- ✅ Never breaks existing functionality
- ✅ Uses defensive programming + runtime validation
- ✅ Never modifies production secrets or commits to main directly

## Example Queries

### Find All Historical Bugs
```
/prior-error-resolver — What errors have we fixed before? Scan git history for patterns and make sure they don't come back.
```

### Quick TODO/FIXME Audit
```
/prior-error-resolver — Find every TODO and FIXME comment in src/ that could indicate a hidden crash.
```

### Runtime Crash Diagnostic
```
/prior-error-resolver — The app builds clean but crashes when I do X. Find the runtime error and fix it.
```

### Unhandled Promise Audit
```
/prior-error-resolver — Scan for all unhandled promise rejections in the codebase.
```

## Related Agents

- **runtime-error-detector** — Finds runtime errors in the current codebase
- **code-review** — Comprehensive code quality and security audit
- **healthcare-testing** — Generates tests to prevent future errors

## Notes

- This agent has **full tool access** (`tools: ["*"]`)
- Prioritizes git history analysis before anything else
- Conservative by design: prefers to report risky fixes rather than auto-apply
- Always produces detailed before/after evidence for verification
