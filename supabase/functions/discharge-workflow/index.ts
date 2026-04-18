/**
 * Tier 4.1: Discharge Workflow Orchestrator Edge Function
 * Purpose: Handle state machine transitions with role validation and audit logging
 * 
 * Endpoint: POST /functions/v1/discharge-workflow
 * Body: {
 *   workflowId: UUID,
 *   action: string,
 *   actorId: UUID,
 *   notes?: string,
 *   details?: Record<string, any>
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// State machine definition: what transitions are allowed from each status
const TRANSITIONS: Record<
  string,
  Record<string, { newStatus: string; newStep: number }>
> = {
  pending_review: {
    clinical_clear: { newStatus: 'clinical_cleared', newStep: 2 },
    cancel: { newStatus: 'cancelled', newStep: 0 },
  },
  clinical_cleared: {
    nurse_confirm: { newStatus: 'nurse_confirmed', newStep: 3 },
    cancel: { newStatus: 'cancelled', newStep: 0 },
  },
  nurse_confirmed: {
    med_reconcile: { newStatus: 'med_reconciled', newStep: 4 },
    cancel: { newStatus: 'cancelled', newStep: 0 },
  },
  med_reconciled: {
    financial_clear: { newStatus: 'financial_cleared', newStep: 5 },
    cancel: { newStatus: 'cancelled', newStep: 0 },
  },
  financial_cleared: {
    checkout: { newStatus: 'discharged', newStep: 6 },
    cancel: { newStatus: 'cancelled', newStep: 0 },
  },
  discharged: {
    finalize: { newStatus: 'finalized', newStep: 7 },
    cancel: { newStatus: 'cancelled', newStep: 0 },
  },
  cancelled: {}, // Terminal state - no transitions allowed
  finalized: {}, // Terminal state - no transitions allowed
};

// Role permissions for each action
const ROLE_PERMISSIONS: Record<string, string[]> = {
  clinical_clear: ['doctor', 'admin'],
  nurse_confirm: ['nurse', 'admin'],
  med_reconcile: ['pharmacist', 'admin'],
  financial_clear: ['billing', 'admin'],
  checkout: ['receptionist', 'admin'],
  finalize: ['receptionist', 'admin'],
  cancel: ['doctor', 'nurse', 'admin'],
};

// Determine which roles should be notified at each status
function getNotificationRoles(status: string): string[] {
  const notificationMap: Record<string, string[]> = {
    clinical_cleared: ['nurse'],
    nurse_confirmed: ['pharmacist'],
    med_reconciled: ['billing'],
    financial_cleared: ['receptionist'],
    discharged: ['receptionist'],
    finalized: [],
    cancelled: [],
  };
  return notificationMap[status] || [];
}

interface DischargeAction {
  workflowId: string;
  action: string;
  actorId: string;
  notes?: string;
  details?: Record<string, unknown>;
}

serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { workflowId, action, actorId, notes, details } =
      (await req.json()) as DischargeAction;

    // Validate input
    if (!workflowId || !action || !actorId) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: workflowId, action, actorId',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Fetch current workflow
    console.log(`[Discharge] Fetching workflow: ${workflowId}`);
    const { data: workflow, error: fetchError } = await supabase
      .from('discharge_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (fetchError || !workflow) {
      console.error(`[Discharge] Workflow not found: ${workflowId}`, fetchError);
      return new Response(
        JSON.stringify({ error: 'Workflow not found', code: fetchError?.code }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Validate state transition
    const transitions = TRANSITIONS[workflow.status];
    if (!transitions || !transitions[action]) {
      console.warn(
        `[Discharge] Invalid transition: ${workflow.status} -[${action}]-> ?`
      );
      return new Response(
        JSON.stringify({
          error: `Invalid transition: cannot perform '${action}' from status '${workflow.status}'`,
          currentStatus: workflow.status,
          allowedActions: Object.keys(transitions || {}),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Fetch actor's role
    console.log(`[Discharge] Checking actor role: ${actorId}`);
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', actorId)
      .single();

    if (roleError || !userRole) {
      console.error(`[Discharge] User role not found: ${actorId}`, roleError);
      return new Response(
        JSON.stringify({ error: 'User role not found' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Check role permission
    const allowedRoles = ROLE_PERMISSIONS[action];
    if (!allowedRoles.includes(userRole.role)) {
      console.warn(
        `[Discharge] Permission denied: ${userRole.role} tried ${action}`
      );
      return new Response(
        JSON.stringify({
          error: `Forbidden: role '${userRole.role}' cannot perform action '${action}'`,
          requiredRoles: allowedRoles,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: Apply state transition
    const { newStatus, newStep } = transitions[action];
    console.log(
      `[Discharge] Transitioning ${workflowId}: ${workflow.status} → ${newStatus}`
    );

    const updateData: Record<string, unknown> = {
      status: newStatus,
      current_step: newStep,
    };

    // Track who performed each step and capture step-specific data
    if (action === 'clinical_clear') {
      updateData.doctor_clearance_by = actorId;
      updateData.doctor_clearance_at = new Date().toISOString();
      updateData.clinical_notes = {
        ...(workflow.clinical_notes || {}),
        cleared_at: new Date().toISOString(),
        notes: notes || '',
        ...details,
      };
    } else if (action === 'nurse_confirm') {
      updateData.nurse_confirmed_by = actorId;
      updateData.nurse_confirmed_at = new Date().toISOString();
    } else if (action === 'med_reconcile') {
      updateData.pharmacist_reconciliation_by = actorId;
      updateData.pharmacist_reconciliation_at = new Date().toISOString();
      updateData.medication_reconciliation = {
        ...(workflow.medication_reconciliation || {}),
        ...details,
        reconciled_at: new Date().toISOString(),
        notes: notes || '',
      };
    } else if (action === 'financial_clear') {
      updateData.billing_clearance_by = actorId;
      updateData.billing_clearance_at = new Date().toISOString();
      updateData.financial_details = {
        ...(workflow.financial_details || {}),
        ...details,
        cleared_at: new Date().toISOString(),
      };
    } else if (action === 'checkout') {
      updateData.receptionist_checkout_by = actorId;
      updateData.receptionist_checkout_at = new Date().toISOString();
      updateData.checkout_details = {
        ...(workflow.checkout_details || {}),
        ...details,
        completed_at: new Date().toISOString(),
      };
    } else if (action === 'finalize') {
      // No additional data for finalize
    } else if (action === 'cancel') {
      updateData.cancellation_reason = notes || 'Not specified';
    }

    // Apply update
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('discharge_workflows')
      .update(updateData)
      .eq('id', workflowId)
      .select()
      .single();

    if (updateError) {
      console.error(`[Discharge] Update failed: ${workflowId}`, updateError);
      throw updateError;
    }

    console.log(`[Discharge] Transition complete: ${newStatus}`);

    // Step 6: Send real-time notification to next actor
    const notifyRoles = getNotificationRoles(newStatus);
    if (notifyRoles.length > 0) {
      console.log(`[Discharge] Notifying roles: ${notifyRoles.join(', ')}`);
      await supabase
        .channel(`discharge:${workflowId}`)
        .send({
          type: 'broadcast',
          event: 'step_advanced',
          payload: {
            workflowId,
            status: newStatus,
            step: newStep,
            notifyRoles,
            message: `Discharge workflow advanced to step ${newStep}: ${newStatus}`,
            timestamp: new Date().toISOString(),
          },
        });
    }

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        workflow: updatedWorkflow,
        transition: {
          from: workflow.status,
          to: newStatus,
          step: newStep,
          action,
          performer: actorId,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('[Discharge] Error:', error.message);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        code: 'DISCHARGE_ERROR',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authorize, getAuthorizedActor } from "../_shared/authorize.ts";
import { withRateLimit } from "../_shared/rateLimit.ts";
import { validateRequest, validationErrorResponse } from "../_shared/validation.ts";

const requestSchema = z.object({
  workflowId: z.string().uuid().optional(),
  action: z.enum(["initiate", "approve", "reject", "cancel"]),
  patientId: z.string().uuid().optional(),
  consultationId: z.string().uuid().optional(),
  reason: z.string().min(3).max(1000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

type DischargeWorkflowRow = {
  id: string;
  hospital_id: string;
  patient_id: string;
  consultation_id: string | null;
  initiated_by: string;
  current_step: "doctor" | "pharmacist" | "billing" | "nurse" | "completed" | "cancelled";
  status: "draft" | "in_progress" | "completed" | "cancelled";
  metadata: Record<string, unknown> | null;
  rejection_reason: string | null;
};

type RequestPayload = z.infer<typeof requestSchema>;

const STEP_ROLE_MAP = {
  doctor: ["doctor"],
  pharmacist: ["pharmacist"],
  billing: ["receptionist", "admin"],
  nurse: ["nurse"],
} as const;

const NEXT_STEP = {
  pharmacist: "billing",
  billing: "nurse",
  nurse: "completed",
} as const;

const PREVIOUS_STEP = {
  pharmacist: "doctor",
  billing: "pharmacist",
  nurse: "billing",
} as const;

const ACTION_TYPE_MAP = {
  initiate: "discharge_workflow_initiated",
  approve: "discharge_workflow_approved",
  reject: "discharge_workflow_rejected",
  cancel: "discharge_workflow_cancelled",
} as const;

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authError = await authorize(req, ["doctor", "pharmacist", "receptionist", "nurse", "admin"]);
  if (authError) return authError;

  const validation = await validateRequest(req, requestSchema);
  if (!validation.success) return validationErrorResponse(validation.error);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const actor = await getActorContext(req, supabase);
    if (!actor) {
      return new Response(JSON.stringify({ error: "Unauthorized actor context" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const payload = validation.data;

    if (payload.action === "initiate") {
      return await initiateWorkflow(supabase, actor, payload, corsHeaders);
    }

    if (!payload.workflowId) {
      return new Response(JSON.stringify({ error: "workflowId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: workflow, error: workflowError } = await supabase
      .from("discharge_workflows")
      .select("*")
      .eq("id", payload.workflowId)
      .single();

    if (workflowError || !workflow) {
      return new Response(JSON.stringify({ error: "Workflow not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const typedWorkflow = workflow as DischargeWorkflowRow;

    if (payload.action === "approve") {
      return await approveWorkflow(supabase, actor, typedWorkflow, payload, corsHeaders);
    }

    if (payload.action === "reject") {
      return await rejectWorkflow(supabase, actor, typedWorkflow, payload, corsHeaders);
    }

    return await cancelWorkflow(supabase, actor, typedWorkflow, corsHeaders);
  } catch (err) {
    console.error("[discharge-workflow]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

async function getActorContext(req: Request, supabase: ReturnType<typeof createClient>) {
  const { actor, response } = await getAuthorizedActor(
    req,
    ["doctor", "pharmacist", "receptionist", "nurse", "admin"],
  );
  if (response || !actor) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, hospital_id, first_name, last_name")
    .eq("user_id", actor.userId)
    .maybeSingle();

  if (!profile) return null;

  return {
    userId: actor.userId,
    hospitalId: (profile.hospital_id as string | null) ?? actor.hospitalId ?? '',
    fullName: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Unknown User",
    roles: actor.assignedRoles,
  };
}

async function initiateWorkflow(
  supabase: ReturnType<typeof createClient>,
  actor: { userId: string; hospitalId: string; fullName: string; roles: string[] },
  payload: RequestPayload,
  corsHeaders: Record<string, string>,
) {
  if (!actor.roles.includes("doctor")) {
    return new Response(JSON.stringify({ error: "Only doctors can initiate discharge" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (!payload.patientId) {
    return new Response(JSON.stringify({ error: "patientId is required for initiation" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const now = new Date().toISOString();

  const { data: workflow, error } = await supabase
    .from("discharge_workflows")
    .insert({
      hospital_id: actor.hospitalId,
      patient_id: payload.patientId,
      consultation_id: payload.consultationId ?? null,
      initiated_by: actor.userId,
      current_step: "pharmacist",
      status: "in_progress",
      last_action_by: actor.userId,
      last_action_at: now,
      metadata: {
        initiated_at: now,
        initiated_by_name: actor.fullName,
        ...payload.metadata,
      },
    })
    .select("*")
    .single();

  if (error || !workflow) {
    return new Response(JSON.stringify({ error: "Failed to create discharge workflow" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  await writeAuditTrail(supabase, workflow as DischargeWorkflowRow, actor, {
    transitionAction: "initiate",
    fromStep: "doctor",
    toStep: "pharmacist",
    reason: payload.reason ?? null,
  });

  await notifyRole(supabase, workflow as DischargeWorkflowRow, "pharmacist", {
    title: "Discharge workflow awaiting medication reconciliation",
    message: "A doctor initiated patient discharge and pharmacy clearance is now required.",
  });

  return new Response(JSON.stringify({ success: true, workflow }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function approveWorkflow(
  supabase: ReturnType<typeof createClient>,
  actor: { userId: string; hospitalId: string; fullName: string; roles: string[] },
  workflow: DischargeWorkflowRow,
  payload: RequestPayload,
  corsHeaders: Record<string, string>,
) {
  const currentStep = workflow.current_step;
  if (!(currentStep in NEXT_STEP)) {
    return new Response(JSON.stringify({ error: "Workflow cannot be approved from its current state" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const allowedRoles = STEP_ROLE_MAP[currentStep as keyof typeof STEP_ROLE_MAP] || [];
  if (!actor.roles.some((role) => allowedRoles.includes(role as never))) {
    return new Response(JSON.stringify({ error: "Forbidden for this workflow step" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const nextStep = NEXT_STEP[currentStep as keyof typeof NEXT_STEP];
  const now = new Date().toISOString();
  const nextStatus = nextStep === "completed" ? "completed" : "in_progress";

  const nextMetadata = {
    ...(workflow.metadata || {}),
    [`${currentStep}_approved_at`]: now,
    [`${currentStep}_approved_by`]: actor.userId,
  };

  const { data: updatedWorkflow, error } = await supabase
    .from("discharge_workflows")
    .update({
      current_step: nextStep,
      status: nextStatus,
      last_action_by: actor.userId,
      last_action_at: now,
      rejection_reason: null,
      metadata: nextMetadata,
    })
    .eq("id", workflow.id)
    .select("*")
    .single();

  if (error || !updatedWorkflow) {
    return new Response(JSON.stringify({ error: "Failed to advance discharge workflow" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  await writeAuditTrail(supabase, updatedWorkflow as DischargeWorkflowRow, actor, {
    transitionAction: "approve",
    fromStep: currentStep,
    toStep: nextStep,
    reason: payload.reason ?? null,
  });

  if (nextStep !== "completed") {
    const nextRole = nextStep === "billing" ? "receptionist" : nextStep;
    await notifyRole(supabase, updatedWorkflow as DischargeWorkflowRow, nextRole, {
      title: "Discharge workflow advanced",
      message: `Patient discharge is ready for the ${nextStep} step.`,
    });
  }

  return new Response(JSON.stringify({ success: true, workflow: updatedWorkflow }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function rejectWorkflow(
  supabase: ReturnType<typeof createClient>,
  actor: { userId: string; hospitalId: string; fullName: string; roles: string[] },
  workflow: DischargeWorkflowRow,
  payload: RequestPayload,
  corsHeaders: Record<string, string>,
) {
  if (!payload.reason) {
    return new Response(JSON.stringify({ error: "A rejection reason is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const currentStep = workflow.current_step;
  if (!(currentStep in PREVIOUS_STEP)) {
    return new Response(JSON.stringify({ error: "Workflow cannot be rejected from its current state" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const allowedRoles = STEP_ROLE_MAP[currentStep as keyof typeof STEP_ROLE_MAP] || [];
  if (!actor.roles.some((role) => allowedRoles.includes(role as never))) {
    return new Response(JSON.stringify({ error: "Forbidden for this workflow step" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const previousStep = PREVIOUS_STEP[currentStep as keyof typeof PREVIOUS_STEP];
  const now = new Date().toISOString();

  const { data: updatedWorkflow, error } = await supabase
    .from("discharge_workflows")
    .update({
      current_step: previousStep,
      status: "in_progress",
      last_action_by: actor.userId,
      last_action_at: now,
      rejection_reason: payload.reason,
      metadata: {
        ...(workflow.metadata || {}),
        [`${currentStep}_rejected_at`]: now,
        [`${currentStep}_rejected_by`]: actor.userId,
      },
    })
    .eq("id", workflow.id)
    .select("*")
    .single();

  if (error || !updatedWorkflow) {
    return new Response(JSON.stringify({ error: "Failed to reject discharge workflow" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  await writeAuditTrail(supabase, updatedWorkflow as DischargeWorkflowRow, actor, {
    transitionAction: "reject",
    fromStep: currentStep,
    toStep: previousStep,
    reason: payload.reason,
  });

  const previousRole = previousStep === "billing" ? "receptionist" : previousStep;
  await notifyRole(supabase, updatedWorkflow as DischargeWorkflowRow, previousRole, {
    title: "Discharge workflow returned for correction",
    message: `The ${currentStep} step rejected discharge and returned it to ${previousStep}. Reason: ${payload.reason}`,
  });

  return new Response(JSON.stringify({ success: true, workflow: updatedWorkflow }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function cancelWorkflow(
  supabase: ReturnType<typeof createClient>,
  actor: { userId: string; hospitalId: string; fullName: string; roles: string[] },
  workflow: DischargeWorkflowRow,
  corsHeaders: Record<string, string>,
) {
  if (!actor.roles.includes("doctor") && !actor.roles.includes("admin")) {
    return new Response(JSON.stringify({ error: "Only doctor or admin can cancel discharge workflow" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const { data: updatedWorkflow, error } = await supabase
    .from("discharge_workflows")
    .update({
      current_step: "cancelled",
      status: "cancelled",
      last_action_by: actor.userId,
      last_action_at: new Date().toISOString(),
    })
    .eq("id", workflow.id)
    .select("*")
    .single();

  if (error || !updatedWorkflow) {
    return new Response(JSON.stringify({ error: "Failed to cancel discharge workflow" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  await writeAuditTrail(supabase, updatedWorkflow as DischargeWorkflowRow, actor, {
    transitionAction: "cancel",
    fromStep: workflow.current_step,
    toStep: "cancelled",
    reason: null,
  });

  return new Response(JSON.stringify({ success: true, workflow: updatedWorkflow }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function writeAuditTrail(
  supabase: ReturnType<typeof createClient>,
  workflow: DischargeWorkflowRow,
  actor: { userId: string; hospitalId: string; fullName: string; roles: string[] },
  transition: {
    transitionAction: "initiate" | "approve" | "reject" | "cancel";
    fromStep: string | null;
    toStep: string | null;
    reason: string | null;
  },
) {
  const actorRole = actor.roles[0] ?? "unknown";

  await supabase.from("discharge_workflow_audit").insert({
    workflow_id: workflow.id,
    hospital_id: workflow.hospital_id,
    patient_id: workflow.patient_id,
    actor_id: actor.userId,
    actor_role: actorRole,
    transition_action: transition.transitionAction,
    from_step: transition.fromStep,
    to_step: transition.toStep,
    reason: transition.reason,
    metadata: {
      actor_name: actor.fullName,
    },
  });

  await supabase.from("activity_logs").insert({
    user_id: actor.userId,
    hospital_id: actor.hospitalId,
    action_type: ACTION_TYPE_MAP[transition.transitionAction],
    entity_type: "discharge_workflow",
    entity_id: workflow.id,
    details: {
      from_step: transition.fromStep,
      to_step: transition.toStep,
      reason: transition.reason,
    },
  });
}

async function notifyRole(
  supabase: ReturnType<typeof createClient>,
  workflow: DischargeWorkflowRow,
  role: string,
  notification: { title: string; message: string },
) {
  const targetRoles = role === "receptionist" ? ["receptionist", "admin"] : [role];

  const { data: recipients } = await supabase
    .from("user_roles")
    .select("user_id, role, hospital_id")
    .eq("hospital_id", workflow.hospital_id)
    .in("role", targetRoles);

  if (!recipients || recipients.length === 0) return;

  await supabase.from("notifications").insert(
    recipients.map((recipient) => ({
      hospital_id: workflow.hospital_id,
      recipient_id: recipient.user_id,
      sender_id: workflow.last_action_by,
      type: "task",
      title: notification.title,
      message: notification.message,
      priority: "high",
      category: "clinical",
      action_url: `/patients/${workflow.patient_id}`,
      metadata: {
        workflow_id: workflow.id,
        patient_id: workflow.patient_id,
        current_step: workflow.current_step,
        recipient_role: recipient.role,
      },
    })),
  );
}

serve((req) => withRateLimit(req, handler));
