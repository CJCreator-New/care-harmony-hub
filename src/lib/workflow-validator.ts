/**
 * Role-Based Workflow Validator
 * Validates multi-role workflows in core clinical processes
 * Ensures proper authorization, sequencing, and audit trails
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type UserRole = "doctor" | "nurse" | "receptionist" | "billing" | "admin" | "pharmacy";
export type WorkflowState = "initiated" | "in_progress" | "completed" | "failed" | "rejected";

export interface WorkflowStep {
  step_id: string;
  step_name: string;
  allowed_roles: UserRole[];
  required_data_fields: string[];
  next_steps: string[];
  timeout_minutes?: number;
}

export interface WorkflowExecution {
  workflow_id: string;
  hospital_id: string;
  initiated_by: string;
  initiated_by_role: UserRole;
  started_at: string;
  state: WorkflowState;
  current_step: string;
  steps_completed: WorkflowStep[];
  pending_steps: WorkflowStep[];
  data_accumulation: Record<string, any>;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Appointment Scheduling Workflow
 * Receptionist → Doctor → Nurse confirmation
 */
const APPOINTMENT_WORKFLOW: WorkflowStep[] = [
  {
    step_id: "appointment.create",
    step_name: "Create Appointment",
    allowed_roles: ["receptionist"],
    required_data_fields: ["patient_id", "doctor_id", "appointment_date", "reason"],
    next_steps: ["appointment.doctor_confirm"],
    timeout_minutes: 60,
  },
  {
    step_id: "appointment.doctor_confirm",
    step_name: "Doctor Confirmation",
    allowed_roles: ["doctor"],
    required_data_fields: ["appointment_id", "confirmed"],
    next_steps: ["appointment.nurse_confirm", "appointment.rejected"],
    timeout_minutes: 120,
  },
  {
    step_id: "appointment.nurse_confirm",
    step_name: "Nurse Pre-Check",
    allowed_roles: ["nurse"],
    required_data_fields: ["vital_signs", "allergy_check"],
    next_steps: ["appointment.completed"],
    timeout_minutes: 30,
  },
];

/**
 * Prescription Issuance Workflow
 * Doctor → Pharmacist → Patient notification
 */
const PRESCRIPTION_WORKFLOW: WorkflowStep[] = [
  {
    step_id: "prescription.create",
    step_name: "Issue Prescription",
    allowed_roles: ["doctor"],
    required_data_fields: ["patient_id", "medication", "dosage", "frequency"],
    next_steps: ["prescription.pharmacist_verify"],
    timeout_minutes: 5,
  },
  {
    step_id: "prescription.pharmacist_verify",
    step_name: "Pharmacy Verification",
    allowed_roles: ["pharmacy"],
    required_data_fields: ["pharmacy_id", "verified"],
    next_steps: ["prescription.patient_notified"],
    timeout_minutes: 15,
  },
  {
    step_id: "prescription.patient_notified",
    step_name: "Patient Notification",
    allowed_roles: ["nurse", "receptionist"],
    required_data_fields: ["notification_method"],
    next_steps: [],
  },
];

/**
 * Billing & Insurance Workflow
 * Doctor (clinical) → Billing → Insurance → Patient
 */
const BILLING_WORKFLOW: WorkflowStep[] = [
  {
    step_id: "billing.clinical_complete",
    step_name: "Clinical Work Complete",
    allowed_roles: ["doctor"],
    required_data_fields: ["appointment_id", "procedures", "diagnoses"],
    next_steps: ["billing.generate_claim"],
    timeout_minutes: 0, // Immediate
  },
  {
    step_id: "billing.generate_claim",
    step_name: "Generate Insurance Claim",
    allowed_roles: ["billing"],
    required_data_fields: ["claim_id", "edi_837"],
    next_steps: ["billing.submit_insurance"],
    timeout_minutes: 60,
  },
  {
    step_id: "billing.submit_insurance",
    step_name: "Submit EDI Claim",
    allowed_roles: ["billing"],
    required_data_fields: ["insurance_id", "submission_timestamp"],
    next_steps: ["billing.process_patient_responsibility"],
    timeout_minutes: 5,
  },
  {
    step_id: "billing.process_patient_responsibility",
    step_name: "Calculate Patient Copay",
    allowed_roles: ["billing"],
    required_data_fields: ["copay_amount", "deductible", "coinsurance"],
    next_steps: ["billing.send_invoice"],
    timeout_minutes: 5,
  },
  {
    step_id: "billing.send_invoice",
    step_name: "Send Invoice to Patient",
    allowed_roles: ["receptionist"],
    required_data_fields: ["invoice_id"],
    next_steps: [],
  },
];

