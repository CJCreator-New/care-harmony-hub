# Semantic Extraction: Chunk 5 (Supabase Edge Functions)

## Semantic Nodes

- **AnalyticsEngine** | Function | Handles 4 actions: getKPIs, getFinancialMetrics, getOperationalMetrics, getClinicalMetrics; hospital-scoped
- **AuditLogger** | Function | Handles 3 actions: logAuditEvent, getAuditTrail, searchAuditLogs; logs user, action, resource, details + IP/UA
- **BillingReconciliation** | Function | Matches invoices to services; flags unbilled consultations, overdue balances
- **AuthorizationGate** | Middleware | Role-based access before handler; `authorize(['admin', 'doctor', ...])` 
- **HospitalScopeResolution** | Logic | Extract caller's hospital_id from JWT via profile query
- **RequestValidationPipeline** | Middleware | Zod schema validation with error responses
- **CorsHandler** | Middleware | Preflight OPTIONS + response headers
- **RateLimiter** | Middleware | Action-level request throttling (e.g., 20 req/60s)
- **AuditEventStructure** | Data Model | user_id, action, resource_type, resource_id, details, ip_address, user_agent, session_id
- **FinancialReconciliationLogic** | Logic | Time-window queries + invoice/payment joins + unbilled detection
- **MetricsAggregation** | Logic | Real-time aggregations (count, sum, avg) scoped to hospital
- **ServiceRoleKey** | Config | Server-side Supabase client with SERVICE_ROLE_KEY (full RLS bypass)

## Semantic Edges

1. AnalyticsEngine → authorize(['admin', 'doctor', 'super_admin'])
2. AnalyticsEngine → resolveHospitalId (derive from JWT)
3. AnalyticsEngine → validateRequest (Zod)
4. AnalyticsEngine → switch(action) [getKPIs, getFinancialMetrics, getOperationalMetrics, getClinicalMetrics]
5. AnalyticsEngine → supabase.from('patients').eq('hospital_id', hospitalId)
6. AuditLogger → authorize (8 roles: admin, doctor, nurse, receptionist, pharmacist, lab_tech, accountant, super_admin)
7. AuditLogger → validateRequest (Zod)
8. AuditLogger → logAuditEvent (insert + derive hospital_id)
9. AuditLogger → getAuditTrail (retrieve history)
10. AuditLogger → searchAuditLogs (full-text search)
11. BillingReconciliation → authorize(['admin', 'super_admin'])
12. BillingReconciliation → validateRequest (period_start, period_end as YYYY-MM-DD)
13. BillingReconciliation → supabase.from('invoices').gte('created_at', startTs).lte('created_at', endTs)
14. BillingReconciliation → supabase.from('invoice_payments') (match)
15. BillingReconciliation → supabase.from('consultations') (find unbilled)

## Architecture Risks

1. **Hospital scope bypass**: resolveHospitalId derives hospital from JWT but doesn't verify Supabase RLS policy enforcement; RLS misconfiguration could expose cross-hospital data.
2. **Unbilled service detection lag**: Queries may be stale if consultations insert asynchronously; could double-bill or miss revenue.
3. **Audit event mutability**: AuditLogger stores events in mutable table; if RLS allows admin UPDATE, forensic chain breaks; should use immutable trigger or append-only.

## Deep-Dive Questions

1. After resolveHospitalId succeeds in AnalyticsEngine, does function verify caller's role against hospital's role matrix, or just trust JWT?
2. Does BillingReconciliation account for multi-part billing (consultation + lab + imaging on same invoice)?
3. Does searchAuditLogs use full-text indices, or sequential-scan? At 1M+ events, query performance?
