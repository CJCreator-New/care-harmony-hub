# Phase 2B: Component Usage Examples & Patterns

This guide shows practical examples of integrating Phase 2B audit components into existing CareSync workflows.

## 1. Prescription Amendment in Doctor Workflow

### Scenario: Doctor corrects prescription dosage

**Location:** `src/pages/Clinic/PatientConsultation.tsx` or `src/pages/Pharmacy/PrescriptionDetail.tsx`

```typescript
import React, { useState } from 'react';
import { usePrescription } from '@/hooks/usePrescriptions';
import { AmendmentModal } from '@/components/audit/AmendmentModal';
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Edit, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PrescriptionDetailPageProps {
  prescriptionId: string;
}

export function PrescriptionDetailPage({
  prescriptionId,
}: PrescriptionDetailPageProps) {
  const { data: prescription, isLoading } = usePrescription(prescriptionId);
  const { hasRole } = usePermissions();
  const [amendmentModalOpen, setAmendmentModalOpen] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  if (isLoading) return <div>Loading prescription...</div>;
  if (!prescription) return <div>Prescription not found</div>;

  const canAmend = hasRole('doctor') && prescription.status === 'approved';

  return (
    <div className="space-y-6">
      {/* Existing Prescription Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Prescription for {prescription.patient?.first_name}{' '}
                {prescription.patient?.last_name}
              </CardTitle>
              <CardDescription>
                MRN: {prescription.patient?.mrn} • Status:{' '}
                <Badge variant={prescription.status === 'approved' ? 'default' : 'secondary'}>
                  {prescription.status}
                </Badge>
              </CardDescription>
            </div>

            {/* NEW: Amendment Actions */}
            {canAmend && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setAmendmentModalOpen(true)}
                  variant="secondary"
                  className="gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Dosage
                </Button>
                <Button
                  onClick={() => setShowTimeline(!showTimeline)}
                  variant="outline"
                  className="gap-2"
                >
                  <History className="w-4 h-4" />
                  View Audit Trail
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Medications */}
          <div>
            <h3 className="font-semibold mb-2">Medications</h3>
            <div className="space-y-2">
              {prescription.items?.map((item) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded border">
                  <p className="font-medium">{item.medication_name}</p>
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    <p>Dosage: {item.dosage}</p>
                    <p>Frequency: {item.frequency}</p>
                    <p>Quantity: {item.quantity}</p>
                    <p>Duration: {item.duration}</p>
                    {item.instructions && <p>Instructions: {item.instructions}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prescription Notes */}
          {prescription.notes && (
            <div>
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-sm text-gray-700">{prescription.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* NEW: Amendment Modal */}
      <AmendmentModal
        isOpen={amendmentModalOpen}
        onClose={() => setAmendmentModalOpen(false)}
        prescriptionId={prescriptionId}
        items={prescription.items}
        patientName={`${prescription.patient?.first_name} ${prescription.patient?.last_name}`}
        onAmendmentSuccess={(amendmentId) => {
          // Optional: Navigate to amendment detail or show confirmation
          console.log('Amendment created:', amendmentId);
        }}
      />

      {/* NEW: Forensic Timeline */}
      {showTimeline && (
        <Card>
          <CardHeader>
            <CardTitle>Prescription Amendment Timeline</CardTitle>
            <CardDescription>Immutable forensic audit trail</CardDescription>
          </CardHeader>
          <CardContent>
            <ForensicTimeline
              prescriptionId={prescriptionId}
              showOwnOnly={hasRole('doctor')} // Doctors see own amendments only
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## 2. Pharmacist Real-Time Amendment Alerts

### Scenario: Pharmacist dashboard shows incoming amendment notifications

**Location:** `src/pages/Pharmacy/PharmacistDashboard.tsx`

```typescript
import React from 'react';
import { useAmendmentAlert } from '@/hooks/useAmendmentAlert';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';

