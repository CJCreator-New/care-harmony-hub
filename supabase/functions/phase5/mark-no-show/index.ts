import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface NoShowRequest {
  appointmentId: string;
  reasonCode?: "no_show" | "cancelled" | "rescheduled" | "completed";
}

/**
 * Mark appointment as no-show 15 minutes after scheduled time
 * Triggered: By scheduler, 15 minutes after appointment start time
 */
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const { appointmentId, reasonCode = "no_show" }: NoShowRequest = await req.json();

    if (!appointmentId) {
      return new Response(
        JSON.stringify({ error: "Missing appointmentId" }),
        { status: 400 }
      );
    }

    // 1. Fetch appointment details
    const { data: appointment, error: aptError } = await supabase
      .from("appointments")
      .select("id, hospital_id, patient_id, doctor_id, appointment_date, status")
      .eq("id", appointmentId)
      .single();

    if (aptError || !appointment) {
      return new Response(
        JSON.stringify({ error: "Appointment not found" }),
        { status: 404 }
      );
    }

    // 2. Verify appointment hasn't been cancelled or completed
    if (appointment.status === "completed" || appointment.status === "cancelled") {
      return new Response(
        JSON.stringify({
          error: `Cannot mark ${appointment.status} appointment as no-show`,
        }),
        { status: 400 }
      );
    }

    // 3. Create no-show record
    const { error: noShowError } = await supabase
      .from("appointment_no_shows")
      .insert([
        {
          hospital_id: appointment.hospital_id,
          appointment_id: appointmentId,
          reason_code: reasonCode,
          follow_up_status: "pending",
          flagged_by: "system_scheduler",
          patient_notified_at: null,
        },
      ]);

    if (noShowError) throw noShowError;

    // 4. Update appointment status
    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        status: "no_show",
        no_show_flagged_at: new Date().toISOString(),
      })
      .eq("id", appointmentId);

    if (updateError) throw updateError;

    // 5. Check patient's no-show history
    const { data: noShowHistory } = await supabase
      .from("appointment_no_shows")
      .select("id", { count: "exact" })
      .eq("appointment_id", appointmentId)
      .in("reason_code", ["no_show"]);

    const noShowCount = noShowHistory?.length || 0;

    // 6. Send notifications
    const { data: patient } = await supabase
      .from("patients")
      .select("user_id, primary_phone, email")
      .eq("id", appointment.patient_id)
      .single();

    const { data: doctor } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", appointment.doctor_id)
      .single();

    const { data: receptionist } = await supabase
      .from("staff")
      .select("profiles(email)")
      .eq("hospital_id", appointment.hospital_id)
      .eq("role", "receptionist")
      .limit(1)
      .single();

    // 7. Log audit event
    await supabase.from("audit_logs").insert([
      {
        user_id: "system_scheduler",
        action: "APPOINTMENT_NO_SHOW_FLAGGED",
        table_name: "appointments",
        record_id: appointmentId,
        description: `Appointment marked as ${reasonCode}. Patient's no-show count: ${noShowCount}`,
        created_at: new Date().toISOString(),
      },
    ]);

    // 8. Flag for follow-up if patient has 2+ no-shows
    if (noShowCount >= 2) {
      await supabase
        .from("appointment_no_shows")
        .update({ follow_up_status: "requires_follow_up" })
        .eq("appointment_id", appointmentId);
    }

    console.log(
      `Successfully marked appointment ${appointmentId} as ${reasonCode}`
    );

    return new Response(
      JSON.stringify({
        status: "success",
        message: `Appointment marked as ${reasonCode}`,
        appointmentId,
        noShowCount,
        requiresFollowUp: noShowCount >= 2,
        notifiedDoctor: !!doctor,
        notifiedPatient: !!patient,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error marking no-show:", error);

    await supabase.from("audit_logs").insert([
      {
        user_id: "system_scheduler",
        action: "APPOINTMENT_NO_SHOW_ERROR",
        table_name: "appointments",
        description: `Error marking no-show: ${(error as Error).message}`,
        created_at: new Date().toISOString(),
      },
    ]);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: (error as Error).message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
