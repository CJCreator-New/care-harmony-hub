# Runtime Error Detector Agent

## What This Agent Does

The **runtime-error-detector** is a custom agent specialized in finding all potential runtime errors, crashes, exceptions, and unexpected behavior in the CareSync HIMS codebase. It performs:

- **Static Analysis**: Lints, type-checks, and searches for common anti-patterns
- **Dynamic Analysis**: Runs the full test suite and simulates edge cases
- **Security Vulnerability Scanning**: Identifies issues that crash at runtime
- **Comprehensive Reporting**: Creates a detailed, actionable report with severity levels

## How to Use

### In VS Code Chat

1. Open the Chat view (`Ctrl+Shift+Alt+I`)
2. Type `/runtime-error-detector`
3. Press Enter or click the command suggestion
4. The agent will scan the entire codebase and generate a report

### Command Palette

1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Chat: Run Prompt..." or similar
3. Select "runtime-error-detector"
4. Follow the chat flow

### Custom Parameters

When invoking, you can specify:
- **Scope**: `"Focus on API layer only"` or `"Scan auth and permissions modules"`
- **Severity Filter**: `"Only critical and high severity issues"`
- **Module**: `"Check patient data handling"` or `"Audit appointment workflows"`

Example invocation:
```
/runtime-error-detector Focus on null/undefined errors in the patient management module
```

## What It Produces

The agent generates:

1. **runtime-error-report.md**: Comprehensive findings document with:
   - Severity breakdown (Critical/High/Medium/Low)
   - Exact file locations and line numbers
   - Reproduction steps for each issue
   - Code snippets showing fixes
   - Remediation priority order

2. **Analysis Output**: Summary of:
   - Total issues found
   - Most critical code paths
   - Test failures analysis
   - Static analysis warnings

## Report Structure

The report follows this organization:

```
# Runtime Error Detection Report

## Summary
- Critical Issues: X
- High Issues: X
- Medium Issues: X
- Low Issues: X

## Critical Issues
### Issue Title
- File & Line
- Type
- Why it fails
- How to fix it

## High Issues
[...]

## Remediation Plan
1. Fix critical issues
2. Fix high issues
3. Review test coverage
```

## Key Rules

✅ **This agent**:
- Finds every potential crash point
- Verifies findings with tools (not guessing)
- Prioritizes production-critical issues
- Provides clear reproduction steps
- Includes working code fixes

❌ **This agent does NOT**:
- Modify production code unless explicitly asked
- Fix style or performance issues (unless they cause crashes)
- Flag design patterns (unless they directly cause runtime errors)
- Report subjective findings without evidence

## Common Scenarios

### Scenario 1: Audit Before a Major Release
```
/runtime-error-detector
```
Scans everything, produces a complete risk assessment.

### Scenario 2: Fix Errors in a Specific Module
```
/runtime-error-detector
Review all potential runtime errors in the appointment booking workflow and suggest fixes.
```

### Scenario 3: Security-Focused Scan
```
/runtime-error-detector
Find all input validation gaps and potential injection/deserialization issues that could cause crashes.
```

### Scenario 4: Post-Deployment Analysis
```
/runtime-error-detector
Analyze the auth and HIPAA compliance layers for unhandled exception scenarios.
```

## Tools Available

This agent has unrestricted access to all tools:
- File/directory reading and searching
- Code search and symbol lookup
- Test execution
- Terminal commands
- Git operations
- Markdown writing

This allows it to:
- Read any source file
- Search the entire codebase
- Run linters, type-checkers, and tests
- Execute dynamic analysis
- Generate comprehensive reports

## Integration with Development Workflow

1. **Pre-commit**: Run before pushing to catch critical issues
2. **Code Review**: Use findings to inform peer review
3. **Release Prep**: Run full scan before major releases
4. **Incident Response**: Run on affected modules after production issues
5. **Continuous Monitoring**: Run periodically in CI/CD pipeline

## Tips for Best Results

1. **Be Specific**: If possible, mention the module or workflow to focus the scan
2. **Check Recent Changes**: Ask the agent to scan your recent commits
3. **Follow the Report**: Prioritize by severity level as recommended
4. **Verify Fixes**: Run tests after applying suggested fixes
5. **Iterate**: Run the scan again after fixes to ensure completeness

## Performance Notes

- **Full Scan**: 2-5 minutes depending on size
- **Scoped Scan**: 30 seconds - 2 minutes for specific modules
- **Report Size**: Typically 5-20 pages of detailed findings

## Related Tools

- **code-review**: For general code quality and architectural issues
- **hipaa-compliance-audit**: For specific HIPAA/PHI handling issues
- **accessibility-audit**: For WCAG compliance issues
- **healthcare-testing**: For test coverage and clinical workflow validation
