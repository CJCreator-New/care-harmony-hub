import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { DoctorDischargeQueue } from '@/components/discharge/DoctorDischargeQueue';
import { PharmacistDischargeQueue } from '@/components/discharge/PharmacistDischargeQueue';
import { BillingDischargeQueue } from '@/components/discharge/BillingDischargeQueue';
import { NurseDischargeQueue } from '@/components/discharge/NurseDischargeQueue';
import { DischargeWorkflowTimeline } from '@/components/discharge/DischargeWorkflowTimeline';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDischargeWorkflow } from '@/hooks/useDischargeWorkflow';
import { usePermissions } from '@/lib/hooks';

const getDefaultTab = (role: string | null) => {
  if (role === 'doctor') return 'doctor';
  if (role === 'pharmacist') return 'pharmacist';
  if (role === 'nurse') return 'nurse';
  if (role === 'receptionist' || role === 'admin') return 'billing';
  return 'doctor';
};

export default function DischargeWorkflowPage() {
  const { primaryRole } = useAuth();
  const permissions = usePermissions();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const { workflowAudit, isLoadingAudit } = useDischargeWorkflow(selectedWorkflowId || undefined);
  const showDoctor = permissions.can('consultations:write');
  const showPharmacist = permissions.can('prescriptions:write');
  const showBilling = permissions.can('billing:read');
  const showNurse = permissions.can('queue:write') || permissions.can('vitals:write');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Discharge Workflow</h1>
          <p className="text-muted-foreground">
            Doctor to pharmacist to billing to nurse discharge approval chain with rejection returns.
          </p>
        </div>

        <Tabs defaultValue={getDefaultTab(primaryRole)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="doctor" disabled={!showDoctor}>Doctor</TabsTrigger>
            <TabsTrigger value="pharmacist" disabled={!showPharmacist}>Pharmacist</TabsTrigger>
            <TabsTrigger value="billing" disabled={!showBilling}>Billing</TabsTrigger>
            <TabsTrigger value="nurse" disabled={!showNurse}>Nurse</TabsTrigger>
          </TabsList>

          <TabsContent value="doctor">
            <DoctorDischargeQueue />
          </TabsContent>
          <TabsContent value="pharmacist">
            <PharmacistDischargeQueue />
          </TabsContent>
          <TabsContent value="billing">
            <BillingDischargeQueue />
          </TabsContent>
          <TabsContent value="nurse">
            <NurseDischargeQueue />
          </TabsContent>
        </Tabs>

        <div className="space-y-3">
          <Label htmlFor="audit-workflow-id">Audit Workflow ID</Label>
          <Input
            id="audit-workflow-id"
            placeholder="Paste a workflow UUID to inspect its audit timeline"
            value={selectedWorkflowId}
            onChange={(event) => setSelectedWorkflowId(event.target.value)}
          />
        </div>

        <DischargeWorkflowTimeline entries={workflowAudit} isLoading={isLoadingAudit} />
      </div>
    </DashboardLayout>
  );
}
