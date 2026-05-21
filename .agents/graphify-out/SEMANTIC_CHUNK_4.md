# Semantic Extraction: Chunk 4 (Services, Hooks)

## Semantic Nodes

- **usePermissions** | Hook | Memoized RBAC checker; returns `can()`, `canAny()`, `canAll()` + role-specific flags
- **useBilling** | Hook | TanStack Query invoice/payment fetcher with rate-limit backoff
- **usePatients** | Hook | Paginated patient list with HIPAA PHI decryption + encryption metadata validation
- **useAdminDashboardMetrics** | Hook | Real-time metrics: activeUsers, beds, revenue, satisfaction (polls every 30s)
- **useAuditTrail** | Hook | Amendment chain fetcher (prescription/lab/appointment) with RPC routing
- **usePermissionAudit** | Hook | Event logger for permission denial events
- **advancedAnalytics** | Service | Throughput, wait time, occupancy, benchmark analytics
- **unifiedRecordService** | Service | Aggregates patient demographics, history, meds, vitals, results, consultations
- **fhirInteroperability** | Service | Export/import FHIR (Patient, Observation, MedicationRequest)
- **RateLimitBackoff** | Utility | Exponential backoff on 429 with toast retry feedback
- **HIPAADecryption** | Pattern | Decrypt PHI with metadata validation; degrade to `[Encrypted]` on failure
- **PermissionMemoization** | Pattern | useMemo-cached permission sets per role

## Semantic Edges

1. usePermissions → getEffectivePermissions (compute aggregated)
2. usePermissions → hasPermissionForAnyRole (multi-role check)
3. usePermissions → getDevTestRole (test override)
4. useBilling → useWorkflowOrchestrator (emit WORKFLOW_EVENT_TYPES)
5. useBilling → executeWithRateLimitBackoff (handle 429)
6. useBilling → supabase.from('invoices') (Postgrest)
7. usePatients → decryptPHI (decrypt phone, email, address, contact, insurance)
8. usePatients → PATIENT_COLUMNS.list (select safe subset)
9. usePatients → encryption_metadata (validate decrypt)
10. useAdminDashboardMetrics → parallel queries (profiles, beds, consultations, bills)
11. useAuditTrail → getRpcFunction (map type → RPC name)
12. useAuditTrail → supabase.rpc('get_prescription_amendment_chain')
13. usePermissionAudit → logActivity (persist denial)
14. advancedAnalytics → supabase.from('patients').gte('created_at', past 24h)
15. unifiedRecordService → supabase.rpc('sync_patient_data')
16. fhirInteroperability → exportToFHIR (map patient → FHIR Patient)
17. fhirInteroperability → importFromFHIR (parse FHIR → insert)

## Architecture Risks

1. **Decryption failure cascade**: usePatients catches errors, returns `[Encrypted]` placeholders; downstream may not handle partial decryption; key rotation failures silently degrade.
2. **Memoization staleness in usePermissions**: useMemo depends on `primaryRole, persistedTestRole` but test role changes outside hook won't recompute; permission checks may lag.
3. **FHIR export incompleteness**: exportToFHIR('Patient') only maps name, birthDate, gender; missing telecom, address, contact, extensions; importers may reject.

## Deep-Dive Questions

1. Does `executeWithRateLimitBackoff` in useBilling compound with Supabase's native retry logic, risking excessive delays?
2. If decryption fails in usePatients, how does the `[Encrypted]` placeholder propagate to user? (toast, silent, exception)
3. Does unifiedRecordService.syncRecords() auto-re-decrypt, or must caller refetch decryptPHI manually?
