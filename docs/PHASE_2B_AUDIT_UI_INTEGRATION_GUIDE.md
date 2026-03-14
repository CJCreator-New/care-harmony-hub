/**
 * Phase 2B Audit UI Integration Guide
 * 
 * This guide shows how to integrate audit timeline and alert components
 * into existing workflow pages.
 * 
 * Implementation Steps:
 * 1. Copy relevant sections into the target pages
 * 2. Import required hooks and components
 * 3. Update state management as needed
 * 4. Test with existing audit data from Phase 2A
 * 
 * All integrations are backward-compatible and optional.
 * Components degrade gracefully if audit data is unavailable.
 */

// ===========================================================================
// INTEGRATION 1: PrescriptionDetail.tsx
// ===========================================================================

/**
 * Location: src/pages/patients/PrescriptionDetail.tsx
 * 
 * Add audit timeline below dosage/instruction details showing:
 * "Prescription History (2 amendments)" with click to expand
 */

// Add to imports:
import { AuditTimeline } from '@/components/audit/AuditTimeline';
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';
import { useAmendmentAlerts } from '@/hooks/useAmendmentAlerts';
import { useState } from 'react';

// In the component, where dosage/instruction details are shown:
function PrescriptionDetailPage({ prescriptionId }: { prescriptionId: string }) {
  const { alerts } = useAmendmentAlerts(null); // Will auto-subscribe to changes
  const [showForensicModal, setShowForensicModal] = useState(false);

  // Check if this prescription was recently amended
  const recentAmendment = alerts.find(a => a.recordId === prescriptionId && a.unread);

  return (
    <div>
      {/* Existing dosage/instruction details */}
      <div className="space-y-4">
        {/* ... existing prescription details ... */}

        {/* Real-time Amendment Banner */}
        {recentAmendment && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                ⚠️ Amendment Alert: {recentAmendment.amendedBy.name} updated this prescription
              </p>
              <p className="text-xs text-amber-800 mt-1">{recentAmendment.message}</p>
            </div>
          </div>
        )}

        {/* Audit Timeline Integration */}
        <div className="mt-6">
          <AuditTimeline
            recordId={prescriptionId}
            recordType="prescription"
            maxAmendments={3}
            onViewForensics={() => setShowForensicModal(true)}
          />
        </div>

        {/* Forensic Timeline Modal */}
        {showForensicModal && (
          <Dialog open={showForensicModal} onOpenChange={setShowForensicModal}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <ForensicTimeline prescriptionId={prescriptionId} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// INTEGRATION 2: LabView.tsx
// ===========================================================================

/**
 * Location: src/pages/laboratory/LabView.tsx
 * 
 * Add audit timeline for lab result amendments showing:
 * "Lab History (1 amendment - Critical Alert Downgraded)"
 * 
 * Use case: Lab director marks critical alert, physician downgrades with reason
 */

// Add to imports:
import { AuditTimeline } from '@/components/audit/AuditTimeline';
import { useAmendmentAlerts } from '@/hooks/useAmendmentAlerts';

// In LabView component (after lab result details):
function LabViewPage({ labResultId }: { labResultId: string }) {
  const { alerts } = useAmendmentAlerts(null);

  // Check for critical amendments
  const criticalAmendment = alerts.find(
    a =>
      a.recordId === labResultId &&
      a.recordType === 'lab_result' &&
      a.severity === 'CRITICAL'
  );

  return (
    <div className="space-y-6">
      {/* Existing lab result display */}
      <div>
        {/* ... lab result values, charts, etc ... */}
      </div>

      {/* Critical Amendment Alert */}
      {criticalAmendment && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Critical Lab Amendment</p>
              <p className="text-sm text-red-800 mt-1">
                {criticalAmendment.amendedBy.name}({criticalAmendment.amendedBy.role})
                {' '}amended this result: {criticalAmendment.message}
              </p>
              <p className="text-xs text-red-700 mt-1">
                Reason: {criticalAmendment.reason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lab Amendment Timeline */}
      <AuditTimeline
        recordId={labResultId}
        recordType="lab_result"
        maxAmendments={5}
      />
    </div>
  );
}

// ===========================================================================
// INTEGRATION 3: AppointmentDetail.tsx
// ===========================================================================

/**
 * Location: src/pages/appointments/AppointmentDetail.tsx
 * 
 * Add audit timeline for appointment amendments showing:
 * "Changes (3 updates): Original 2026-03-15 → Rescheduled 2026-03-18 → Cancelled"
 */

// Add to imports:
import { AuditTimeline } from '@/components/audit/AuditTimeline';

// In AppointmentDetail component:
function AppointmentDetailPage({ appointmentId }: { appointmentId: string }) {
  return (
    <div className="space-y-6">
      {/* Existing appointment info */}
      <div>
        {/* Status badge, patient, doctor, clinic info */}
      </div>

      {/* Appointment Amendment Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointment History</CardTitle>
          <CardDescription>
            View all changes made to this appointment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditTimeline
            recordId={appointmentId}
            recordType="appointment"
            maxAmendments={10}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================================================
// INTEGRATION 4A: App.tsx - Wire Up Alert System
// ===========================================================================

/**
 * Location: src/App.tsx (root component)
 * 
 * Add real-time alert toast system that shows amendments across the app.
 * This is a one-time setup in the root component.
 */

// Add to imports:
import { AuditAlertToastSystem } from '@/components/audit/AuditAlertToast';
import { useAuth } from '@/contexts/AuthContext';

// In App component (after Toaster setup):
function App() {
  const { profile } = useAuth();

  return (
    <div>
      <Toaster /> {/* Existing Sonner toast provider */}

      {/* Add audit alert system (one line!) */}
      <AuditAlertToastSystem
        hospitalId={profile?.hospital_id || null}
        filterByRole={profile?.primary_role}
        disabled={profile?.roles?.some(r => r === 'patient')} // Disable for patients
      />

      {/* Rest of app routing/layout */}
      {/* ... */}
    </div>
  );
}

// ===========================================================================
// INTEGRATION 4B: Add Audit Dashboard Route
// ===========================================================================

/**
 * Location: src/App.tsx (routing section)
 * 
 * Add new route for audit dashboard (admin-only)
 */

// Add to route imports:
import { AuditDashboard } from '@/pages/audit/AuditDashboard';

// Add to router (with RoleProtectedRoute if available):
<Route
  path="/audit/dashboard"
  element={
    <RoleProtectedRoute 
      allowedRoles={['admin', 'compliance_officer']}
    >
      <AuditDashboard />
    </RoleProtectedRoute>
  }
/>

// ===========================================================================
// INTEGRATION 5: Pharmacy/PrescriptionQueue.tsx (Optional - Amendment Form)
// ===========================================================================

/**
 * Location: src/components/pharmacist/PrescriptionQueue.tsx (optional)
 * 
 * The AmendmentModal already exists and is ready to use
 */

// Add to imports:
import { AmendmentModal } from '@/components/audit/AmendmentModal';

// In PrescriptionQueue component:
function PrescriptionQueue() {
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
  const [items, setItems] = useState([]);
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);

  // ... existing queue logic ...

  return (
    <div>
      {/* Existing queue table/list */}

      {/* Amendment Button (Doctor-only, next to each Rx) */}
      {profile?.primary_role === 'doctor' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setSelectedPrescriptionId(prescriptionId);
            setItems(prescription.items);
            setShowAmendmentModal(true);
          }}
          className="gap-1"
        >
          <Edit2 className="w-3 h-3" />
          Amend
        </Button>
      )}

      {/* Amendment Modal */}
      <AmendmentModal
        isOpen={showAmendmentModal}
        onClose={() => setShowAmendmentModal(false)}
        prescriptionId={selectedPrescriptionId || ''}
        items={items}
        onAmendmentSuccess={() => {
          setShowAmendmentModal(false);
          // Refresh queue
        }}
      />
    </div>
  );
}

// ===========================================================================
// TESTING CHECKLIST
// ===========================================================================

/**
 * After implementing these integrations, test:
 * 
 * 1. UNIT TESTS
 *    - useAuditTrail hook fetches and caches data correctly
 *    - useAmendmentAlerts hook filters by severity + role
 *    - useLegalHold hook toggles state correctly
 * 
 * 2. INTEGRATION TESTS
 *    - AuditTimeline renders amendments in chronological order
 *    - ForensicTimeline modal opens/closes correctly
 *    - AuditAlertToastSystem shows toasts for critical amendments
 * 
 * 3. E2E TESTS
 *    - Doctor can amend prescription via AmendmentModal
 *    - Timeline shows amendment immediately after completion
 *    - Pharmacist receives toast notification
 * 
 * 4. MANUAL TESTS
 *    - Permission checks (doctor-only buttons)
 *    - PHI sanitization in logs/toasts
 *    - Performance: timeline loads < 500ms, modal < 1s
 *    - Audit dashboard exports CSV correctly
 * 
 * 5. COMPLIANCE CHECKS
 *    - Immutability: Original records unchanged after amendment
 *    - RLS: Users only see amendments for their hospital
 *    - Forensic: Amendment chains are complete and chronological
 */

// ===========================================================================
// ROLLBACK PROCEDURE (if needed)
// ===========================================================================

/**
 * To rollback Phase 2B without breaking existing code:
 * 
 * 1. Comment out AuditAlertToastSystem in App.tsx
 * 2. Delete AuditTimeline from PrescriptionDetail/LabView/AppointmentDetail
 * 3. Remove amendment button from PrescriptionQueue
 * 4. Comment out audit dashboard route
 * 5. Restart app - all existing workflows still work
 * 
 * No database changes needed. No data loss.
 * Can be re-enabled anytime by uncommenting.
 */
