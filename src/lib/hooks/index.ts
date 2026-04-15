/**
 * Centralized hooks library
 * 
 * All domain hooks are organized by business domain for scalability and maintainability.
 * The lib/hooks structure follows this pattern:
 * 
 * - lib/hooks/patients/      → Patient domain hooks (lookup, portal, readiness)
 * - lib/hooks/appointments/  → Appointment domain hooks (scheduling, availability, requests)
 * - lib/hooks/pharmacy/      → Pharmacy domain hooks (prescriptions, inventory, interactions)
 * - lib/hooks/auth/          → Authorization hooks (RBAC, sessions, 2FA)
 * 
 * Each domain exports via local index.ts for:
 * 1. Scalability: New domains can be added without touching this file
 * 2. Code splitting: Webpack can tree-shake unused domains
 * 3. Team ownership: Each team manages their own domain without cross-team friction
 */

// Patient domain
export * from './patients';

// Appointment domain
export * from './appointments';

// Pharmacy domain
export * from './pharmacy';

// Auth domain
export * from './auth';

// Observability domain (audit, metrics, health checks)
export * from './observability';
