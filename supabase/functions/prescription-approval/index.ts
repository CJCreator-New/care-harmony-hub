/**
 * Prescription Approval Workflow Edge Function
 * Orchestrates state transitions: initiated → pending_approval → approved → dispensed → completed
 * 
 * Enforces RBAC: Doctor initiates, Pharmacist approves, Nurse/system dispenses
 * Performs Drug Utilization Review (DUR) check before approval
 * Emits realtime events for UI updates
 */

// @ts-ignore — Deno types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Type definitions
interface WorkflowState {
  id: string;
  status:
    | "initiated"
    | "pending_approval"
    | "pending_clarification"
    | "approved"
    | "dispensed"
    | "completed"
    | "rejected"
    | "cancelled";
  current_step: number;
  prescription_id: string;
  hospital_id: string;
  initiated_by: string;
}

interface ActionPayload {
  workflowId: string;
  action: "review" | "approve" | "reject" | "clarify" | "dispense" | "complete";
  actorId: string;
  reason?: string; // For reject/clarify
  durWarnings?: string[];
  notes?: string;
}

// Allowed transitions per role/step
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  doctor_initiate: ["initiated"],
  pharmacist_review: ["initiated", "pending_clarification"],
  pharmacist_approve: ["pending_approval"],
  pharmacist_reject: ["pending_approval"],
  pharmacist_clarify: ["pending_approval"],
  nurse_dispense: ["approved"],
  nurse_complete: ["dispensed"],
};

const ALLOWED_ROLES: Record<string, string[]> = {
  review: ["pharmacist"],
  approve: ["pharmacist"],
  reject: ["pharmacist"],
  clarify: ["pharmacist"],
  dispense: ["nurse", "pharmacist"],
  complete: ["nurse", "pharmacist"],
};

// ─── State Machine Logic ──────────────────────────────────────────────────────

function getNextState(
  currentWorkflow: WorkflowState,
  action: string
): Partial<WorkflowState> {
  const transitions: Record<string, Record<string, Partial<WorkflowState>>> = {
    review: {
      initiated: { status: "pending_approval", current_step: 2 },
    },
    approve: {
      pending_approval: { status: "approved", current_step: 3 },
    },
    reject: {
      pending_approval: { status: "rejected", current_step: 0 },
    },
    clarify: {
      pending_approval: { status: "pending_clarification", current_step: 2 },
    },
    dispense: {
      approved: { status: "dispensed", current_step: 4 },
    },
    complete: {
      dispensed: { status: "completed", current_step: 5 },
    },
  };

  return transitions[action]?.[currentWorkflow.status] || {};
}

// ─── Drug Utilization Review (DUR) Stub ──────────────────────────────────────

/**
 * Perform basic DUR checks: drug interactions, duplicate therapy, dosage appropriateness.
 * In production, call external DUR service or use comprehensive drug database.
 */
