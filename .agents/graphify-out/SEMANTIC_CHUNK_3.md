# Semantic Extraction: Chunk 3 (Workflows, Labs, Patients)

## Semantic Nodes

- **EnhancedTaskManagement** | Component | 8 task templates + filter/sort UI (follow-up, lab review, med review, referral, vitals, education, rx renewal, chronic care)
- **TaskTemplate** | Data Model | Reusable task with priority, type, description
- **PatientJourneyTracker** | Component | Timeline of patient workflow state + amendments
- **WorkflowRulesEngine** | Logic | Conditional task routing & escalation rules
- **RoleHandoffStatusPanel** | Component | Multi-role hand-off coordination display
- **LabOrderForm** | Component | Requisition form with test category, priority, sample type
- **LabResultsViewer** | Component | Result display + interpretation UI
- **LabTestCatalog** | Data | Searchable test list (9 categories, 8 sample types)
- **LabPriorityEscalation** | Logic | Route critical lab results via notification engine
- **PatientLifecycleState** | State Machine | Admission → Active → Discharge workflow
- **TaskAssignmentRules** | Logic | ABAC-based task distribution by role
- **WorkflowMetricsDashboard** | Component | Real-time task completion KPIs

## Semantic Edges

1. EnhancedTaskManagement → taskTemplates (load 8 predefined)
2. EnhancedTaskManagement → [priorityFilter, statusFilter, sortBy] (reactive state)
3. WorkflowRulesEngine → RoleHandoffStatusPanel (trigger hand-off)
4. WorkflowRulesEngine → TaskAssignmentRules (apply routing)
5. LabOrderForm → CreateLabOrderModal (nested)
6. LabOrderForm → useFeatureFlags.lab_flow_v2 (feature gate)
7. LabResultsViewer → CriticalValueAlert (auto-escalate critical)
8. LabTestCatalog → TEST_CATEGORIES + SAMPLE_TYPES (enums)
9. LabPriorityEscalation → NotificationEngine (emit alert)
10. PatientJourneyTracker → TaskTemplate.task_type (state machine)
11. PatientLifecycleState → RoleHandoffStatusPanel (state transitions)
12. WorkflowMetricsDashboard → useWorkflowMetrics (fetch)

## Architecture Risks

1. **Task template non-scoping**: 8 hardcoded templates in component are not hospital-scoped; multi-tenant scenario could leak workflow design across hospitals.
2. **Lab escalation out-of-order**: CriticalValueAlert fires before audit trail writes; forensic review may show events in wrong sequence.
3. **State machine ambiguity**: No explicit transition validators; manual Supabase edits to `task_status` could cause UI state mismatch.

## Deep-Dive Questions

1. When a lab result transitions PENDING → CRITICAL, does CriticalValueAlert re-notify oncall staff, or de-duplicate if they got the order notification?
2. How do WorkflowRulesEngine and TaskAssignmentRules resolve conflicts if multiple roles are eligible for one task?
3. What prevents discharge while workflow tasks are still PENDING?