/**
 * Clinical Notes Workflow
 * Doctor (draft) → Doctor (sign) → Nurse (add observations)
 */
const CLINICAL_NOTES_WORKFLOW: WorkflowStep[] = [
  {
    step_id: "notes.create",
    step_name: "Enter Clinical Notes",
    allowed_roles: ["doctor"],
    required_data_fields: ["appointment_id", "findings", "assessment", "plan"],
    next_steps: ["notes.sign"],
    timeout_minutes: 30,
  },
  {
    step_id: "notes.sign",
    step_name: "Digitally Sign Notes",
    allowed_roles: ["doctor"],
    required_data_fields: ["signature_data", "private_key"],
    next_steps: ["notes.nurse_observations"],
    timeout_minutes: 10,
  },
  {
    step_id: "notes.nurse_observations",
    step_name: "Add Nurse Observations (append-only)",
    allowed_roles: ["nurse"],
    required_data_fields: ["observation_text", "category"],
    next_steps: [],
  },
];

/**
 * Initialize workflow execution
 */
export async function initializeWorkflow(
  workflowType: "appointment" | "prescription" | "billing" | "clinical_notes",
  hospitalId: string,
  initiatedBy: string,
  userRole: UserRole,
  initialData: Record<string, any>
): Promise<WorkflowExecution> {
  // Get workflow definition
  const workflows = {
    appointment: APPOINTMENT_WORKFLOW,
    prescription: PRESCRIPTION_WORKFLOW,
    billing: BILLING_WORKFLOW,
    clinical_notes: CLINICAL_NOTES_WORKFLOW,
  };

  const workflow = workflows[workflowType];
  const firstStep = workflow[0];

  // Validate authorization
  if (!firstStep.allowed_roles.includes(userRole)) {
    throw new Error(
      `Role ${userRole} not authorized to initiate ${workflowType} workflow`
    );
  }

  // Validate required data
  const missingFields = firstStep.required_data_fields.filter(
    (field) => !(field in initialData)
  );
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  }

  // Create workflow execution record
  const execution: WorkflowExecution = {
    workflow_id: `${workflowType}-${Date.now()}`,
    hospital_id: hospitalId,
    initiated_by: initiatedBy,
    initiated_by_role: userRole,
    started_at: new Date().toISOString(),
    state: "in_progress",
    current_step: firstStep.step_id,
    steps_completed: [],
    pending_steps: workflow.slice(1),
    data_accumulation: initialData,
  };

  // Persist workflow execution
  const { error } = await supabase
    .from("workflow_executions")
    .insert([
      {
        workflow_id: execution.workflow_id,
        workflow_type: workflowType,
        hospital_id: hospitalId,
        initiated_by: initiatedBy,
        initiated_by_role: userRole,
        started_at: execution.started_at,
        state: "in_progress",
        current_step: firstStep.step_id,
        data_accumulation: execution.data_accumulation,
      },
    ]);

  if (error) throw error;

  // Audit log
  await supabase.from("audit_logs").insert([
    {
      user_id: initiatedBy,
      action: `WORKFLOW_INITIATED`,
      table_name: "workflow_executions",
      record_id: execution.workflow_id,
      description: `Initialized ${workflowType} workflow`,
      created_at: new Date().toISOString(),
    },
  ]);

  return execution;
}

/**
 * Advance workflow to next step
 */
