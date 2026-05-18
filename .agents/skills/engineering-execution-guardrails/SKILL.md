---
name: engineering-execution-guardrails
description: Enforces cautious, minimal, goal-driven implementation behavior for coding tasks in this project. Use when implementing fixes, features, refactors, or reviews where unnecessary changes and silent assumptions are a risk.
license: Project-local guidance
---

# Engineering Execution Guardrails

This skill turns project-level behavioral guidance into an execution checklist for implementation work. It is intentionally biased toward caution over speed, but should still use judgment for trivial tasks.

Use this skill when:
- A coding task has multiple plausible interpretations
- The request sounds simple but could trigger overengineering
- The change should stay tightly scoped
- Verification matters more than speed
- You need to review, fix, refactor, or extend existing code without collateral edits

## Core Operating Rules

### 1. Think Before Coding

Before making changes:
- State assumptions explicitly when they affect implementation
- If there are multiple reasonable interpretations, surface them instead of choosing silently
- Prefer a simpler approach when it solves the request cleanly
- If something important is unclear and risky, stop and name the uncertainty before coding

Default posture:
- Do not pretend certainty
- Do not hide confusion
- Do not silently expand scope

### 2. Simplicity First

Write the minimum code that solves the requested problem:
- No speculative features
- No abstractions for one-time use
- No configurability unless requested
- No defensive handling for impossible scenarios
- If the solution feels longer or more generic than necessary, simplify it

Challenge each implementation with:
- Would a senior engineer call this overcomplicated?
- Can this be solved with fewer moving parts?
- Did I add anything the user did not ask for?

### 3. Surgical Changes

Touch only what is needed for the request:
- Match existing local style and patterns
- Avoid drive-by refactors
- Do not rewrite nearby code just because it could be cleaner
- Do not change comments, naming, or formatting unless required by the task

Cleanup rule:
- Remove imports, variables, helpers, or tests made unused by your own change
- Leave unrelated pre-existing dead code alone unless asked to remove it

Line-by-line test:
- Every changed line should trace directly to the user request or required verification

### 4. Goal-Driven Execution

Convert vague requests into verifiable outcomes:
- Bug fix -> reproduce with a test or clear failing check, then make it pass
- Validation -> add checks for invalid inputs, then prove expected behavior
- Refactor -> preserve behavior and verify before/after with tests or equivalent checks

For multi-step tasks, frame work like this:

```text
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
```

Weak goal:
- "Make it work"

Strong goal:
- "Reproduce the bug in a targeted test, implement the smallest fix, and run the affected test file"

## Project-Specific Application

When using this skill in this repository:
- Prefer local context over assumptions
- Read the relevant file or module before editing
- Preserve healthcare and workflow-specific constraints already encoded in the codebase
- Keep changes narrow because this repo contains domain-critical HIMS workflows
- Mention unrelated issues you notice, but do not fix them unless requested

## Recommended Workflow

1. Restate the task in one sentence and name any important assumptions
2. If the task is not trivial, define 1-3 success checks before editing
3. Inspect only the files needed to complete the task
4. Make the smallest viable patch
5. Run the narrowest verification that proves the change
6. Report what changed, what was verified, and any assumptions or residual risk

## Review Mode

If the task is a review:
- Prioritize bugs, regressions, missing verification, and scope creep
- Call out overengineering when a simpler approach would satisfy the requirement
- Flag hidden assumptions and unverified behavior before discussing style

## Invocation Examples

```text
Use engineering-execution-guardrails for this bug fix before changing any files.

Apply engineering-execution-guardrails and keep the diff surgical.

Review this feature using engineering-execution-guardrails and focus on unnecessary complexity.
```

## Success Signal

This skill is working when:
- Diffs are smaller and easier to justify
- Clarifying questions happen before mistakes, not after
- Solutions get simpler instead of more abstract
- Verification is explicit
- Unrelated files stay untouched
