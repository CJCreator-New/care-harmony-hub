# 09: S2-02 delete duplicates, dead code and in-app QA tooling

Status: ready-for-human

Branch: `worktree-agent-a0c5baa19a5224113` (not pushed, `main` untouched).
Base: `a0371b6`. Commits (oldest first):

| Commit | Change |
|---|---|
| `8322519` | Delete 124 unreachable components; drop stale tsconfig excludes |
| `84e5996` | Delete 9 unrouted pages and 9 QA / code-review tooling files; add `node` to tsconfig `types` |
| `e4c3d29` | Delete 72 dead duplicate hooks (src/hooks, src/lib/hooks) |
| `d45d228` | Delete 8 unreachable services |
| `58aa72e` | Delete 46 unreachable utils |
| `62d12c4` | Delete unreachable lib and example-module files (21 removed; `constants.ts` restored later) |
| `1d73425` | Delete 7 unreachable type modules |
| `b1d020b` | Delete 41 test files that only exercised deleted code |
| `b645892` | Restore `src/lib/constants.ts` (asserted by a perf test); point two HIPAA checks at live files |

Totals: 295 src files and 41 test files deleted; 84,467 lines removed in the diff against `a0371b6`
(net of the restored constants file).

## Method

1. Import graph from `src/main.tsx` (static, `import()`, `require`, `vi.mock`, `@/` and relative specifiers).
   Result: 1064 src files before, 76 non-test files unreachable after (from 371).
2. Each candidate confirmed by the importer list; dynamic imports and `lazy()` are covered by the same scan.
3. Files kept by ownership rules or by a retained importer are listed below.
4. Tests scanned for imports, `vi.mock` targets, and `fs` reads of deleted paths.

## Deleted files by group

