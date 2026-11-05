import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthorizedActor } from "../_shared/authorize.ts";
import { validateRequest } from "../_shared/validation.ts";
import { withRateLimit } from "../_shared/rateLimit.ts";
import {
  DEFAULT_FROM_ADDRESS,
  buildFromHeader,
  escapeHtml as e,
  normalizeRecipients,
  recipientsOutsideAllowlist,
  sanitizeDisplayName,
} from "../_shared/emailSafety.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// S0-06 / EDGE-16:
//   - The recipient must be a patient or staff member of the caller's hospital.
//   - The hospital name (display name and template text) comes from the
//     database, not the body; the From address is fixed.
//   - Every interpolated value is HTML-escaped.
//   - Every send is written to activity_logs.

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const notificationSchema = z.object({
  type: z.enum(["appointment_reminder", "prescription_ready", "lab_results", "invoice", "custom"]),
  recipientEmail: z.string().email(),
  recipientName: z.string().min(1).max(200),
  // Accepted for backward compatibility, ignored: the server uses the caller's hospital row.
  hospitalName: z.string().optional(),
  data: z.object({
    appointmentDate: z.string().max(100).optional(),
    appointmentTime: z.string().max(100).optional(),
    doctorName: z.string().max(200).optional(),
    prescriptionDetails: z.string().max(2000).optional(),
    labTestName: z.string().max(200).optional(),
    invoiceNumber: z.string().max(100).optional(),
    invoiceAmount: z.string().max(100).optional(),
    customSubject: z.string().max(200).optional(),
    customMessage: z.string().max(5000).optional(),
  }).optional(),
});

type NotificationRequest = z.infer<typeof notificationSchema>;

function getEmailContent(request: NotificationRequest, hospitalName: string): { subject: string; html: string } {
  const { type, recipientName, data } = request;

  switch (type) {
    case "appointment_reminder":
      return {
        subject: `Appointment Reminder - ${hospitalName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Appointment Reminder</h2>
            <p>Dear ${e(recipientName)},</p>
            <p>This is a friendly reminder about your upcoming appointment at <strong>${e(hospitalName)}</strong>.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Date:</strong> ${e(data?.appointmentDate || 'N/A')}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${e(data?.appointmentTime || 'N/A')}</p>
              ${data?.doctorName ? `<p style="margin: 5px 0;"><strong>Doctor:</strong> ${e(data.doctorName)}</p>` : ''}
            </div>
            <p>Please arrive 15 minutes before your scheduled time.</p>
            <p>Best regards,<br>${e(hospitalName)}</p>
          </div>
        `,
      };

    case "prescription_ready":
      return {
        subject: `Your Prescription is Ready - ${hospitalName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #16a34a;">Prescription Ready for Pickup</h2>
            <p>Dear ${e(recipientName)},</p>
            <p>Your prescription is now ready for pickup at <strong>${e(hospitalName)}</strong> pharmacy.</p>
            ${data?.prescriptionDetails ? `
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Prescription Details:</strong></p>
              <p>${e(data.prescriptionDetails)}</p>
            </div>
            ` : ''}
            <p>Please bring a valid ID when collecting your medication.</p>
            <p>Best regards,<br>${e(hospitalName)} Pharmacy</p>
          </div>
        `,
      };

    case "lab_results":
      return {
        subject: `Lab Results Available - ${hospitalName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7c3aed;">Lab Results Available</h2>
            <p>Dear ${e(recipientName)},</p>
            <p>Your lab results are now available at <strong>${e(hospitalName)}</strong>.</p>
            ${data?.labTestName ? `
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Test:</strong> ${e(data.labTestName)}</p>
            </div>
            ` : ''}
            <p>Please contact us or visit the patient portal to view your results.</p>
            <p>Best regards,<br>${e(hospitalName)} Laboratory</p>
          </div>
        `,
      };

    case "invoice":
      return {
        subject: `Invoice from ${hospitalName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626;">Invoice Notification</h2>
            <p>Dear ${e(recipientName)},</p>
            <p>You have a new invoice from <strong>${e(hospitalName)}</strong>.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              ${data?.invoiceNumber ? `<p style="margin: 5px 0;"><strong>Invoice #:</strong> ${e(data.invoiceNumber)}</p>` : ''}
              ${data?.invoiceAmount ? `<p style="margin: 5px 0;"><strong>Amount:</strong> ${e(data.invoiceAmount)}</p>` : ''}
            </div>
            <p>Please contact our billing department for payment options.</p>
            <p>Best regards,<br>${e(hospitalName)} Billing</p>
          </div>
        `,
      };

    case "custom":
      return {
        subject: data?.customSubject || `Message from ${hospitalName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">${e(data?.customSubject || 'Notification')}</h2>
            <p>Dear ${e(recipientName)},</p>
            <p>${e(data?.customMessage || '')}</p>
            <p>Best regards,<br>${e(hospitalName)}</p>
          </div>
        `,
      };

    default:
      throw new Error(`Unknown notification type: ${type}`);
  }
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (status: number, payload: Record<string, unknown>) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  const { actor, response: authError } = await getAuthorizedActor(req, ['admin', 'doctor', 'nurse', 'receptionist']);
  if (authError || !actor) return authError ?? json(401, { error: "Unauthorized" });

  try {
    const validation = await validateRequest(req, notificationSchema);
    if (!validation.success) {
      return json(400, { error: "Validation failed", details: validation.error });
    }
    const request = validation.data;

    const recipient = normalizeRecipients(request.recipientEmail, 1);
    if (!recipient.ok) return json(recipient.status, { error: recipient.error });
    const email = recipient.value[0];

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const [patients, staff, hospital] = await Promise.all([
      supabase.from("patients").select("email").eq("hospital_id", actor.hospitalId).eq("email", email).limit(1),
      supabase.from("profiles").select("email").eq("hospital_id", actor.hospitalId).eq("email", email).limit(1),
      supabase.from("hospitals").select("name").eq("id", actor.hospitalId).maybeSingle(),
    ]);
    if (patients.error || staff.error) throw patients.error ?? staff.error;

    const known = [...(patients.data ?? []), ...(staff.data ?? [])].map((r) => r.email as string);
    if (recipientsOutsideAllowlist([email], known).length > 0) {
      return json(403, { error: "Recipient must be a patient or staff member of your hospital" });
    }

    const hospitalName = sanitizeDisplayName(hospital.data?.name, "CareSync");
    const { subject, html } = getEmailContent(request, hospitalName);

    const emailResponse = await resend.emails.send({
      from: buildFromHeader(hospitalName, Deno.env.get("NOTIFICATION_FROM_ADDRESS") || DEFAULT_FROM_ADDRESS),
      to: [email],
      subject,
      html,
    });

    await supabase.from("activity_logs").insert({
      hospital_id: actor.hospitalId,
      user_id: actor.userId,
      action_type: "notification_email_sent",
      entity_type: "email",
      entity_id: (emailResponse as { data?: { id?: string } })?.data?.id ?? null,
      severity: "info",
      details: { type: request.type, recipient_count: 1 },
    });

    return json(200, { success: true, ...emailResponse });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve((req) => withRateLimit(req, handler));

