import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getAuthorizedActor, type AuthorizedActor } from "../_shared/authorize.ts";
import { withRateLimit } from "../_shared/rateLimit.ts";
import { validateRequest } from "../_shared/validation.ts";
import { checkBodyHospital, findInHospital, hasAnyRole, isActorIdentity } from "../_shared/tenantScope.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// S0-06 / EDGE-06: identity and tenant come from the JWT. Appointment, doctor and
// patient are read from the appointment row in the caller's hospital, never from
// the body. Sessions are scoped through their appointment (the deployed
// telemedicine_sessions table may lack hospital_id, see the audit's schema-drift note).

const telemedicineSchema = z.object({
  action: z.string().min(1),
  data: z.any().optional(),
});

const STAFF_ROLES = ["admin", "doctor", "nurse", "receptionist"];
const CLINICAL_ROLES = ["admin", "doctor", "nurse"];

type Db = ReturnType<typeof createClient>;
type Json = (status: number, payload: Record<string, unknown>) => Response;

interface VideoSession {
  id: string;
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  session_token: string;
  room_id: string;
  status: "scheduled" | "active" | "ended" | "cancelled";
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const json: Json = (status, payload) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  const { actor, response: authError } = await getAuthorizedActor(req, STAFF_ROLES);
  if (authError || !actor) return authError ?? json(401, { error: "Unauthorized" });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const validation = await validateRequest(req, telemedicineSchema);
    if (!validation.success) {
      return json(400, { error: "Validation failed", details: validation.error });
    }
    const { action } = validation.data;
    const data = (validation.data.data ?? {}) as Record<string, unknown>;

    const hospital = checkBodyHospital(actor.hospitalId, data.hospital_id);
    if (!hospital.ok) return json(hospital.status, { error: hospital.error });

    switch (action) {
      case "create_session":
        return await createVideoSession(supabase, actor, data, json);
      case "join_session":
        return await joinVideoSession(supabase, actor, data, json);
      case "end_session":
        return await endVideoSession(supabase, actor, data, json);
      case "record_consultation":
        return await recordConsultationNotes(supabase, actor, data, json);
      default:
        return json(400, { error: "Invalid action" });
    }
  } catch (error) {
    console.error("telemedicine error:", error);
    return json(500, { error: "Internal server error" });
  }
};

type AppointmentRow = { id: string; hospital_id: string; doctor_id: string | null; patient_id: string; status: string | null };

async function loadAppointment(supabase: Db, appointmentId: unknown, hospitalId: string) {
  return await findInHospital<AppointmentRow>(supabase as never, "appointments", appointmentId, hospitalId, {
    select: "id, hospital_id, doctor_id, patient_id, status",
  });
}