### Components (124)
- `src/components/accessibility/LiveRegion.tsx`
- `src/components/admin/AdminDashboard.tsx`
- `src/components/admin/AdminDashboardLayout.tsx`
- `src/components/admin/AdvancedAnalyticsDashboard.tsx`
- `src/components/admin/AuditLogViewer.tsx`
- `src/components/admin/AuditTrailDashboard.tsx`
- `src/components/admin/BlockchainAuditViewer.tsx`
- `src/components/admin/BusinessIntelligenceDashboard.tsx`
- `src/components/admin/DataProtectionDemo.tsx`
- `src/components/admin/IntegrationDashboard.tsx`
- `src/components/admin/IntelligentTaskAssignmentDemo.tsx`
- `src/components/admin/MetricCard.tsx`
- `src/components/admin/SystemConfiguration.tsx`
- `src/components/admin/UserManagement.tsx`
- `src/components/admin/UserManagementTable.tsx`
- `src/components/ai/AIClinicalDashboard.tsx`
- `src/components/analytics/PopulationHealthDashboard.tsx`
- `src/components/analytics/PredictiveAnalyticsDashboard.tsx`
- `src/components/analytics/QualityMeasuresDashboard.tsx`
- `src/components/appointments/MultiResourceScheduler.tsx`
- `src/components/appointments/RecurringAppointmentModal.tsx`
- `src/components/appointments/WaitlistManagementCard.tsx`
- `src/components/audit/AuditAlertToast.tsx`
- `src/components/charts/LazyChart.tsx`
- `src/components/charts/RechartsBundle.tsx`
- `src/components/checklists/AutomatedChecklist.tsx`
- `src/components/clinical/PredictiveAnalyticsPanel.tsx`
- `src/components/consent/ConsentForm.tsx`
- `src/components/consultations/QuickOrderTemplates.tsx`
- `src/components/consultations/steps/DiagnosisStep.tsx`
- `src/components/consultations/steps/ReviewOfSystemsStep.tsx`
- `src/components/discharge/DischargeWorkflowCard.tsx`
- `src/components/doctor/AIClinicalAssistant.tsx`
- `src/components/doctor/AIClinicalSupportDashboard.tsx`
- `src/components/doctor/ClinicalDecisionSupportPanel.tsx`
- `src/components/doctor/EnhancedPrescriptionForm.tsx`
- `src/components/doctor/LabResultsViewer.tsx`
- `src/components/doctor/MLPredictionDashboard.tsx`
- `src/components/doctor/PatientChart.tsx`
- `src/components/doctor/PeerBenchmarkingDashboard.tsx`
- `src/components/doctor/PrescriptionBuilder.tsx`
- `src/components/features/appointment-recurrence/AppointmentRecurrenceModal.tsx`
- `src/components/features/appointment-recurrence/useRecurringAppointments.ts`
- `src/components/features/appointments/AppointmentRecurrenceSettings.tsx`
- `src/components/features/appointments/RecurrenceExceptionManager.tsx`
- `src/components/features/appointments/RecurrencePatternSelector.tsx`
- `src/components/features/billing/BillingDashboard.tsx`
- `src/components/features/billing/BillingInvoiceGenerator.tsx`
- `src/components/features/billing/InsuranceClaimUI.tsx`
- `src/components/features/clinical-notes/ClinicalNotesEditor.tsx`
- `src/components/features/telehealth/TelehealthPrescriptionIssuance.tsx`
- `src/components/features/telehealth/TelehealthSessionUI.tsx`
- `src/components/forms/StandardizedFormField.tsx`
- `src/components/integration/InterRoleCommunicationHub.tsx`
- `src/components/integration/RealTimeCommunicationHub.tsx`
- `src/components/integration/RealTimeStatusBoard.tsx`
- `src/components/integration/TaskAssignmentSystem.tsx`
- `src/components/inventory/LowStockAlert.tsx`
- `src/components/laboratory/CriticalResultNotification.tsx`
- `src/components/laboratory/CriticalValueAlert.tsx`
- `src/components/laboratory/EnhancedLabOrderForm.tsx`
- `src/components/laboratory/LabResultEntryModal.tsx`
- `src/components/laboratory/LabTrendVisualization.tsx`
- `src/components/laboratory/LOINCSearch.tsx`
- `src/components/laboratory/SampleCollectionModal.tsx`
- `src/components/LazyComponents.tsx`
- `src/components/mobile/MobileLayout.tsx`
- `src/components/NavLink.tsx`
- `src/components/notifications/NotificationCenter.tsx`
- `src/components/patient/AfterVisitSummaryGenerator.tsx`
- `src/components/patient/AppointmentScheduler.tsx`
- `src/components/patient/DigitalCheckinWorkflow.tsx`
- `src/components/patient/HealthTimeline.tsx`
- `src/components/patient/PatientBilling.tsx`
- `src/components/patient/PatientBillingAccess.tsx`
- `src/components/patient/PatientDashboard.tsx`
- `src/components/patient/PatientQueryParser.tsx`
- `src/components/patient/PrescriptionRefillModal.tsx`
- `src/components/patient/ResponseGenerator.tsx`
- `src/components/patient/ScheduleAppointmentModal.tsx`
- `src/components/patient/SecureMessaging.tsx`
- `src/components/patient/TestResultsViewer.tsx`
- `src/components/patients/PatientRegistrationModal.STANDARDIZED.tsx`
- `src/components/pharmacist/PatientCounseling.tsx`
- `src/components/pharmacy/DispensingWorkstation.tsx`
- `src/components/pharmacy/DrugInteractionAlert.tsx`
- `src/components/pharmacy/EnhancedPrescriptionQueue.tsx`
- `src/components/pharmacy/InteractionChecker.tsx`
- `src/components/prescription/DrugInteractionWarning.tsx`
- `src/components/prescription/PrescriptionConflictDialog.tsx`
- `src/components/prescriptions/DoseAdjustmentCalculator.tsx`
- `src/components/prescriptions/PediatricDosingCard.tsx`
- `src/components/prescriptions/PregnancyLactationWarnings.tsx`
- `src/components/prescriptions/TherapeuticDuplicationAlert.tsx`
- `src/components/receptionist/EnhancedPatientRegistrationForm.tsx`
- `src/components/receptionist/InsurancePanel.tsx`
- `src/components/receptionist/InsuranceVerificationCard.tsx`
- `src/components/receptionist/MultilingualSupport.tsx`
- `src/components/telemedicine/VideoConsultation.tsx`
- `src/components/templates/DocumentationTemplates.tsx`
- `src/components/ui/aspect-ratio.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/carousel.tsx`
- `src/components/ui/chart.tsx`
- `src/components/ui/command.tsx`
- `src/components/ui/context-menu.tsx`
- `src/components/ui/drawer.tsx`
- `src/components/ui/error-state.tsx`
- `src/components/ui/focus-ring.tsx`
- `src/components/ui/hero.tsx`
- `src/components/ui/hover-card.tsx`
- `src/components/ui/icon.tsx`
- `src/components/ui/input-otp.tsx`
- `src/components/ui/menubar.tsx`
- `src/components/ui/optimized-image.tsx`
- `src/components/ui/resizable.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/toggle-group.tsx`
- `src/components/ui/toggle.tsx`
- `src/components/ui/use-toast.ts`
- `src/components/user/DeviceManagement.tsx`
- `src/components/workflow/CommunicationHub.tsx`
- `src/components/workflow/PatientJourneyTracker.tsx`
- `src/utils/bundleOptimization.ts`

