/**
 * Tier 4.1: Main Discharge Workflow Card Component
 * Displays current step and role-specific action buttons
 */

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import type { DischargeWorkflow } from '@/hooks/useDischargeWorkflow';

interface DischargeWorkflowCardProps {
  workflow: DischargeWorkflow | null;
  isLoading: boolean;
  isTransitioning: boolean;
  onInitiate: () => void;
  onClinicalClear: () => void;
  onNurseConfirm: () => void;
  onMedReconcile: () => void;
  onFinancialClear: () => void;
  onCheckout: () => void;
  onFinalize: () => void;
  onCancel: (reason: string) => void;
}

/**
 * Workflow step definitions
 */
const WORKFLOW_STEPS = [
  { step: 1, status: 'pending_review', title: 'Initiate', role: 'doctor', icon: Clock },
  { step: 2, status: 'clinical_cleared', title: 'Clinical Clearance', role: 'doctor', icon: CheckCircle },
  { step: 3, status: 'nurse_confirmed', title: 'Nurse Confirmation', role: 'nurse', icon: CheckCircle },
  { step: 4, status: 'med_reconciled', title: 'Medication Reconciliation', role: 'pharmacist', icon: CheckCircle },
  { step: 5, status: 'financial_cleared', title: 'Financial Review', role: 'billing', icon: CheckCircle },
  { step: 6, status: 'discharged', title: 'Checkout', role: 'receptionist', icon: CheckCircle },
  { step: 7, status: 'finalized', title: 'Finalized', role: 'receptionist', icon: CheckCircle },
];

export function DischargeWorkflowCard({
  workflow,
  isLoading,
  isTransitioning,
  onInitiate,
  onClinicalClear,
  onNurseConfirm,
  onMedReconcile,
  onFinancialClear,
  onCheckout,
  onFinalize,
  onCancel,
}: DischargeWorkflowCardProps) {
  const { hasRole } = usePermissions();

  // Map workflow to action buttons
  const actionMap = useMemo(
    () => ({
      pending_review: { handler: onClinicalClear, label: 'Perform Clinical Clearance', role: 'doctor' },
      clinical_cleared: { handler: onNurseConfirm, label: 'Confirm Clinical Status', role: 'nurse' },
      nurse_confirmed: { handler: onMedReconcile, label: 'Reconcile Medications', role: 'pharmacist' },
      med_reconciled: { handler: onFinancialClear, label: 'Clear Financial Items', role: 'billing' },
      financial_cleared: { handler: onCheckout, label: 'Complete Checkout', role: 'receptionist' },
      discharged: { handler: onFinalize, label: 'Finalize Discharge', role: 'receptionist' },
      finalized: { handler: () => {}, label: 'Completed', role: '' },
      cancelled: { handler: () => {}, label: 'Cancelled', role: '' },
    }),
    [onClinicalClear, onNurseConfirm, onMedReconcile, onFinancialClear, onCheckout, onFinalize]
  );

  // Get current action
  const currentAction = workflow ? actionMap[workflow.status as keyof typeof actionMap] : null;

  // Check if user can perform current action
  const canPerform = currentAction ? hasRole(currentAction.role) : false;

  if (isLoading) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle>Discharge Workflow</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-3/4 rounded bg-amber-200"></div>
            <div className="h-4 w-1/2 rounded bg-amber-200"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!workflow) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle>Discharge Workflow</CardTitle>
          <CardDescription>Not started</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-gray-600">
            Click below to initiate discharge process.
          </p>
          <Button
            onClick={onInitiate}
            disabled={isTransitioning}
            className="w-full"
          >
            {isTransitioning ? 'Initiating...' : 'Initiate Discharge'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Determine card styling based on status
  const getStatusColor = () => {
    if (workflow.status === 'finalized') return 'border-green-200 bg-green-50';
    if (workflow.status === 'cancelled') return 'border-red-200 bg-red-50';
    return 'border-blue-200 bg-blue-50';
  };

  const getStatusIcon = () => {
    if (workflow.status === 'finalized') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (workflow.status === 'cancelled') return <X className="h-5 w-5 text-red-600" />;
    return <Clock className="h-5 w-5 text-blue-600" />;
  };

  // Timeline display
  const timeline = WORKFLOW_STEPS.map((stepDef) => {
    const isComplete = workflow.current_step > stepDef.step;
    const isCurrent = workflow.current_step === stepDef.step;
    const isSkipped = workflow.status === 'cancelled';

    return (
      <div key={stepDef.step} className="flex items-center gap-3">
        <div
          className={`
            flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold
            ${isComplete ? 'border-green-500 bg-green-100 text-green-700' : ''}
            ${isCurrent ? 'border-blue-500 bg-blue-100 text-blue-700' : ''}
            ${!isComplete && !isCurrent ? 'border-gray-300 bg-gray-100 text-gray-600' : ''}
            ${isSkipped ? 'border-red-300 bg-red-100' : ''}
          `}
        >
          {isComplete ? '✓' : stepDef.step}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${isCurrent ? 'text-blue-700' : 'text-gray-700'}`}>
            {stepDef.title}
          </p>
          <p className="text-xs text-gray-500">{stepDef.role}</p>
        </div>
        {stepDef.step === workflow.current_step && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            Current
          </Badge>
        )}
      </div>
    );
  });

  return (
    <Card className={getStatusColor()}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle>Discharge Workflow</CardTitle>
              <CardDescription>Step {workflow.current_step} of 7</CardDescription>
            </div>
          </div>
          <Badge
            variant={
              workflow.status === 'finalized' ? 'default' :
              workflow.status === 'cancelled' ? 'destructive' :
              'secondary'
            }
          >
            {workflow.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Timeline */}
        <div className="space-y-3">{timeline}</div>

        {/* Current Status Message */}
        {workflow.status === 'cancelled' && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-900">Discharge Cancelled</p>
                <p className="text-sm text-red-800">{workflow.cancellation_reason}</p>
              </div>
            </div>
          </div>
        )}

        {workflow.status === 'finalized' && (
          <div className="rounded-md border border-green-300 bg-green-50 p-3">
            <div className="flex gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-900">Discharge Complete</p>
                <p className="text-sm text-green-800">
                  Patient has been successfully discharged
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {workflow.status !== 'finalized' && workflow.status !== 'cancelled' && currentAction && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={currentAction.handler}
              disabled={!canPerform || isTransitioning}
              className="flex-1"
            >
              {isTransitioning ? 'Processing...' : currentAction.label}
            </Button>
            <Button
              variant="outline"
              onClick={() => onCancel('User cancelled discharge process')}
              disabled={isTransitioning}
            >
              Cancel
            </Button>
          </div>
        )}

        {!canPerform && workflow.status !== 'finalized' && workflow.status !== 'cancelled' && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            ℹ️ Your role does not have permission for the current step. Awaiting {currentAction?.role}.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DischargeWorkflowCard;
