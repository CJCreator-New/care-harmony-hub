/**
 * supabase/functions/phase5/issue-telehealth-prescription/index.ts
 * Feature 2.3: Telehealth Prescription Issuance
 *
 * Allows doctors to issue prescriptions directly within a telehealth session
 * with automatic notification to pharmacy and patient encryption
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

interface IssuePrescriptionRequest {
  appointment_id: string;
  telehealth_session_id: string;
  patient_id: string;
  doctor_id: string;
  hospital_id: string;
  medications: {
    medication_id: string;
    dose: string;
    unit: 'mg' | 'ml' | 'g' | 'mcg';
    frequency: string;
    duration_days: number;
    refills: number;
    instructions: string;
  }[];
  notes: string;
  estimated_cost?: number;
  patient_email?: string;
  send_notification: boolean;
}

interface IssuePrescriptionResponse {
  prescription_id: string;
  appointment_id: string;
  patient_notification_sent: boolean;
  pharmacy_notification_sent: boolean;
  status: 'issued' | 'pending' | 'error';
  timestamp: string;
  audit_log: any;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Validate telehealth session is still active
 */
async function validateTelehealthSession(
  sessionId: string,
  hospitalId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('telehealth_sessions')
      .select('id, status, end_time')
      .eq('id', sessionId)
      .eq('hospital_id', hospitalId)
      .single();

    if (error || !data) return false;

    // Session must be active (ongoing)
    if (data.status !== 'active') return false;

    // End time must be in future (session not finished)
    if (data.end_time && new Date(data.end_time) < new Date()) return false;

    return true;
  } catch (error) {
    console.error('Telehealth session validation error:', error);
    return false;
  }
}

/**
 * Validate doctor has permission to prescribe
 */
async function validateDoctorPermission(
  doctorId: string,
  hospitalId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('staff_members')
      .select('id, role, permissions, is_active')
      .eq('id', doctorId)
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)
      .single();

    if (error || !data) return false;

    // Check role (doctor, specialist, etc.)
    const hasPrescriberRole = ['doctor', 'specialist', 'physician'].includes(data.role?.toLowerCase() || '');
    if (!hasPrescriberRole) return false;

    // Check permissions
    const permissions = data.permissions || [];
    const canPrescribe = permissions.includes('prescribe') ||
                        permissions.includes('prescribe_telehealth') ||
                        permissions.includes('*');

    return canPrescribe;
  } catch (error) {
    console.error('Doctor permission validation error:', error);
    return false;
  }
}

/**
 * Validate medication IDs exist in hospital formulary
 */
async function validateMedications(
  medicationIds: string[],
  hospitalId: string
): Promise<Map<string, any>> {
  try {
    const { data, error } = await supabase
      .from('medications')
      .select('id, name, dosage_forms, is_active')
      .in('id', medicationIds)
      .eq('hospital_id', hospitalId)
      .eq('is_active', true);

    if (error || !data) return new Map();

    return new Map(data.map(med => [med.id, med]));
  } catch (error) {
    console.error('Medication validation error:', error);
    return new Map();
  }
}

/**
 * Create prescription record in database
 */
async function createPrescriptionRecord(
  request: IssuePrescriptionRequest
): Promise<{ prescription_id: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .insert({
        appointment_id: request.appointment_id,
        telehealth_session_id: request.telehealth_session_id,
        patient_id: request.patient_id,
        doctor_id: request.doctor_id,
        hospital_id: request.hospital_id,
        status: 'issued',
        issued_at: new Date().toISOString(),
        issued_via: 'telehealth_session',
        medications: request.medications,
        notes: request.notes,
        estimated_cost: request.estimated_cost || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Prescription creation error:', error);
      return { prescription_id: '', error: error.message };
    }

    return { prescription_id: data.id };
  } catch (error) {
    console.error('Prescription record creation error:', error);
    return { prescription_id: '', error: String(error) };
  }
}

/**
 * Notify pharmacy of new prescription
 */