### Pages (9) and QA / code-review tooling (9)
- `src/pages/audit/AuditDashboard.tsx`
- `src/pages/dashboard/LabTATDashboard.tsx`
- `src/pages/dashboard/PharmacyInventoryDashboard.tsx`
- `src/pages/dashboard/WardCensusDashboard.tsx`
- `src/pages/Index.tsx`
- `src/pages/messaging/LabTechMessagesPage.tsx`
- `src/pages/messaging/NurseMessagesPage.tsx`
- `src/pages/messaging/PharmacistMessagesPage.tsx`
- `src/pages/messaging/ReceptionistMessagesPage.tsx`

QA / code-review:
- `src/components/dev/RoleSwitcher.tsx`
- `src/components/testing/UATDashboard.tsx`
- `src/pages/settings/CodeReviewDashboard.tsx`
- `src/testing/UATTestRunner.ts`
- `src/types/code-review.ts`
- `src/utils/codeReviewer.ts`
- `src/utils/codeReviewerCLI.ts`
- `src/utils/codeReviewerIntegration.ts`
- `src/utils/codeReviewerRules.ts`

### Duplicate hook trees (72)
- `src/hooks/use-mobile.tsx`
- `src/hooks/useAdminDashboardMetrics.ts`
- `src/hooks/useAdminUserManagement.ts`
- `src/hooks/useAdmissionMedicationReconciliation.ts`
- `src/hooks/useAdvancedAnalytics.ts`
- `src/hooks/useAITriage.ts`
- `src/hooks/useAnalytics.ts`
- `src/hooks/useAppointmentRequests.ts`
- `src/hooks/useAppointments.ts`
- `src/hooks/useAutomatedCareCoordination.ts`
- `src/hooks/useAutomatedResponse.ts`
- `src/hooks/useAutomatedTaskRouter.ts`
- `src/hooks/useBackgroundSync.ts`
- `src/hooks/useBillingValidation.ts`
- `src/hooks/useBreakGlassOverride.ts`
- `src/hooks/useCareGaps.ts`
- `src/hooks/useClinicalPredictiveAnalytics.ts`
- `src/hooks/useClinicalValidation.ts`
- `src/hooks/useConsolidatedSubscription.ts`
- `src/hooks/useDashboardMetrics.ts`
- `src/hooks/useDataValidation.ts`
- `src/hooks/useDoctorAvailability.ts`
- `src/hooks/useDoctorClinical.ts`
- `src/hooks/useDrugInteractions.ts`
- `src/hooks/useEdgeCaseResilience.ts`
- `src/hooks/useEnhancedNotifications.ts`
- `src/hooks/useEscalationRules.ts`
- `src/hooks/useFHIRIntegration.ts`
- `src/hooks/useFormField.ts`
- `src/hooks/useInsuranceEligibility.ts`
- `src/hooks/useIntegration.ts`
- `src/hooks/useIntelligentTaskRouter.ts`
- `src/hooks/useLabCriticalAlerts.ts`
- `src/hooks/useLaboratory.ts`
- `src/hooks/useLabTechOperations.ts`
- `src/hooks/useLegalHold.ts`
- `src/hooks/useLoincCodes.ts`
- `src/hooks/useMedicationAlerts.ts`
- `src/hooks/useMedicationReconciliation.ts`
- `src/hooks/useMedications.ts`
- `src/hooks/useMobileWorkflow.ts`
- `src/hooks/useNotifications.ts`
- `src/hooks/useNotificationTriggers.ts`
- `src/hooks/useNurseClinical.ts`
- `src/hooks/useOfflineErrorRecovery.ts`
- `src/hooks/useOperationalKpis.ts`
- `src/hooks/useOptimisticMutation.ts`
- `src/hooks/usePatientIdentity.ts`
- `src/hooks/usePatientPortal.ts`
- `src/hooks/usePatientPortalQueries.ts`
- `src/hooks/usePatientQuery.ts`
- `src/hooks/usePatientsReadyForDoctor.ts`
- `src/hooks/usePharmacistOperations.ts`
- `src/hooks/usePharmacy.ts`
- `src/hooks/usePredictiveAnalytics.ts`
- `src/hooks/usePrescriptionOptimisticLock.ts`
- `src/hooks/usePrescriptions.ts`
- `src/hooks/useProtocolCompliance.ts`
- `src/hooks/useQueuePrediction.ts`
- `src/hooks/useRealTimeNotifications.ts`
- `src/hooks/useRealtimeSubscriptions.ts`
- `src/hooks/useReceptionistOperations.ts`
- `src/hooks/useScheduling.ts`
- `src/hooks/useSessionStorageForm.ts`
- `src/hooks/useSessionTimeout.ts`
- `src/hooks/useSmartScheduling.ts`
- `src/hooks/useStorageOptimization.ts`
- `src/hooks/useTaskAssignments.ts`
- `src/hooks/useTelemedicine.ts`
- `src/hooks/useTriageAssessments.ts`
- `src/hooks/useWorkflowNotifications.ts`
- `src/lib/hooks/useFormStandardized.ts`

