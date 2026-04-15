import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addDays, addWeeks, addMonths, isBefore, isAfter, format } from "https://esm.sh/date-fns@2.29.3";

interface RecurrencePattern {
  id: string;
  appointment_id: string;
  hospital_id: string;
  pattern_type: string;
  recurrence_rule: Record<string, any>;
  start_date: string;
  end_date?: string;
  max_occurrences?: number;
  exceptions: string[];
  created_by: string;
}

interface Appointment {
  id: string;
  hospital_id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  status: string;
  specialty?: string;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Calculate next occurrence date based on pattern
 */
function calculateNextDate(
  currentDate: Date,
  pattern: RecurrencePattern
): Date {
  const { pattern_type, recurrence_rule } = pattern;
  const interval = recurrence_rule.interval || 1;

  switch (pattern_type) {
    case "daily":
      return addDays(currentDate, interval);
    case "weekly":
      return addWeeks(currentDate, interval);
    case "bi_weekly":
      return addWeeks(currentDate, 2);
    case "monthly":
      return addMonths(currentDate, interval);
    default:
      return addDays(currentDate, 1);
  }
}

/**
 * Check if date conflicts with existing appointments
 */
async function checkConflict(
  appointmentDate: Date,
  doctorId: string,
  hospitalId: string,
  appointmentDuration: number = 30
): Promise<boolean> {
  const startTime = appointmentDate;
  const endTime = new Date(startTime.getTime() + appointmentDuration * 60000);

  const { data: conflicts } = await supabase
    .from("appointments")
    .select("id, appointment_date")
    .eq("hospital_id", hospitalId)
    .eq("doctor_id", doctorId)
    .eq("status", "scheduled")
    .gte("appointment_date", startTime.toISOString())
    .lt("appointment_date", endTime.toISOString());

  return (conflicts?.length || 0) > 0;
}

/**
 * Generate recurring appointments for next 30 days
 * Triggered: Daily at midnight
 */
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    console.log("Starting recurring appointment generation...");

    // Fetch all active recurrence patterns
    const { data: patterns, error: patternError } = await supabase
      .from("appointment_recurrence_patterns")
      .select(
        `
        *,
        appointments:appointment_id (
          id, hospital_id, patient_id, doctor_id, 
          appointment_date, specialty, status
        )
      `
      )
      .not("id", "is", null);

    if (patternError) throw patternError;

    let generatedCount = 0;
    const errors: string[] = [];

    for (const pattern of patterns || []) {
      try {
        const sourceAppt = Array.isArray(pattern.appointments)
          ? pattern.appointments[0]
          : pattern.appointments;

        if (!sourceAppt) continue;

        const startDate = new Date(pattern.start_date);
        const endDate = pattern.end_date ? new Date(pattern.end_date) : null;
        const maxOccurrences = pattern.max_occurrences || 30;

        let currentDate = new Date(startDate);
        let occurrenceCount = 0;

        // Generate occurrences for next 30 days
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        while (occurrenceCount < maxOccurrences && isBefore(currentDate, thirtyDaysFromNow)) {
          // Check end date
          if (endDate && isAfter(currentDate, endDate)) break;

          // Check exceptions
          const isException = pattern.exceptions?.some(
            (exc: string) =>
              new Date(exc).toDateString() === currentDate.toDateString()
          );

          if (!isException) {
            // Check for conflicts
            const hasConflict = await checkConflict(
              currentDate,
              sourceAppt.doctor_id,
              sourceAppt.hospital_id,
              30
            );

            if (!hasConflict) {
              // Create new appointment
              const { error: insertError } = await supabase
                .from("appointments")
                .insert([
                  {
                    hospital_id: sourceAppt.hospital_id,
                    patient_id: sourceAppt.patient_id,
                    doctor_id: sourceAppt.doctor_id,
                    appointment_date: currentDate.toISOString(),
                    status: "scheduled",
                    specialty: sourceAppt.specialty,
                    recurrence_pattern_id: pattern.id,
                    created_by: "system_scheduler",
                    notes: `Auto-generated from recurrence pattern ${pattern.id}`,
                  },
                ]);

              if (insertError) {
                errors.push(
                  `Failed to create occurrence for pattern ${pattern.id}: ${insertError.message}`
                );
              } else {
                generatedCount++;
              }
            }
          }

          // Calculate next date
          currentDate = calculateNextDate(currentDate, pattern);
          occurrenceCount++;
        }
      } catch (error) {
        errors.push(
          `Error processing pattern ${pattern.id}: ${(error as Error).message}`
        );
      }
    }

    // Log audit event
    await supabase.from("audit_logs").insert([
      {
        user_id: "system_scheduler",
        action: "RECURRING_APPOINTMENTS_GENERATED",
        table_name: "appointments",
        description: `Generated ${generatedCount} recurring appointments with ${errors.length} errors`,
        created_at: new Date().toISOString(),
      },
    ]);

    console.log(
      `Successfully generated ${generatedCount} recurring appointments`
    );

    return new Response(
      JSON.stringify({
        status: "success",
        generated_count: generatedCount,
        errors: errors,
        message: `Generated ${generatedCount} recurring appointments`,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating recurring appointments:", error);

    // Log error to audit trail
    await supabase.from("audit_logs").insert([
      {
        user_id: "system_scheduler",
        action: "RECURRING_APPOINTMENTS_ERROR",
        table_name: "appointments",
        description: `Error during recurring appointment generation: ${(error as Error).message}`,
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