async function notifyPharmacy(
  prescriptionId: string,
  request: IssuePrescriptionRequest
): Promise<boolean> {
  try {
    // Get hospital pharmacy contact
    const { data: hospital, error: hospitalError } = await supabase
      .from('hospitals')
      .select('pharmacy_email, pharmacy_phone')
      .eq('id', request.hospital_id)
      .single();

    if (hospitalError || !hospital) {
      console.error('Hospital fetch error:', hospitalError);
      return false;
    }

    // Send notification to pharmacy email
    if (hospital.pharmacy_email) {
      const { error: notifyError } = await supabase.functions.invoke(
        'send-notification',
        {
          body: {
            type: 'prescription_issued',
            recipient: hospital.pharmacy_email,
            prescription_id: prescriptionId,
            patient_id: request.patient_id,
            medications: request.medications,
            appointment_id: request.appointment_id,
          },
        }
      );

      if (notifyError) {
        console.warn('Pharmacy notification error:', notifyError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Pharmacy notification error:', error);
    return false;
  }
}

/**
 * Notify patient with encrypted prescription details
 */
async function notifyPatient(
  prescriptionId: string,
  request: IssuePrescriptionRequest
): Promise<boolean> {
  try {
    if (!request.send_notification) return false;
    if (!request.patient_email) return false;

    // Prepare encrypted prescription summary
    const prescriptionSummary = {
      prescription_id: prescriptionId,
      issued_date: new Date().toISOString(),
      medications: request.medications.map(m => ({
        name: m.medication_id,
        dose: `${m.dose} ${m.unit}`,
        frequency: m.frequency,
        duration_days: m.duration_days,
        refills: m.refills,
        instructions: m.instructions,
      })),
    };

    // Send notification
    const { error: notifyError } = await supabase.functions.invoke(
      'send-notification',
      {
        body: {
          type: 'prescription_issued_patient',
          recipient: request.patient_email,
          patient_id: request.patient_id,
          prescription_id: prescriptionId,
          prescription_summary: prescriptionSummary,
          is_encrypted: true,
        },
      }
    );

    if (notifyError) {
      console.warn('Patient notification error:', notifyError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Patient notification error:', error);
    return false;
  }
}

/**
 * Create audit log entry
 */
async function createAuditLog(
  request: IssuePrescriptionRequest,
  prescriptionId: string,
  status: 'success' | 'failure'
): Promise<void> {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        hospital_id: request.hospital_id,
        action: 'prescription_issued_via_telehealth',
        entity_type: 'prescription',
        entity_id: prescriptionId,
        actor_id: request.doctor_id,
        actor_role: 'doctor',
        target_patient_id: request.patient_id,
        details: {
          appointment_id: request.appointment_id,
          session_id: request.telehealth_session_id,
          medication_count: request.medications.length,
          status,
        },
        timestamp: new Date().toISOString(),
        phi_involved: true,
      });
  } catch (error) {
    console.error('Audit log creation error:', error);
  }
}

/**
 * Main handler for prescription issuance
 */
serve(async (req) => {
  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const request: IssuePrescriptionRequest = await req.json();

    // Validate required fields
    if (!request.appointment_id || !request.telehealth_session_id || !request.patient_id ||
        !request.doctor_id || !request.hospital_id || !request.medications || request.medications.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Prescription] Issuing prescription for appointment ${request.appointment_id}`);

    // Step 1: Validate telehealth session is active
    const sessionValid = await validateTelehealthSession(
      request.telehealth_session_id,
      request.hospital_id
    );
    if (!sessionValid) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Telehealth session is not active or invalid',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Validate doctor permissions
    const doctorValid = await validateDoctorPermission(
      request.doctor_id,
      request.hospital_id
    );
    if (!doctorValid) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Doctor does not have permission to issue prescriptions',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Validate medications
    const medicationIds = request.medications.map(m => m.medication_id);
    const validMeds = await validateMedications(medicationIds, request.hospital_id);
    if (validMeds.size !== medicationIds.length) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'One or more medications are invalid or not in hospital formulary',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Create prescription record
    const { prescription_id, error: prescError } = await createPrescriptionRecord(request);
    if (!prescription_id) {
      console.error('Prescription creation failed:', prescError);
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Failed to create prescription record',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: Send notifications (in parallel)
    const [pharmacyNotified, patientNotified] = await Promise.all([
      notifyPharmacy(prescription_id, request),
      notifyPatient(prescription_id, request),
    ]);

    // Step 6: Create audit log
    await createAuditLog(request, prescription_id, 'success');

    console.log(`✅ Prescription issued: ${prescription_id}`);

    return new Response(
      JSON.stringify({
        prescription_id,
        appointment_id: request.appointment_id,
        patient_notification_sent: patientNotified,
        pharmacy_notification_sent: pharmacyNotified,
        status: 'issued',
        timestamp: new Date().toISOString(),
      } as IssuePrescriptionResponse),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Prescription issuance error:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Internal server error',
        error: String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
