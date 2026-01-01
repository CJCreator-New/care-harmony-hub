import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "appointment_reminder" | "prescription_ready" | "lab_results" | "invoice" | "custom";
  recipientEmail: string;
  recipientName: string;
  hospitalName: string;
  data?: {
    appointmentDate?: string;
    appointmentTime?: string;
    doctorName?: string;
    prescriptionDetails?: string;
    labTestName?: string;
    invoiceNumber?: string;
    invoiceAmount?: string;
    customSubject?: string;
    customMessage?: string;
  };
}

function getEmailContent(request: NotificationRequest): { subject: string; html: string } {
  const { type, recipientName, hospitalName, data } = request;

  switch (type) {
    case "appointment_reminder":
      return {
        subject: `Appointment Reminder - ${hospitalName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Appointment Reminder</h2>
            <p>Dear ${recipientName},</p>
            <p>This is a friendly reminder about your upcoming appointment at <strong>${hospitalName}</strong>.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Date:</strong> ${data?.appointmentDate || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${data?.appointmentTime || 'N/A'}</p>
              ${data?.doctorName ? `<p style="margin: 5px 0;"><strong>Doctor:</strong> ${data.doctorName}</p>` : ''}
            </div>
            <p>Please arrive 15 minutes before your scheduled time.</p>
            <p>Best regards,<br>${hospitalName}</p>
          </div>
        `,
      };

    case "prescription_ready":
      return {
        subject: `Your Prescription is Ready - ${hospitalName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #16a34a;">Prescription Ready for Pickup</h2>
            <p>Dear ${recipientName},</p>
            <p>Your prescription is now ready for pickup at <strong>${hospitalName}</strong> pharmacy.</p>
            ${data?.prescriptionDetails ? `
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Prescription Details:</strong></p>
              <p>${data.prescriptionDetails}</p>
            </div>
            ` : ''}
            <p>Please bring a valid ID when collecting your medication.</p>
            <p>Best regards,<br>${hospitalName} Pharmacy</p>
          </div>
        `,
      };

    case "lab_results":
      return {
        subject: `Lab Results Available - ${hospitalName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7c3aed;">Lab Results Available</h2>
            <p>Dear ${recipientName},</p>
            <p>Your lab results are now available at <strong>${hospitalName}</strong>.</p>
            ${data?.labTestName ? `
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Test:</strong> ${data.labTestName}</p>
            </div>
            ` : ''}
            <p>Please contact us or visit the patient portal to view your results.</p>
            <p>Best regards,<br>${hospitalName} Laboratory</p>
          </div>
        `,
      };

    case "invoice":
      return {
        subject: `Invoice from ${hospitalName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626;">Invoice Notification</h2>
            <p>Dear ${recipientName},</p>
            <p>You have a new invoice from <strong>${hospitalName}</strong>.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              ${data?.invoiceNumber ? `<p style="margin: 5px 0;"><strong>Invoice #:</strong> ${data.invoiceNumber}</p>` : ''}
              ${data?.invoiceAmount ? `<p style="margin: 5px 0;"><strong>Amount:</strong> ${data.invoiceAmount}</p>` : ''}
            </div>
            <p>Please contact our billing department for payment options.</p>
            <p>Best regards,<br>${hospitalName} Billing</p>
          </div>
        `,
      };

    case "custom":
      return {
        subject: data?.customSubject || `Message from ${hospitalName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">${data?.customSubject || 'Notification'}</h2>
            <p>Dear ${recipientName},</p>
            <p>${data?.customMessage || ''}</p>
            <p>Best regards,<br>${hospitalName}</p>
          </div>
        `,
      };

    default:
      throw new Error(`Unknown notification type: ${type}`);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: NotificationRequest = await req.json();
    const { subject, html } = getEmailContent(request);

    const emailResponse = await resend.emails.send({
      from: `${request.hospitalName} <onboarding@resend.dev>`,
      to: [request.recipientEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, ...emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
