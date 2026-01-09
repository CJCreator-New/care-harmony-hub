/// <reference types="https://esm.sh/@types/deno@2.5.0" />
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoSession {
  id: string;
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  session_token: string;
  room_id: string;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  started_at?: string;
  ended_at?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = (globalThis as any).Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = (globalThis as any).Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, data } = await req.json();

    switch (action) {
      case 'create_session':
        return await createVideoSession(supabase, data);
      case 'join_session':
        return await joinVideoSession(supabase, data);
      case 'end_session':
        return await endVideoSession(supabase, data);
      case 'record_consultation':
        return await recordConsultationNotes(supabase, data);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

async function createVideoSession(supabase: any, { appointment_id, doctor_id, patient_id }: any) {
  const sessionId = crypto.randomUUID();
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Generate session tokens (simplified - in production use WebRTC signaling server)
  const doctorToken = generateSessionToken(doctor_id, 'doctor');
  const patientToken = generateSessionToken(patient_id, 'patient');

  const session: VideoSession = {
    id: sessionId,
    appointment_id,
    doctor_id,
    patient_id,
    session_token: doctorToken,
    room_id: roomId,
    status: 'scheduled',
  };

  const { error } = await supabase
    .from('telemedicine_sessions')
    .insert(session);

  if (error) throw error;

  // Update appointment status
  await supabase
    .from('appointments')
    .update({ 
      status: 'in_progress',
      telemedicine_session_id: sessionId 
    })
    .eq('id', appointment_id);

  return new Response(
    JSON.stringify({
      session_id: sessionId,
      room_id: roomId,
      doctor_token: doctorToken,
      patient_token: patientToken,
      join_url: `https://meet.caresync.com/room/${roomId}`,
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function joinVideoSession(supabase: any, { session_id, user_id, user_type }: any) {
  const { data: session, error } = await supabase
    .from('telemedicine_sessions')
    .select('*')
    .eq('id', session_id)
    .single();

  if (error) throw error;

  // Verify user authorization
  const isAuthorized = (user_type === 'doctor' && session.doctor_id === user_id) ||
                      (user_type === 'patient' && session.patient_id === user_id);

  if (!isAuthorized) {
    throw new Error('Unauthorized access to session');
  }

  // Start session if not already active
  if (session.status === 'scheduled') {
    await supabase
      .from('telemedicine_sessions')
      .update({ 
        status: 'active',
        started_at: new Date().toISOString() 
      })
      .eq('id', session_id);
  }

  // Log session join
  await supabase
    .from('session_participants')
    .insert({
      session_id,
      user_id,
      user_type,
      joined_at: new Date().toISOString(),
    });

  return new Response(
    JSON.stringify({
      session_id,
      room_id: session.room_id,
      status: 'active',
      participant_token: generateSessionToken(user_id, user_type),
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function endVideoSession(supabase: any, { session_id, ended_by }: any) {
  const endTime = new Date().toISOString();

  // Update session status
  const { error } = await supabase
    .from('telemedicine_sessions')
    .update({ 
      status: 'ended',
      ended_at: endTime 
    })
    .eq('id', session_id);

  if (error) throw error;

  // Update appointment status
  await supabase
    .from('appointments')
    .update({ status: 'completed' })
    .eq('telemedicine_session_id', session_id);

  // Log session end
  await supabase
    .from('session_participants')
    .update({ left_at: endTime })
    .eq('session_id', session_id)
    .is('left_at', null);

  return new Response(
    JSON.stringify({ 
      session_id,
      status: 'ended',
      ended_at: endTime 
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function recordConsultationNotes(supabase: any, { session_id, consultation_notes, prescriptions }: any) {
  const { data: session } = await supabase
    .from('telemedicine_sessions')
    .select('appointment_id, doctor_id, patient_id')
    .eq('id', session_id)
    .single();

  if (!session) throw new Error('Session not found');

  // Create consultation record
  const consultationId = crypto.randomUUID();
  await supabase
    .from('consultations')
    .insert({
      id: consultationId,
      appointment_id: session.appointment_id,
      doctor_id: session.doctor_id,
      patient_id: session.patient_id,
      consultation_type: 'telemedicine',
      chief_complaint: consultation_notes.chief_complaint,
      history_present_illness: consultation_notes.history,
      physical_examination: consultation_notes.examination || 'Telemedicine consultation - limited physical exam',
      diagnosis: consultation_notes.diagnosis,
      treatment_plan: consultation_notes.treatment_plan,
      notes: consultation_notes.additional_notes,
      session_id,
    });

  // Create prescriptions if any
  if (prescriptions && prescriptions.length > 0) {
    const prescriptionRecords = prescriptions.map((rx: any) => ({
      id: crypto.randomUUID(),
      consultation_id: consultationId,
      patient_id: session.patient_id,
      doctor_id: session.doctor_id,
      medication_name: rx.medication,
      dosage: rx.dosage,
      frequency: rx.frequency,
      duration: rx.duration,
      instructions: rx.instructions,
      status: 'active',
    }));

    await supabase
      .from('prescriptions')
      .insert(prescriptionRecords);
  }

  return new Response(
    JSON.stringify({ 
      consultation_id: consultationId,
      prescriptions_created: prescriptions?.length || 0 
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

function generateSessionToken(userId: string, userType: string): string {
  // Simplified token generation - in production use proper JWT with WebRTC credentials
  const payload = {
    user_id: userId,
    user_type: userType,
    timestamp: Date.now(),
    expires: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
  };
  
  return btoa(JSON.stringify(payload));
}

serve(handler);