async function performDURCheck(
  supabase: any,
  prescriptionId: string
): Promise<{ passed: boolean; warnings: string[] }> {
  try {
    const { data: prescription, error } = await supabase
      .from("prescriptions")
      .select("*, items:prescription_items(*), patient:patients(*)")
      .eq("id", prescriptionId)
      .single();

    if (error || !prescription) {
      return { passed: false, warnings: ["Prescription not found"] };
    }

    const warnings: string[] = [];

    // DUR Check 1: Duplicate therapy
    const duplicateDrugs = prescription.items.reduce(
      (acc: Record<string, number>, item: any) => {
        acc[item.medication_name] = (acc[item.medication_name] || 0) + 1;
        return acc;
      },
      {}
    );

    for (const [drug, count] of Object.entries(duplicateDrugs)) {
      if (count > 1) {
        warnings.push(`Duplicate therapy detected: ${drug} prescribed ${count} times`);
      }
    }

    // DUR Check 2: Dosage appropriateness (basic)
    for (const item of prescription.items) {
      if (item.dose_mg && item.dose_mg > 1000) {
        warnings.push(
          `High dose alert: ${item.medication_name} ${item.dose_mg}mg may exceed typical range`
        );
      }
    }

    // DUR Check 3: Age-specific contraindications (stub)
    const patientAge = prescription.patient?.age_years;
    if (patientAge && patientAge < 12) {
      const pediatricConcern = prescription.items.some((item: any) =>
        item.medication_name.match(/warfarin|statins|ace-inhibitors/i)
      );
      if (pediatricConcern) {
        warnings.push("Pediatric drug concern: verify appropriateness for age");
      }
    }

    const passed = warnings.length === 0;
    return { passed, warnings };
  } catch (err) {
    console.error("DUR check error:", err);
    return { passed: false, warnings: ["DUR check failed"] };
  }
}

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    // Initialize Supabase client with service role for server-side checks
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: ActionPayload = await req.json();
    const { workflowId, action, actorId, reason, durWarnings, notes } = payload;

    // ─── Validation ──────────────────────────────────────────────────────────────

    if (!workflowId || !action || !actorId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: workflowId, action, actorId" }),
        { status: 400 }
      );
    }

    // Fetch workflow
    const { data: workflow, error: workflowError } = await supabase
      .from("prescription_approval_workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (workflowError || !workflow) {
      return new Response(JSON.stringify({ error: "Workflow not found" }), { status: 404 });
    }

    // ─── RBAC Check ──────────────────────────────────────────────────────────────

    const { data: actor, error: actorError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", actorId)
      .eq("hospital_id", workflow.hospital_id)
      .single();

    if (actorError || !actor) {
      return new Response(JSON.stringify({ error: "User role not found" }), { status: 403 });
    }

    const allowedRoles = ALLOWED_ROLES[action] || [];
    if (!allowedRoles.includes(actor.role)) {
      return new Response(
        JSON.stringify({
          error: `Forbidden: ${actor.role} cannot perform ${action}. Allowed: ${allowedRoles.join(", ")}`,
        }),
        { status: 403 }
      );
    }

    // ─── State Transition Validation ──────────────────────────────────────────────

    const nextState = getNextState(workflow, action);
    if (Object.keys(nextState).length === 0) {
      return new Response(
        JSON.stringify({
          error: `Invalid transition: cannot ${action} from status ${workflow.status}`,
        }),
        { status: 400 }
      );
    }

    // ─── Perform Action-Specific Checks ──────────────────────────────────────────

    let updateData: Partial<WorkflowState> & Record<string, any> = {
      ...nextState,
      modified_at: new Date().toISOString(),
    };

    // DUR check on approve
    if (action === "approve") {
      const durResult = await performDURCheck(supabase, workflow.prescription_id);
      updateData.dur_check_passed = durResult.passed;
      updateData.dur_warnings = durResult.warnings;

      if (!durResult.passed) {
        // Don't block on DUR warnings, but flag for review
        console.warn("DUR warnings:", durResult.warnings);
      }
    }

    // Set approval metadata
    if (action === "approve") {
      updateData.approved_by = actorId;
      updateData.approved_at = new Date().toISOString();
    }

    // Set rejection metadata
    if (action === "reject") {
      updateData.rejection_reason = reason || "No reason provided";
      updateData.rejected_at = new Date().toISOString();
    }

    // Set clarification notes
    if (action === "clarify") {
      updateData.clarification_notes = notes || "Pharmacist requested clarification";
    }

    // ─── Update Workflow ────────────────────────────────────────────────────────────

    const { data: updatedWorkflow, error: updateError } = await supabase
      .from("prescription_approval_workflows")
      .update(updateData)
      .eq("id", workflowId)
      .select()
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Update failed: ${updateError.message}` }),
        { status: 500 }
      );
    }

    // ─── Audit Log ────────────────────────────────────────────────────────────────

    await supabase.from("audit_logs").insert({
      action_type: `prescription_approval_${action}`,
      resource_type: "prescription_approval_workflow",
      resource_id: workflowId,
      performed_by: actorId,
      hospital_id: workflow.hospital_id,
      details: {
        previous_status: workflow.status,
        new_status: updatedWorkflow.status,
        actor_role: actor.role,
        reason: reason || undefined,
      },
    });

    // ─── Realtime Notification ────────────────────────────────────────────────────

    const channel = supabase.channel(`workflow:${workflowId}`);
    await channel.send({
      type: "broadcast",
      event: "step_advanced",
      payload: {
        workflowId,
        action,
        status: updatedWorkflow.status,
        step: updatedWorkflow.current_step,
        timestamp: new Date().toISOString(),
      },
    });

    // ─── Response ────────────────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        workflow: updatedWorkflow,
        durWarnings: updateData.dur_warnings,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 200,
      }
    );
  } catch (err) {
    console.error("Workflow handler error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500 }
    );
  }
});
