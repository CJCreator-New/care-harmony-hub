import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Appointment {
  id: string;
  patient_id: string;
  hospital_id: string;
  scheduled_date: string;
  scheduled_time: string;
  doctor_id: string | null;
  appointment_type: string;
  patients: {
    first_name: string;
    last_name: string;
    email: string | null;
  };
  doctor: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  hospitals: {
    name: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting appointment reminder check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`Checking appointments for: ${tomorrowStr}`);

    // Fetch appointments scheduled for tomorrow that haven't had reminders sent
    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        hospital_id,
        scheduled_date,
        scheduled_time,
        doctor_id,
        appointment_type,
        patients!inner(first_name, last_name, email),
        doctor:profiles!appointments_doctor_id_fkey(id, first_name, last_name),
        hospitals!inner(name)
      `)
      .eq('scheduled_date', tomorrowStr)
      .eq('status', 'scheduled')
      .eq('reminder_sent', false);

    if (fetchError) {
      console.error("Error fetching appointments:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${appointments?.length || 0} appointments needing reminders`);

    const notifications: Array<{
      hospital_id: string;
      recipient_id: string;
      type: string;
      title: string;
      message: string;
      priority: string;
      category: string;
      action_url: string;
      metadata: Record<string, unknown>;
    }> = [];

    const remindersSent: string[] = [];

    for (const apt of (appointments as unknown as Appointment[]) || []) {
      const patientName = `${apt.patients.first_name} ${apt.patients.last_name}`;
      const doctorName = apt.doctor 
        ? `Dr. ${apt.doctor.first_name} ${apt.doctor.last_name}` 
        : 'your healthcare provider';
      
      // Create in-app notification for patient (if they have a user account)
      // We'll create a notification that staff can see too
      const notification = {
        hospital_id: apt.hospital_id,
        recipient_id: apt.patient_id, // This will need to be mapped to user_id if patient has account
        type: 'appointment_reminder',
        title: 'Upcoming Appointment Tomorrow',
        message: `Reminder: ${patientName} has an appointment scheduled for tomorrow at ${apt.scheduled_time} with ${doctorName}.`,
        priority: 'normal',
        category: 'clinical',
        action_url: `/appointments`,
        metadata: {
          appointment_id: apt.id,
          scheduled_date: apt.scheduled_date,
          scheduled_time: apt.scheduled_time,
          patient_name: patientName,
          doctor_name: doctorName,
        },
      };

      notifications.push(notification);
      remindersSent.push(apt.id);

      console.log(`Prepared reminder for appointment ${apt.id} - ${patientName}`);
    }

    // Insert all notifications
    if (notifications.length > 0) {
      // For now, we'll create notifications for staff - patient notifications require user_id mapping
      // Get staff with doctor/nurse/receptionist roles for each hospital
      const hospitalIds = [...new Set(notifications.map(n => n.hospital_id))];
      
      for (const hospitalId of hospitalIds) {
        const { data: staffMembers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('hospital_id', hospitalId)
          .in('role', ['doctor', 'nurse', 'receptionist']);

        if (staffMembers) {
          const hospitalNotifications = notifications.filter(n => n.hospital_id === hospitalId);
          
          for (const staff of staffMembers) {
            for (const notif of hospitalNotifications) {
              await supabase.from('notifications').insert({
                ...notif,
                recipient_id: staff.user_id,
              });
            }
          }
        }
      }

      console.log(`Created ${notifications.length} notification records for staff`);
    }

    // Mark appointments as reminder sent
    if (remindersSent.length > 0) {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          reminder_sent: true, 
          reminder_sent_at: new Date().toISOString() 
        })
        .in('id', remindersSent);

      if (updateError) {
        console.error("Error updating reminder status:", updateError);
      } else {
        console.log(`Marked ${remindersSent.length} appointments as reminder sent`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        remindersProcessed: remindersSent.length,
        message: `Processed ${remindersSent.length} appointment reminders`
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in appointment-reminders function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