export function PharmacistDashboard() {
  const { profile } = useAuth();
  const {
    unreviewedAlerts,
    allAlerts,
    acknowledgeAlert,
    clearAlert,
    dismissAllAlerts,
  } = useAmendmentAlert({
    enabled: profile?.primary_role === 'pharmacist',
    showToasts: true,
    messageFormatter: (alert) =>
      `Dr. ${alert.doctor_name} amended Rx #${alert.prescription_id.slice(0, 8)} (${alert.dosage_before}→${alert.dosage_after}). ${alert.change_reason}`,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Pharmacist Dashboard</h1>

      {/* Amendment Alerts Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Amendment Alerts</CardTitle>
              <CardDescription>
                Real-time notifications of prescription amendments requiring review
              </CardDescription>
            </div>
            {unreviewedAlerts.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="gap-1 text-base px-3 py-1">
                  <AlertTriangle className="w-4 h-4" />
                  {unreviewedAlerts.length} Pending
                </Badge>
                <Button
                  onClick={dismissAllAlerts}
                  variant="outline"
                  size="sm"
                >
                  Dismiss All
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {unreviewedAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No pending amendments to review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unreviewedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 border rounded-lg bg-amber-50 border-amber-200"
                >
                  {/* Alert Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-amber-900">
                        Dr. {alert.doctor_name} amended prescription
                      </p>
                      <p className="text-sm text-amber-800">
                        Rx #{alert.prescription_id.slice(0, 8)}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-900">
                      {format(new Date(alert.timestamp), 'HH:mm:ss')}
                    </Badge>
                  </div>

                  {/* Change Details */}
                  <div className="bg-white rounded p-3 mb-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-600 font-medium">Dosage Change</p>
                        <p className="font-mono text-sm">
                          {alert.dosage_before} → {alert.dosage_after}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-medium">Reason</p>
                        <p className="text-sm">{alert.change_reason}</p>
                      </div>
                    </div>

                    {/* Clinical Justification */}
                    {alert.amendment_justification && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-gray-600 font-medium mb-1">
                          Clinical Justification
                        </p>
                        <p className="text-sm text-gray-700 italic">
                          "{alert.amendment_justification}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        // Navigate to prescription detail to review full audit trail
                        window.location.href = `/pharmacy/prescriptions/${alert.prescription_id}`;
                      }}
                      size="sm"
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Review & Audit Trail
                    </Button>
                    <Button
                      onClick={() => acknowledgeAlert(alert.id)}
                      variant="outline"
                      size="sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Acknowledge
                    </Button>
                    <Button
                      onClick={() => clearAlert(alert.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Dashboard Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Your existing pending approvals UI */}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 3. Compliance Officer Forensic Review

### Scenario: Audit all amendments for a patient over date range

**Location:** `src/pages/Admin/ComplianceAuditTrail.tsx`

```typescript
import React, { useState } from 'react';
import { useAuditQuery } from '@/hooks/useForensicQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Download } from 'lucide-react';
import { format } from 'date-fns';

interface ComplianceAuditTrailProps {
  patientId?: string;
  prescriptionId?: string;
}

export function ComplianceAuditTrail({
  patientId,
  prescriptionId,
}: ComplianceAuditTrailProps) {
  const [dateFrom, setDateFrom] = useState<Date>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
  );
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [actionTypeFilter, setActionTypeFilter] = useState('all');

  // Query audit logs
  const { data: auditLogs = [], isLoading } = useAuditQuery({
    entityType: prescriptionId ? 'prescription' : undefined,
    entityId: prescriptionId,
    actionType: actionTypeFilter !== 'all' ? actionTypeFilter : undefined,
    dateFrom,
    dateTo,
  });

  // Export to CSV
  const handleExport = () => {
    const headers = [
      'Audit ID',
      'Date/Time (UTC)',
      'Actor Email',
      'Actor Role',
      'Action Type',
      'Entity Type',
      'Entity ID',
      'Change Reason',
      'Before State (JSON)',
      'After State (JSON)',
    ];

    const rows = auditLogs.map((log) => [
      log.audit_id,
      log.event_time,
      log.actor_email || 'system',
      log.actor_role || 'system',
      log.action_type,
      log.entity_type || 'N/A',
      log.entity_id || 'N/A',
      log.change_reason || '',
      JSON.stringify(log.before_state || {}),
      JSON.stringify(log.after_state || {}),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell || '');
            return cellStr.includes(',') ? `"${cellStr.replace(/"/g, '""')}"` : cellStr;
          })
          .join(',')
      ),
    ].join('\n');

    const element = document.createElement('a');
    element.setAttribute(
      'href',
      `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`
    );
    element.setAttribute(
      'download',
      `audit_trail_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`
    );
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail Query</CardTitle>
          <CardDescription>Filter and export immutable audit logs</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={format(dateFrom, 'yyyy-MM-dd')}
                onChange={(e) => setDateFrom(new Date(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={format(dateTo, 'yyyy-MM-dd')}
                onChange={(e) => setDateTo(new Date(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="action-filter">Action Type</Label>
            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
              <SelectTrigger id="action-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="APPROVE">Approve</SelectItem>
                <SelectItem value="REJECT">Reject</SelectItem>
                <SelectItem value="AMEND">Amend</SelectItem>
                <SelectItem value="REVERSAL">Reversal</SelectItem>
                <SelectItem value="DISPENSE">Dispense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">
                Found {auditLogs.length} audit record{auditLogs.length !== 1 ? 's' : ''}
              </p>
              <Button
                onClick={handleExport}
                disabled={auditLogs.length === 0}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>

            {/* Audit Log Table */}
            {isLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-gray-500">No audit records found</p>
            ) : (
              <div className="overflow-x-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Date/Time</th>
                      <th className="px-4 py-2 text-left font-medium">Actor</th>
                      <th className="px-4 py-2 text-left font-medium">Action</th>
                      <th className="px-4 py-2 text-left font-medium">Entity</th>
                      <th className="px-4 py-2 text-left font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.audit_id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">
                          {format(new Date(log.event_time), 'MMM dd HH:mm:ss')}
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-sm">
                            <p className="font-medium">{log.actor_email || 'system'}</p>
                            <p className="text-gray-500">{log.actor_role || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {log.action_type}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {log.entity_type}: {log.entity_id?.slice(0, 8)}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {log.change_reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 4. Standalone Real-Time Alert Badge (Header Component)

### Scenario: Show amendment alert count anywhere in app

**Location:** `src/components/layout/NavBar.tsx` or similar

```typescript
import React from 'react';
import { useAmendmentAlert } from '@/hooks/useAmendmentAlert';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function AmendmentAlertBell() {
  const { unreviewedAlerts } = useAmendmentAlert();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-gray-100">
          <Bell className="w-5 h-5" />
          {unreviewedAlerts.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0">
              {unreviewedAlerts.length}
            </Badge>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold">Amendment Alerts</h3>
            {unreviewedAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {unreviewedAlerts.length}
              </Badge>
            )}
          </div>

          {unreviewedAlerts.length === 0 ? (
            <p className="text-sm text-gray-600">No pending amendments</p>
          ) : (
            <div className="space-y-2">
              {unreviewedAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="p-2 bg-amber-50 rounded border border-amber-200 text-sm"
                >
                  <p className="font-medium text-amber-900">
                    Dr. {alert.doctor_name}
                  </p>
                  <p className="text-amber-800">
                    {alert.dosage_before} → {alert.dosage_after}
                  </p>
                </div>
              ))}
              {unreviewedAlerts.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  +{unreviewedAlerts.length - 3} more alerts
                </p>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

**Add to NavBar:**
```typescript
export function NavBar() {
  return (
    <nav className="flex items-center gap-4">
      {/* Existing nav items */}
      <AmendmentAlertBell />
    </nav>
  );
}
```

---

## 5. Test Example: Amendment Modal

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AmendmentModal } from '@/components/audit/AmendmentModal';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/setup';

const mockPrescriptionItem = {
  id: 'item_123',
  medication_name: 'Lisinopril',
  dosage: '500mg BID',
  frequency: 'twice daily',
  duration: '30 days',
  quantity: 30,
};

describe('AmendmentModal', () => {
  it('should submit amendment with all fields', async () => {
    const onSuccess = vi.fn();
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AmendmentModal
          isOpen={true}
          onClose={() => {}}
          prescriptionId="rx_123"
          items={[mockPrescriptionItem]}
          patientName="John Doe"
          onAmendmentSuccess={onSuccess}
        />
      </QueryClientProvider>
    );

    // Fill form
    const dosageInput = screen.getByPlaceholderText(/e.g., 250mg BID/);
    await userEvent.type(dosageInput, '250mg BID');

    const reasonSelect = screen.getByDisplayValue(/Select reason/);
    await userEvent.click(reasonSelect);
    await userEvent.click(screen.getByText('Renal function adjustment'));

    const justificationTextarea = screen.getByPlaceholderText(
      /Detailed clinical reason/
    );
    await userEvent.type(
      justificationTextarea,
      'Patient has Stage 2 CKD; reduced per guidelines'
    );

    // Submit
    const submitButton = screen.getByText(/Submit Amendment/);
    await userEvent.click(submitButton);

    // Wait for success
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
```

---

## Key Patterns

### Pattern 1: Show Amendment Button (Conditional)
```typescript
{hasRole('doctor') && prescription?.status === 'approved' && (
  <Button onClick={() => setAmendmentOpen(true)}>
    Edit Dosage
  </Button>
)}
```

### Pattern 2: Auto-Refresh Timeline After Amendment
```typescript
<AmendmentModal
  onAmendmentSuccess={() => {
    // ForensicTimeline auto-refreshes via query invalidation
    // No manual refresh needed
  }}
/>
```

### Pattern 3: Hospital-Scoped Queries
```typescript
// All hooks respect hospital_id via auth context + RLS
const { data } = usePrescriptionAmendmentChain(prescriptionId);
// Only amendments from current user's hospital returned
```

### Pattern 4: Real-Time Alerts for Specific Roles
```typescript
const { unreviewedAlerts } = useAmendmentAlert({
  enabled: profile?.primary_role === 'pharmacist',
})
```

---

All components are production-ready for Phase 2B deployment. See [PHASE_2B_INTEGRATION_GUIDE.md](./PHASE_2B_INTEGRATION_GUIDE.md) for full integration steps.