### Services (8)
- `src/services/advancedAnalytics.ts`
- `src/services/blockchainAuditService.ts`
- `src/services/clinicalDecisionSupport.ts`
- `src/services/machineLearningService.ts`
- `src/services/messagingService.ts`
- `src/services/populationHealthService.ts`
- `src/services/unifiedRecordService.ts`
- `src/services/workflowOrchestration.ts`

### Utils (46)
- `src/utils/adminUserManagementService.ts`
- `src/utils/advancedAIDiagnosticsService.ts`
- `src/utils/advancedSearch.ts`
- `src/utils/altText.ts`
- `src/utils/analytics.ts`
- `src/utils/analyticsEngine.ts`
- `src/utils/apiClient.ts`
- `src/utils/ariaLabels.ts`
- `src/utils/auditLogger.ts`
- `src/utils/billingValidator.ts`
- `src/utils/cache.ts`
- `src/utils/cacheInvalidation.ts`
- `src/utils/cacheStrategy.ts`
- `src/utils/clinicalNoteService.ts`
- `src/utils/consultationTransformers.ts`
- `src/utils/dataIntegration.ts`
- `src/utils/doctorClinicalService.ts`
- `src/utils/edgeCaseResilience.ts`
- `src/utils/indexedDBCache.ts`
- `src/utils/labTechAdvancedAIService.ts`
- `src/utils/labTechOperationsService.ts`
- `src/utils/notification.ts`
- `src/utils/notificationManager.ts`
- `src/utils/nurseClinicalService.ts`
- `src/utils/nurseWearableIntegrationService.ts`
- `src/utils/paymentService.ts`
- `src/utils/pdfGenerator.ts`
- `src/utils/pediatricDosingEngine.ts`
- `src/utils/pharmacistRoboticDispensingService.ts`
- `src/utils/queueUtils.ts`
- `src/utils/rateLimiter.ts`
- `src/utils/rateLimiting.ts`
- `src/utils/rateLimitManager.ts`
- `src/utils/realtimeCommunication.ts`
- `src/utils/receptionistAISchedulingService.ts`
- `src/utils/receptionistOperationsService.ts`
- `src/utils/reportingEngine.ts`
- `src/utils/requestValidator.ts`
- `src/utils/rlsAuditor.ts`
- `src/utils/securityHardening.ts`
- `src/utils/serviceWorkerCache.ts`
- `src/utils/validation.ts`
- `src/utils/validationEngine.ts`
- `src/utils/voiceToText.ts`
- `src/utils/wardManagementService.ts`
- `src/utils/webhookService.ts`