/** Session plus its appointment, both in the caller's hospital, or null. */
async function loadSession(supabase: Db, sessionId: unknown, hospitalId: string) {
  if (typeof sessionId !== "string" || sessionId.length === 0) return null;
  const { data: session, error } = await supabase
    .from("telemedicine_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !session) return null;
  if (session.hospital_id != null && session.hospital_id !== hospitalId) return null;
  const appointment = await loadAppointment(supabase, session.appointment_id, hospitalId);
  if (!appointment) return null;
  return { session, appointment };
}

async function createVideoSession(supabase: Db, actor: AuthorizedActor, data: Record<string, unknown>, json: Json) {
  if (!hasAnyRole(actor, CLINICAL_ROLES)) return json(403, { error: "Forbidden - role cannot start a session" });

  const appointment = await loadAppointment(supabase, data.appointment_id, actor.hospitalId);
  if (!appointment) return json(404, { error: "Appointment not found" });
  if (!appointment.doctor_id) return json(409, { error: "Appointment has no assigned doctor" });

  // Body doctor_id / patient_id (still sent by the client) are ignored: the
  // appointment row is the source of truth.

  const sessionId = crypto.randomUUID();
  const roomId = `room_${crypto.randomUUID()}`;
  const doctorToken = generateSessionToken(appointment.doctor_id, "doctor");
  const patientToken = generateSessionToken(appointment.patient_id, "patient");

  const session: VideoSession = {
    id: sessionId,
    appointment_id: appointment.id,
    doctor_id: appointment.doctor_id,
    patient_id: appointment.patient_id,
    session_token: doctorToken,
    room_id: roomId,
    status: "scheduled",
  };

  const { error } = await supabase
    .from("telemedicine_sessions")
    .insert({ ...session, hospital_id: actor.hospitalId });
  if (error) throw error;

  const { error: aptError } = await supabase
    .from("appointments")
    .update({ status: "in_progress", telemedicine_session_id: sessionId })
    .eq("id", appointment.id)
    .eq("hospital_id", actor.hospitalId);
  if (aptError) throw aptError;

  return json(200, {
    session_id: sessionId,
    room_id: roomId,
    doctor_token: doctorToken,
    patient_token: patientToken,
    join_url: `https://meet.caresync.com/room/${roomId}`,
  });
}

async function joinVideoSession(supabase: Db, actor: AuthorizedActor, data: Record<string, unknown>, json: Json) {
  const found = await loadSession(supabase, data.session_id, actor.hospitalId);
  if (!found) return json(404, { error: "Session not found" });
  const { session } = found;

  // Only the assigned doctor joins from a staff account. Body user_id/user_type
  // are ignored; the participant is always the JWT user.
  if (!isActorIdentity(actor, session.doctor_id)) {
    return json(403, { error: "Forbidden - only the assigned doctor can join this session" });
  }

  if (session.status === "scheduled") {
    const { error } = await supabase
      .from("telemedicine_sessions")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", session.id);
    if (error) throw error;
  }

  const { error: partError } = await supabase.from("session_participants").insert({
    session_id: session.id,
    user_id: actor.userId,
    user_type: "doctor",
    joined_at: new Date().toISOString(),
  });
  if (partError) throw partError;

  const token = generateSessionToken(actor.userId, "doctor");
  return json(200, {
    session_id: session.id,
    room_id: session.room_id,
    status: "active",
    participant_token: token,
    token,
  });
}

async function endVideoSession(supabase: Db, actor: AuthorizedActor, data: Record<string, unknown>, json: Json) {
  const found = await loadSession(supabase, data.session_id, actor.hospitalId);
  if (!found) return json(404, { error: "Session not found" });
  const { session, appointment } = found;

  const isAdmin = hasAnyRole(actor, ["admin"]);
  if (!isAdmin && !isActorIdentity(actor, session.doctor_id)) {
    return json(403, { error: "Forbidden - only the assigned doctor or an admin can end this session" });
  }

  const endTime = new Date().toISOString();
  const { error } = await supabase
    .from("telemedicine_sessions")
    .update({ status: "ended", ended_at: endTime })
    .eq("id", session.id);
  if (error) throw error;

  const { error: aptError } = await supabase
    .from("appointments")
    .update({ status: "completed" })
    .eq("id", appointment.id)
    .eq("hospital_id", actor.hospitalId);
  if (aptError) throw aptError;

  await supabase
    .from("session_participants")
    .update({ left_at: endTime })
    .eq("session_id", session.id)
    .is("left_at", null);

  return json(200, { session_id: session.id, status: "ended", ended_at: endTime });
}

async function recordConsultationNotes(supabase: Db, actor: AuthorizedActor, data: Record<string, unknown>, json: Json) {
  // Only the session's doctor writes notes or prescriptions (EDGE-06).
  if (!hasAnyRole(actor, ["doctor"])) return json(403, { error: "Forbidden - only a doctor can record a consultation" });

  const found = await loadSession(supabase, data.session_id, actor.hospitalId);
  if (!found) return json(404, { error: "Session not found" });
  const { session } = found;
  if (!isActorIdentity(actor, session.doctor_id)) {
    return json(403, { error: "Forbidden - only the session's doctor can record this consultation" });
  }

  const notes = (data.consultation_notes ?? {}) as Record<string, unknown>;
  const prescriptions = Array.isArray(data.prescriptions) ? (data.prescriptions as Record<string, unknown>[]) : [];

  const consultationId = crypto.randomUUID();
  const { error: consultError } = await supabase.from("consultations").insert({
    id: consultationId,
    hospital_id: actor.hospitalId,
    appointment_id: session.appointment_id,
    doctor_id: session.doctor_id,
    patient_id: session.patient_id,
    consultation_type: "telemedicine",
    chief_complaint: notes.chief_complaint,
    history_present_illness: notes.history,
    physical_examination: notes.examination || "Telemedicine consultation - limited physical exam",
    diagnosis: notes.diagnosis,
    treatment_plan: notes.treatment_plan,
    notes: notes.additional_notes,
    session_id: session.id,
  });
  // Never report success for notes that were not saved.
  if (consultError) {
    console.error("telemedicine consultation insert failed:", consultError);
    return json(500, { error: "Consultation notes were not saved" });
  }

  if (prescriptions.length > 0) {
    const prescriptionRecords = prescriptions.map((rx) => ({
      id: crypto.randomUUID(),
      hospital_id: actor.hospitalId,
      consultation_id: consultationId,
      patient_id: session.patient_id,
      prescribed_by: actor.profileId ?? actor.userId,
      doctor_id: session.doctor_id,
      medication_name: rx.medication,
      dosage: rx.dosage,
      frequency: rx.frequency,
      duration: rx.duration,
      instructions: rx.instructions,
      status: "active",
    }));
    const { error: rxError } = await supabase.from("prescriptions").insert(prescriptionRecords);
    if (rxError) {
      console.error("telemedicine prescription insert failed:", rxError);
      return json(500, {
        error: "Consultation saved but prescriptions were not saved",
        consultation_id: consultationId,
        prescriptions_created: 0,
      });
    }
  }

  return json(200, { consultation_id: consultationId, prescriptions_created: prescriptions.length });
}

function generateSessionToken(userId: string, userType: string): string {
  // Unsigned placeholder: no video provider verifies it yet (EDGE-06 follow-up:
  // issue signed, short-lived room tokens from a real provider).
  const payload = {
    user_id: userId,
    user_type: userType,
    timestamp: Date.now(),
    expires: Date.now() + 2 * 60 * 60 * 1000,
  };
  return btoa(JSON.stringify(payload));
}

serve((req) => withRateLimit(req, handler));
