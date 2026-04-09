## 📋 Purpose
<!-- Describe what this PR accomplishes -->

## 📖 Related Documentation
<!-- Link to standards references (DEVELOPMENT_STANDARDS.md, etc.) -->

## Phase & Type
- **Phase**: [ ] 1-CodeQuality [ ] 2-Testing [ ] 3-Security [ ] 4-Performance [ ] 5-Features [ ] 6-Production
- **Type**: [ ] Audit/Refactor [ ] Feature [ ] Bugfix [ ] Test [ ] Docs

## 🔍 Changes Summary
<!-- List the main changes -->

## ✅ Acceptance Criteria
- [ ] All changes follow documented patterns (DEVELOPMENT_STANDARDS.md)
- [ ] Code is tested (unit/integration as applicable)
- [ ] No TypeScript errors or warnings
- [ ] No console errors in affected pages
- [ ] Documentation/comments updated if behavior changed

## 🛡️ Security & Quality Checklist

### Code Quality
- [ ] Follows DEVELOPMENT_STANDARDS.md patterns
- [ ] No `any` types used
- [ ] Proper error handling (try/catch, Error Boundary, Sonner toast)
- [ ] TypeScript strict mode compliant
- [ ] No code duplication (DRY principle)

### Security (from SECURITY_CHECKLIST.md)
- [ ] No PHI logged or exposed in error messages
- [ ] Hospital ID filtering applied (backend changes)
- [ ] Authentication/authorization checks in place
- [ ] Input validation (Zod schemas) applied
- [ ] No secrets in code or environment variables hardcoded

### Performance
- [ ] No new N+1 queries
- [ ] Caching strategy applied (TanStack Query for server state)
- [ ] No unnecessary re-renders (React.memo, useMemo if needed)
- [ ] Bundle size impact assessed (if adding dependencies)

### Testing
- [ ] Unit tests added for business logic
- [ ] Integration tests cover happy + error paths
- [ ] E2E test coverage for user-facing changes
- [ ] Test expectations documented

### Frontend (if applicable)
- [ ] Component follows presentational/container pattern
- [ ] Props are explicit and typed
- [ ] Custom hooks extracted if logic > 50 lines
- [ ] Styling uses Tailwind (no inline styles)
- [ ] Responsive design verified (mobile/tablet/desktop)

### Backend (if applicable)
- [ ] Route layer: thin handlers delegating to controller
- [ ] Controller: HTTP-focused, delegates to service
- [ ] Service: business logic isolated, testable independently
- [ ] Repository: uses parameterized queries, no raw SQL
- [ ] Hospital ID included in all queries

## 📊 Audit Scoring (for Phase 1 audits)
- **Component Score**: X/5
- **Rationale**: [Why this score]

## 🧪 Testing Evidence
<!-- Paste output from: npm run test:unit / npm run test:integration / npm run test:security -->

## 🚀 Deployment Impact
- Breaking changes: [ ] Yes [ ] No
- Database migration needed: [ ] Yes [ ] No
- Environment variables changed: [ ] Yes [ ] No

## 📝 Notes for Reviewers
<!-- Any context or gotchas for reviewers -->

---

**Closes**: #ISSUE_NUMBER (if applicable)  
**Related PRs**: #PR_NUMBER (if part of larger refactor)