### Lib, example module (20 net; 21 removed in 62d12c4, constants.ts restored in b645892)
- `src/lib/billing.calculator.ts`
- `src/lib/clinical-notes.manager.ts`
- `src/lib/edi837.builder.ts`
- `src/lib/encryption.utils.ts`
- `src/lib/errorHandling.ts`
- `src/lib/patient/AutomatedResponseService.ts`
- `src/lib/prescription-refill.manager.ts`
- `src/lib/recurrence.utils.ts`
- `src/lib/schemas/formValidation.ts`
- `src/lib/schemas/labOrderSchema.ts`
- `src/lib/schemas/patientRegistrationSchema.ts`
- `src/lib/schemas/prescriptionSchema.ts`
- `src/lib/telehealth.provider.ts`
- `src/lib/type-safety.ts`
- `src/lib/workflow-validator.ts`
- `src/lib/workflow/breakglassOverride.ts`
- `src/lib/workflow/contracts.ts`
- `src/lib/workflow/queueTransitions.ts`
- `src/modules/example/index.ts`
- `src/modules/example/lib/impl.ts`

### Types (7)
- `src/types/analytics.ts`
- `src/types/audit.ts`
- `src/types/clinical.ts`
- `src/types/enhancement.ts`
- `src/types/integration.ts`
- `src/types/laboratory.ts`
- `src/types/workflow-optimization.ts`

