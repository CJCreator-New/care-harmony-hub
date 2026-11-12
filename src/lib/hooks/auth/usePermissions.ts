// Re-export of the single usePermissions hook (ADR-0005). Kept so existing
// `@/lib/hooks` imports keep resolving; there is no second implementation.
export { usePermissions, hasAnyRole } from '@/hooks/usePermissions';
