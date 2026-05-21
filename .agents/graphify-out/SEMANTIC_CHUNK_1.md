# Semantic Chunk 1

## Nodes
- App | component | Root app shell wiring providers, router, route error boundary, suspense.
- AppRoutes | routing module | Composes redirect, public, protected, and fallback route sets.
- QueryClient | state/cache | Global TanStack Query client with shared query defaults.
- RouteAwareErrorBoundary | resilience wrapper | Re-mounts error boundary per pathname.
- RootErrorBoundary | resilience wrapper | Catches startup/provider render crashes before in-app tree.
- BootstrapOrchestrator | bootstrap service | Enforces init order for logger, telemetry, tracking, metrics, interceptors.
- LoggerSetup | observability service | Creates structured bootstrap logger with env/version context.
- TelemetrySetup | observability service | Initializes/shuts down OpenTelemetry pipeline.
- MetricsSetup | observability service | Initializes app performance metrics collection.
- GlobalUnhandledHandlers | runtime guard | Captures unhandled promise rejections and window errors.
- AdminDashboard | admin feature | Role-gated admin tabs for overview/users/analytics/settings.
- AdminRBACManager | authorization utility | Checks panel access and fine-grained admin permissions.
- AdminDashboardLayout | layout component | Admin shell with sidebar nav, header profile menu, skip link.
- SharedMetricCard | UI primitive | Reusable metric/trend presentation with motion and micro-interaction.
- AuditTrailDashboard | compliance feature | Hospital-scoped audit log listing, severity aggregation, filtering.
- SystemMonitoringDashboard | ops feature | Shows system health, alerts, and alert acknowledgment actions.
- ComprehensiveSystemDashboard | analytics aggregator | Merges metrics from performance/automation/improvement/enterprise services.
- UserManagement | admin feature | User CRUD/suspend/password reset with permission-gated actions.
- DepartmentManagement | admin feature | Department CRUD (soft-delete) via Supabase + React Query cache invalidation.
- ResourceManagement | admin feature | Hospital resource inventory/status management with filters and mutations.
- SystemConfiguration | admin feature | Reads/writes hospital JSON settings (holidays, hours, thresholds, fees).
- SkipNavigation | accessibility component | Keyboard skip links to main/section content.
- LiveRegion | accessibility component | ARIA live status announcer with timed message clearing.
- ErrorBoundary | resilience component | In-app crash boundary with sanitized logging, Sentry, correlation IDs.

## Edges
- main entrypoint | renders | RootErrorBoundary
- RootErrorBoundary | wraps | App
- main entrypoint | initializes | Sentry monitoring
- main entrypoint | initializes | web-vitals tracking
- main entrypoint | registers | GlobalUnhandledHandlers
- App | invokes on mount | BootstrapOrchestrator
- BootstrapOrchestrator | initializes first | LoggerSetup
- BootstrapOrchestrator | initializes | TelemetrySetup
- BootstrapOrchestrator | initializes | error tracking setup
- BootstrapOrchestrator | initializes | MetricsSetup
- BootstrapOrchestrator | registers | request correlation interceptors
- App | provides | QueryClient
- App | provides | Auth context
- App | provides | Theme context
- App | provides | Testing context
- App | mounts | Browser router
- Browser router | wraps | RouteAwareErrorBoundary
- RouteAwareErrorBoundary | renders | ErrorBoundary
- ErrorBoundary | captures to | Sentry captureError
- ErrorBoundary | captures to | errorTracking captureException
- ErrorBoundary | includes | correlation ID in diagnostics
- AppContent | activates | performance monitoring hook
- AppContent | activates | amendment alert hook
- AppRoutes | renders | route definition groups
- AdminDashboard | authorizes via | AdminRBACManager
- AdminDashboard | consumes | useAdminDashboardMetrics hook
- AdminDashboard | consumes | useAdminUserManagement hook
- AdminDashboard | embeds settings tab | SystemConfiguration
- AdminDashboard | defines local version of | MetricCard
- AdminDashboardLayout | embeds | SkipNavigation
- AdminDashboardLayout | drives nav using | activeSection + navItems
- SharedMetricCard | uses | micro-interaction HoverCard
- SharedMetricCard | uses | framer-motion reduced-motion aware animation
- AuditTrailDashboard | queries | Supabase activity_logs by hospital_id
- SystemMonitoringDashboard | consumes | useSystemMonitoring hook
- ComprehensiveSystemDashboard | aggregates in parallel | performanceOptimization + automationScaling + continuousImprovement + enterpriseScaling
- UserManagement | authorizes actions via | AdminRBACManager permissions
- UserManagement | executes mutations through | useAdminUserManagement
- DepartmentManagement | queries/mutates | Supabase departments table
- DepartmentManagement | invalidates | React Query departments cache
- ResourceManagement | queries/mutates | Supabase hospital_resources table
- ResourceManagement | invalidates | React Query hospital-resources cache
- SystemConfiguration | reads/writes | hospitals.settings JSON blob
- LiveRegion | exposes | ARIA status announcements

## Risks
- Duplicate metric-card patterns can drift between shared and admin-specific implementations.
- Multiple error reporting layers can produce duplicate incidents.
- Any-casts around Supabase settings/resources can hide schema regressions.
- Async dashboard effects without cancellation can create stale update paths.
- Admin flows may expose sensitive data if policy checks are incomplete.

## Suggested Questions
- How are user-management mutations authorized and audited server-side?
- Where are enterprise metric services implemented and contract-validated?
- Which mutation paths enforce sanitization and HIPAA-safe logging?
- How is correlation ID propagated end-to-end across API and telemetry?
- Are route guards and AdminRBACManager semantics fully aligned?
