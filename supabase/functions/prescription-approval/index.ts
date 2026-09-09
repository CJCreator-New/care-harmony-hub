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
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getAuthorizedActor } from "../_shared/authorize.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// Roles that can participate in the approval workflow (per-action RBAC enforced below).
const AUTHORIZED_ROLES = ["admin", "doctor", "pharmacist", "nurse"];

// actorId is intentionally NOT accepted from the body — it is derived from the JWT.
const actionSchema = z.object({
  workflowId: z.string().uuid(),
  action: z.enum(["review", "approve", "reject", "clarify", "dispense", "complete"]),
  reason: z.string().max(2000).optional(),
  durWarnings: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
});

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
    // ✅ CRITICAL: Verify hospital_id from workflow matches prescription
    // This prevents cross-hospital prescription access
    const { data: workflow, error: wfError } = await supabase
      .from("prescription_approval_workflows")
      .select("hospital_id")
      .eq("prescription_id", prescriptionId)
      .single();

    if (wfError || !workflow || prescription.hospital_id !== workflow.hospital_id) {
      return { passed: false, warnings: ["Hospital context mismatch - security violation"] };
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

    // DUR Check 3: Age-specific contraindications
    const patientAge = prescription.patient?.age_years;
    if (patientAge && patientAge < 12) {
      const pediatricConcern = prescription.items.some((item: any) =>
        item.medication_name.match(/warfarin|statins|ace-inhibitors/i)
      );
      if (pediatricConcern) {
        warnings.push("Pediatric drug concern: verify appropriateness for age");
      }
    }

    // DUR Check 4: Pediatric weight-based dosing check (AAP guidelines)
    const patientWeight = prescription.patient?.weight_kg;
    if (patientAge && patientAge < 18 && patientWeight && patientWeight > 0) {
      for (const item of prescription.items || []) {
        const drug = (item.medication_name || "").toLowerCase();
        const doseMg = item.dose_mg || 0;
        const freq = (item.frequency || "BID").toUpperCase();
        const dosesPerDay = freq.includes("TID") ? 3 : freq.includes("QID") ? 4 : freq.includes("Q4") ? 5 : 2;
        const dailyDose = doseMg * dosesPerDay;
        const mgKgDay = dailyDose / patientWeight;

        if (drug.includes("amoxicillin") && mgKgDay > 90 * 1.1) {
          warnings.push(
            `Pediatric overdose warning: Amoxicillin ${Math.round(mgKgDay)} mg/kg/day exceeds 110% of AAP maximum guideline (90 mg/kg/day). Clinical override required.`
          );
        } else if ((drug.includes("acetaminophen") || drug.includes("paracetamol")) && mgKgDay > 75 * 1.1) {
          warnings.push(
            `Pediatric overdose warning: Acetaminophen ${Math.round(mgKgDay)} mg/kg/day exceeds 110% of AAP maximum guideline (75 mg/kg/day). Clinical override required.`
          );
        } else if (drug.includes("ibuprofen") && mgKgDay > 40 * 1.1) {
          warnings.push(
            `Pediatric overdose warning: Ibuprofen ${Math.round(mgKgDay)} mg/kg/day exceeds 110% of AAP maximum guideline (40 mg/kg/day). Clinical override required.`
          );
        }
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
  const corsHeaders = getCorsHeaders(req);
  const json = (status: number, payload: Record<string, unknown>) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── AuthZ: identity comes from the JWT, never the request body ──
    const { actor, response: authErr } = await getAuthorizedActor(req, AUTHORIZED_ROLES);
    if (authErr) {
      return new Response(await authErr.text(), {
        status: authErr.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const actorId = actor!.userId;

    // Initialize Supabase client with service role for server-side checks
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const parsed = actionSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json(400, {
        error: "Validation failed",
        details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
      });
    }
    const { workflowId, action, reason, durWarnings, notes } = parsed.data;

    // Fetch workflow
    const { data: workflow, error: workflowError } = await supabase
      .from("prescription_approval_workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (workflowError || !workflow) {
      return json(404, { error: "Workflow not found" });
    }

    // ✅ Extract hospital_id from workflow for all subsequent queries
    const hospitalId = workflow.hospital_id;
    if (!hospitalId) {
      return json(400, { error: "Hospital context required for prescription workflow" });
    }

    // Prevent cross-hospital actions: caller's hospital must match the workflow's.
    if (actor!.hospitalId && actor!.hospitalId !== hospitalId) {
      return json(403, { error: "Forbidden - hospital scope mismatch" });
    }

    // ─── RBAC Check (per-action) ──────────────────────────────────────────────────
    // Use the roles from the verified JWT context (authorize.ts) rather than trusting
    // a body-supplied actor id. This also fixes a latent bug where the previous lookup
    // matched user_roles.user_id (auth uid) against a profile id.

    const allowedRoles = ALLOWED_ROLES[action] || [];
    const actorRoleName = actor!.assignedRoles.find((role) => allowedRoles.includes(role));
    if (!actorRoleName) {
      return json(403, {
        error: `Forbidden: your role(s) cannot perform ${action}. Allowed: ${allowedRoles.join(", ")}`,
      });
    }

    // Resolve the caller's profile id for columns that FK to profiles(id).
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", actorId)
      .maybeSingle();
    const profileId = callerProfile?.id ?? null;

    // ─── State Transition Validation ──────────────────────────────────────────────

    const nextState = getNextState(workflow, action);
    if (Object.keys(nextState).length === 0) {
      return json(400, {
        error: `Invalid transition: cannot ${action} from status ${workflow.status}`,
      });
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

    // Set approval metadata (approved_by FKs to profiles.id)
    if (action === "approve") {
      updateData.approved_by = profileId;
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
      return json(500, { error: `Update failed: ${updateError.message}` });
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
        actor_role: actorRoleName,
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

    return json(200, {
      success: true,
      workflow: updatedWorkflow,
      durWarnings: updateData.dur_warnings,
    });
  } catch (err) {
    console.error("Workflow handler error:", err);
    return json(500, { error: "Workflow action failed" });
  }
});