### Tests deleted (41; each tested only deleted code)
- `src/e2e.test.ts`
- `src/hooks/__tests__/useLegalHold.test.ts`
- `src/integration.test.ts`
- `src/modules/example/tests/example.test.ts`
- `src/test/components/prescriptions/PediatricDosingCard.test.tsx`
- `src/test/form-validation.test.ts`
- `src/test/hp3-error-handling.test.tsx`
- `src/test/utils/pediatricDosingEngine.test.ts`
- `src/utilities.test.ts`
- `tests/clinical/pediatric-dosing.test.ts`
- `tests/labOrderFormValidation.test.ts`
- `tests/patientRegistrationFormValidation.test.ts`
- `tests/prescriptionFormValidation.test.ts`
- `tests/unit/auditContext.test.ts`
- `tests/unit/breakGlassOverride.test.ts`
- `tests/unit/dashboard-metrics.test.ts`
- `tests/unit/feature1-recurrence.test.ts`
- `tests/unit/feature4-billing.test.ts`
- `tests/unit/feature5-clinical-notes.test.ts`
- `tests/unit/queueUtilsModule.test.ts`
- `src/test/lab-operations.test.ts`
- `tests/clinical/clinical-decision-support.test.ts`
- `tests/integration/PrescriptionBuilder.integration.test.tsx`
- `tests/unit/PrescriptionBuilder.test.tsx`
- `tests/unit/feature6-workflow-validator.test.ts`
- `src/test/billing-operations.test.ts`
- `src/test/clinical-notes-operations.test.ts`
- `tests/unit/feature1-recurrence-ui.test.tsx`
- `src/test/hooks/useDrugInteractions.test.tsx`
- `src/test/hooks/useLaboratory.test.tsx`
- `src/test/hooks/useNotifications.test.tsx`
- `src/test/ward-management-operations.test.ts`
- `tests/unit/optimistic-locking.test.tsx`
- `tests/unit/useScheduling.test.tsx`
- `src/components/audit/AuditAlertToast.test.tsx`
- `tests/clinical/fail-closed-ddi.test.ts`
- `tests/unit/consultationTransformers.test.ts`
- `tests/unit/drug-interactions.test.tsx`
- `tests/unit/useLaboratory.test.tsx`
- `tests/unit/useNotifications.test.tsx`
- `tests/unit/usePharmacy.test.tsx`

## Skipped candidates (not deleted)

Kept because of ownership (restricted directories, RBAC, telemetry/observability) or because a kept file imports them:

