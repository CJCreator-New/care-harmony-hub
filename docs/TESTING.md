# Testing Documentation

## Overview
Comprehensive testing strategy for CareSync Hospital Management System covering unit, integration, E2E, and performance testing.

## Test Structure

```
src/test/
├── components/
│   └── auth/
│       └── RoleProtectedRoute.test.tsx
├── hooks/
│   └── usePermissions.test.tsx
├── integration/
│   └── auth-flow.test.tsx
├── performance/
│   └── render-performance.test.tsx
└── setup.ts

tests/e2e/
├── patient-flow-critical.spec.ts
├── role-based-access.spec.ts
├── utils/
│   └── test-helpers.ts
├── config/
│   └── e2e.config.ts
└── README.md
```

## Test Categories

### Unit Tests
- **Components**: Individual component testing with mocked dependencies
- **Hooks**: Custom hook testing with various scenarios
- **Utils**: Utility function testing

### Integration Tests
- **Auth Flow**: Complete authentication and role switching flow
- **Component Integration**: Multi-component interaction testing

### E2E Tests
- **Critical Patient Flow**: Complete patient journey from check-in to discharge
- **Role-Based Access Control**: Comprehensive RBAC validation across all roles

### Performance Tests
- **Render Performance**: Component render time benchmarks
- **Large Dataset Handling**: Performance with high data volumes

## Running Tests

```bash
# Unit tests
npm run test:unit
npm run test:unit:watch
npm run test:coverage

# E2E tests
npm run test:e2e
npm run test:e2e:patient-flow
npm run test:e2e:rbac
npm run test:e2e:critical

# All tests
npm test
```

## Test Configuration

### Vitest Setup
- **Environment**: jsdom for DOM testing
- **Coverage**: v8 provider with comprehensive reporting
- **Mocks**: localStorage, sessionStorage, and API mocks

### Playwright Setup
- **Browsers**: Chromium, Firefox, WebKit
- **Parallel Execution**: Optimized for CI/CD
- **Screenshots**: On failure for debugging

## Key Testing Patterns

### Role Switching Tests
```typescript
// Test localStorage persistence
localStorage.setItem('testRole', 'admin');
expect(component).toHaveAdminAccess();

// Test role precedence
const effectiveRoles = testRole ? [testRole] : userRoles;
expect(hasAccess(effectiveRoles, requiredRoles)).toBe(true);
```

### API Mocking
```typescript
// Mock successful responses
await page.route('**/api/patients', route => {
  route.fulfill({ json: mockPatients });
});

// Mock error scenarios
await page.route('**/api/consultations', route => {
  route.fulfill({ status: 500 });
});
```

### Performance Benchmarks
- Dashboard render: < 100ms
- Large dataset (1000+ items): < 500ms
- Route navigation: < 200ms
- Form submission: < 300ms

## Coverage Targets
- **Unit Tests**: > 90% line coverage
- **Integration Tests**: Critical user flows
- **E2E Tests**: Happy path + error scenarios
- **Performance Tests**: Key performance metrics

## CI/CD Integration
Tests run automatically on:
- Pull requests
- Main branch commits
- Nightly builds (full E2E suite)

## Debugging
- Use `test:unit:watch` for TDD workflow
- Use `test:e2e:headed` for visual debugging
- Screenshots and videos available in test-results/