export async function advanceWorkflowStep(
  workflowId: string,
  stepId: string,
  performedBy: string,
  userRole: UserRole,
  stepData: Record<string, any>
): Promise<WorkflowExecution> {
  // Get workflow definition
  const workflowTypes = {
    appointment: APPOINTMENT_WORKFLOW,
    prescription: PRESCRIPTION_WORKFLOW,
    billing: BILLING_WORKFLOW,
    clinical_notes: CLINICAL_NOTES_WORKFLOW,
  };

  // Find workflow type from ID
  const workflowType = Object.keys(workflowTypes).find((type) =>
    workflowId.startsWith(type)
  ) as keyof typeof workflowTypes;

  const workflowSteps = workflowTypes[workflowType];
  const currentStep = workflowSteps.find((s) => s.step_id === stepId);

  if (!currentStep) throw new Error("Invalid workflow step");

  // Validate authorization
  if (!currentStep.allowed_roles.includes(userRole)) {
    throw new Error(
      `Role ${userRole} not authorized to perform step ${stepId}`
    );
  }

  // Validate required data
  const missingFields = currentStep.required_data_fields.filter(
    (field) => !(field in stepData)
  );
  if (missingFields.length > 0) {
    throw new Error(
      `Step ${stepId} requires: ${missingFields.join(", ")}`
    );
  }

  // Get current execution
  const { data: execution } = await supabase
    .from("workflow_executions")
    .select("*")
    .eq("workflow_id", workflowId)
    .single();

  if (!execution) throw new Error("Workflow not found");

  // Determine next step
  const nextStepIds = currentStep.next_steps;
  const nextStep = workflowSteps.find((s) => nextStepIds.includes(s.step_id));

  // Update execution
  const updatedExecution = {
    current_step: nextStep?.step_id || null,
    state: nextStep ? "in_progress" : ("completed" as WorkflowState),
    data_accumulation: {
      ...execution.data_accumulation,
      ...stepData,
      [`${stepId}_completed_by`]: performedBy,
      [`${stepId}_completed_at`]: new Date().toISOString(),
    },
  };

  const { error: updateError } = await supabase
    .from("workflow_executions")
    .update(updatedExecution)
    .eq("workflow_id", workflowId);

  if (updateError) throw updateError;

  // Audit log
  await supabase.from("audit_logs").insert([
    {
      user_id: performedBy,
      action: `WORKFLOW_STEP_COMPLETED`,
      table_name: "workflow_executions",
      record_id: workflowId,
      description: `Completed step: ${stepId}`,
      created_at: new Date().toISOString(),
    },
  ]);

  // Audit log step data for compliance
  await supabase.from("workflow_audit_logs").insert([
    {
      workflow_id: workflowId,
      step_id: stepId,
      performed_by: performedBy,
      user_role: userRole,
      step_data: stepData,
      completed_at: new Date().toISOString(),
      hospital_id: execution.hospital_id,
    },
  ]);

  return { ...execution, ...updatedExecution };
}

/**
 * Validate workflow compliance
 */
export async function validateWorkflowCompliance(
  workflowId: string
): Promise<{
  is_compliant: boolean;
  violations: string[];
  steps_authorized: boolean;
  audit_trail_complete: boolean;
  data_integrity: boolean;
}> {
  const { data: execution } = await supabase
    .from("workflow_executions")
    .select("*")
    .eq("workflow_id", workflowId)
    .single();

  if (!execution) throw new Error("Workflow not found");

  const violations: string[] = [];

  // Check step authorization
  const { data: auditLogs } = await supabase
    .from("workflow_audit_logs")
    .select("*")
    .eq("workflow_id", workflowId);

  const stepsAuthorized =
    auditLogs?.every((log) => {
      const workflowType = workflowId.split("-")[0] as keyof typeof WORKFLOWS;
      const workflow = WORKFLOWS[workflowType];
      const step = workflow.find((s) => s.step_id === log.step_id);
      return step?.allowed_roles.includes(log.user_role);
    }) ?? true;

  if (!stepsAuthorized) violations.push("Unauthorized step execution detected");

  // Check audit trail completeness
  const auditTrailComplete = auditLogs && auditLogs.length > 0;
  if (!auditTrailComplete) violations.push("Incomplete audit trail");

  // Check data integrity
  const { data: steps } = await supabase
    .from("workflow_audit_logs")
    .select("step_data")
    .eq("workflow_id", workflowId);

  const dataIntegrity =
    steps?.every((step) => step.step_data && Object.keys(step.step_data).length > 0) ??
    true;
  if (!dataIntegrity) violations.push("Data integrity issues detected");

  return {
    is_compliant: violations.length === 0,
    violations,
    steps_authorized: stepsAuthorized,
    audit_trail_complete: auditTrailComplete,
    data_integrity: dataIntegrity,
  };
}

const WORKFLOWS = {
  appointment: APPOINTMENT_WORKFLOW,
  prescription: PRESCRIPTION_WORKFLOW,
  billing: BILLING_WORKFLOW,
  clinical_notes: CLINICAL_NOTES_WORKFLOW,
};

export default {
  initializeWorkflow,
  advanceWorkflowStep,
  validateWorkflowCompliance,
  WORKFLOWS,
};