- `src/components/admin/ComprehensiveSystemDashboard.tsx`: telemetry/observability (ownership)
- `src/components/admin/IoTMonitoringPanel.tsx`: telemetry/observability (ownership)
- `src/components/admin/RealTimeMonitoringDashboard.tsx`: telemetry/observability (ownership)
- `src/components/admin/SecurityMonitoringDashboard.tsx`: telemetry/observability (ownership)
- `src/components/admin/SystemMonitoringDashboard.tsx`: telemetry/observability (ownership)
- `src/components/billing/EnhancedBillingQueue.tsx`: restricted (ownership)
- `src/components/common/ErrorBoundary.tsx`: telemetry/observability (ownership)
- `src/components/dashboard/UnifiedDashboard.tsx`: restricted (ownership)
- `src/components/EnhancedErrorBoundary.tsx`: telemetry/observability (ownership)
- `src/components/errors/AIErrorBoundary.tsx`: telemetry/observability (ownership)
- `src/components/errors/ChartErrorBoundary.tsx`: telemetry/observability (ownership)
- `src/components/lab/BarcodeSampleScanner.tsx`: restricted (ownership)
- `src/components/lab/EnhancedLabOrderQueue.tsx`: restricted (ownership)
- `src/components/lab/EquipmentManagement.tsx`: restricted (ownership)
- `src/components/lab/QCDashboard.tsx`: restricted (ownership)
- `src/components/labs/LabResultNotificationCard.tsx`: restricted (ownership)
- `src/components/monitoring/ErrorTrackingDashboard.tsx`: telemetry/observability (ownership)
- `src/components/monitoring/LoggingDashboard.tsx`: telemetry/observability (ownership)
- `src/components/monitoring/PerformanceDashboard.tsx`: telemetry/observability (ownership)
- `src/components/monitoring/PerformanceOptimizationDashboard.tsx`: telemetry/observability (ownership)
- `src/components/nurse/AITriageAssistant.tsx`: restricted (ownership)
- `src/components/nurse/AssignmentBoard.tsx`: restricted (ownership)
- `src/components/nurse/EnhancedTriagePanel.tsx`: restricted (ownership)
- `src/components/nurse/HandoffPanel.tsx`: restricted (ownership)
- `src/components/nurse/HandoverReport.tsx`: restricted (ownership)
- `src/components/nurse/MARComponent.tsx`: restricted (ownership)
- `src/components/nurse/MARViewer.tsx`: restricted (ownership)
- `src/components/nurse/QueuePositionDisplay.tsx`: restricted (ownership)
- `src/components/nurse/SmartCareProtocols.tsx`: restricted (ownership)
- `src/components/nurse/UnifiedPatientPrepPanel.tsx`: restricted (ownership)
- `src/components/nurse/VitalSignsForm.tsx`: restricted (ownership)
- `src/components/nurse/WearableIntegration.tsx`: restricted (ownership)
- `src/config/clinicalSLOs.ts`: observability configuration (SLO definitions), kept per telemetry ownership
- `src/hooks/useCPTCodeSuggestion.ts`: imported by kept src/components/billing/EnhancedBillingQueue.tsx
- `src/hooks/useCriticalValueAlerts.ts`: imported by kept src/components/lab/EnhancedLabOrderQueue.tsx
- `src/hooks/useErrorTracking.ts`: telemetry/observability (ownership)
- `src/hooks/useHealthCheck.ts`: telemetry/observability (ownership)
- `src/hooks/useLabNotifications.ts`: imported by kept src/components/labs/LabResultNotificationCard.tsx
- `src/hooks/usePatients.ts`: kept: imported by a retained test (RBAC parity / CreateLabOrderModal)
- `src/hooks/usePerformanceSafety.ts`: telemetry/observability (ownership)
- `src/hooks/usePermissionAudit.ts`: restricted (ownership)
- `src/hooks/usePredictiveMaintenance.ts`: imported by kept src/components/lab/EquipmentManagement.tsx
- `src/hooks/useTelemetry.ts`: telemetry/observability (ownership)
- `src/integrations/supabase/__mocks__/client.ts`: build/test infrastructure
- `src/integrations/supabase/query-helper.ts`: build/test infrastructure
- `src/lib/constants.ts`: restored in b645892: tests/performance PERF-RENDER-005 asserts it exists
- `src/lib/monitoring/analytics.ts`: telemetry/observability (ownership)
- `src/lib/monitoring/ErrorBoundary.tsx`: telemetry/observability (ownership)
- `src/lib/performance/cache-manager.ts`: telemetry/observability (ownership)
- `src/lib/security/headers.ts`: restricted (ownership)
- `src/lib/security/rate-limiter.ts`: restricted (ownership)
- `src/lib/security/sanitization.ts`: restricted (ownership)
- `src/services/aiTriageService.ts`: imported by kept src/components/nurse/AITriageAssistant.tsx
- `src/services/automationScaling.ts`: imported by kept src/components/admin/ComprehensiveSystemDashboard.tsx
- `src/services/continuousImprovement.ts`: imported by kept src/components/admin/ComprehensiveSystemDashboard.tsx
- `src/services/enterpriseScaling.ts`: imported by kept src/components/admin/ComprehensiveSystemDashboard.tsx
- `src/services/health-check.ts`: telemetry/observability (ownership)
- `src/services/iotIntegration.ts`: imported by kept src/components/admin/IoTMonitoringPanel.tsx
- `src/services/performanceOptimization.ts`: imported by kept src/components/admin/ComprehensiveSystemDashboard.tsx
- `src/services/unifiedAuthService.ts`: kept: imported by a retained test (RBAC parity / CreateLabOrderModal)
- `src/types/labtech.ts`: imported by kept src/utils/labTechRBACManager.ts
- `src/types/nurse.ts`: imported by kept src/utils/nurseRBACManager.ts
- `src/types/receptionist.ts`: imported by kept src/utils/receptionistRBACManager.ts
- `src/utils/abacManager.ts`: restricted (ownership)
- `src/utils/intrusionDetection.ts`: imported by kept src/utils/securityMonitoring.ts
- `src/utils/labTechRBACManager.ts`: restricted (ownership)
- `src/utils/logging.ts`: telemetry/observability (ownership)
- `src/utils/nurseRBACManager.ts`: restricted (ownership)
- `src/utils/patientRBACManager.ts`: restricted (ownership)
- `src/utils/performanceMonitoring.ts`: telemetry/observability (ownership)
- `src/utils/performanceSafety.ts`: telemetry/observability (ownership)
- `src/utils/receptionistRBACManager.ts`: restricted (ownership)
- `src/utils/securityMonitor.ts`: telemetry/observability (ownership)
- `src/utils/securityMonitoring.ts`: telemetry/observability (ownership)
- `src/utils/securityWorkerManager.ts`: telemetry/observability (ownership)
- `src/workers/securityAnalysis.worker.ts`: imported by kept src/utils/securityWorkerManager.ts

Additional roadmap items not done in this session:
- `TestingProvider` / `TestingContext` and the `/testing` route: `src/App.tsx` wraps all routes with the provider and `src/routes/routeDefinitions.tsx` (restricted) registers `/testing`. `TestingDashboardPage` is live, so it stays until the route is removed.
- Mock-auth branches (`AuthContext` E2E path, `LoginPage` literal password, UX-15 / SECF-22): need a test-only entry point; not changed here.
- Dependency manifest and lockfiles (ARCH-13: test libs in `dependencies`, unused SDKs, `bun.lock` vs `package-lock.json`): not changed.
- Two live hook trees: the reachable `src/hooks` files remain alongside `src/lib/hooks` (the dead twins are gone); consolidation belongs to S2-03.
- Post-change state: 76 unreachable non-test src files (15.1k LOC), all listed above; the roadmap target (under 5% of src) is not met.

## Config changes

- `tsconfig.app.json`: removed exclude entries for deleted files and the `features/*` wildcards; added `"node"` to `types`
  because the deleted QA modules were the only thing bringing `@types/node` globals (`process`, `NodeJS`) into the app program
  and live files use them.

## Test changes

- Deleted 41 tests (listed above). Includes the three ADR-0005 fail-closed suites that ARCH-07 names
  (`tests/clinical/fail-closed-ddi.test.ts`, `pediatric-dosing.test.ts`, `clinical-decision-support.test.ts`).
  They only covered dead code; live coverage of order-safety is unaffected.
- Retained (not deleted) tests that touch a kept dead file: `tests/rbac/cross-system-parity.test.ts`,
  `tests/security/rbac-unification.test.ts` (RBAC parity, imports `unifiedAuthService`);
  `tests/unit/CreateLabOrderModal.test.tsx`, `tests/integration/CreateLabOrderModal.integration.test.tsx` (import `usePatients`).
- `tests/security/hipaa-compliance.test.ts`: two `readFileSync` targets retargeted from deleted files to the live
  `src/lib/hooks/auth/useSessionTimeout.ts` and `src/hooks/useActivityLog.ts`; assertions unchanged.

## Verification

| Check | Result |
|---|---|
| `npm run type-check` | exit 0 after every commit and on the final tree |
| `npm run lint:boundaries` | exit 0 (205 modules, 719 dependencies) |
| `VITE_SUPABASE_URL=https://stub.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=stub npm run build` | exit 0 |
| `npx vitest run --exclude '.claude/**'` baseline (a0371b6) | 48 failing suites, 39 failing tests, 4059 passing (4127 total) |
| vitest after deletions (before fix commit) | 50 failing suites, 42 failing tests, 3407 passing (3477 total) |
| New failures in that run | `tests/performance/frontend-performance.test.ts` (PERF-RENDER-005 needed `src/lib/constants.ts`); `tests/security/hipaa-compliance.test.ts` (two reads of deleted files) |
| After fix commit `b645892` | both suites re-run: 2 files, 41 tests, all passing |

The full vitest suite was run once before the `b645892` fix; the two affected suites were re-run after it. No other
suite reads or imports the restored file or the retargeted paths. The baseline failing-suite list is in the scratchpad.
