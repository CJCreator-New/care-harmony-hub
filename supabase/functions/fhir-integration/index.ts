/// <reference types="https://esm.sh/@types/deno@2.5.0" />
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FHIRPatient {
  resourceType: "Patient";
  id?: string;
  identifier: Array<{ system: string; value: string }>;
  name: Array<{ family: string; given: string[] }>;
  telecom: Array<{ system: string; value: string }>;
  gender: "male" | "female" | "other" | "unknown";
  birthDate: string;
  address: Array<{ line: string[]; city: string; state: string; postalCode: string }>;
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
      case 'export_patient':
        return await exportPatientToFHIR(supabase, data);
      case 'import_patient':
        return await importPatientFromFHIR(supabase, data);
      case 'sync_observations':
        return await syncObservations(supabase, data);
      case 'export_encounter':
        return await exportEncounter(supabase, data);
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

async function exportPatientToFHIR(supabase: any, { patient_id }: any) {
  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patient_id)
    .single();

  if (error) throw error;

  const fhirPatient: FHIRPatient = {
    resourceType: "Patient",
    id: patient.id,
    identifier: [
      {
        system: "http://hospital.caresync.com/patient-id",
        value: patient.id
      }
    ],
    name: [
      {
        family: patient.name.split(' ').pop() || '',
        given: patient.name.split(' ').slice(0, -1)
      }
    ],
    telecom: [
      {
        system: "phone",
        value: patient.phone
      },
      {
        system: "email",
        value: patient.email
      }
    ],
    gender: patient.gender,
    birthDate: patient.date_of_birth,
    address: [
      {
        line: [patient.address],
        city: "Unknown",
        state: "Unknown",
        postalCode: "00000"
      }
    ]
  };

  return new Response(
    JSON.stringify(fhirPatient, null, 2),
    { headers: { "Content-Type": "application/fhir+json", ...corsHeaders } }
  );
}

async function importPatientFromFHIR(supabase: any, { fhir_patient }: any) {
  const patient = fhir_patient as FHIRPatient;
  
  const patientData = {
    id: patient.id || crypto.randomUUID(),
    name: `${patient.name[0].given.join(' ')} ${patient.name[0].family}`,
    email: patient.telecom.find(t => t.system === 'email')?.value || '',
    phone: patient.telecom.find(t => t.system === 'phone')?.value || '',
    gender: patient.gender,
    date_of_birth: patient.birthDate,
    address: patient.address[0]?.line.join(', ') || '',
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('patients')
    .upsert(patientData);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, patient_id: patientData.id }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function syncObservations(supabase: any, { patient_id, observations }: any) {
  const fhirObservations = observations.map((obs: any) => ({
    patient_id,
    code: obs.code.coding[0].code,
    display: obs.code.coding[0].display,
    value: obs.valueQuantity?.value || obs.valueString,
    unit: obs.valueQuantity?.unit,
    effective_date: obs.effectiveDateTime,
    status: obs.status,
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('vital_signs')
    .insert(fhirObservations);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, observations_synced: fhirObservations.length }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function exportEncounter(supabase: any, { consultation_id }: any) {
  const { data: consultation, error } = await supabase
    .from('consultations')
    .select(`
      *,
      patients(*),
      users(*)
    `)
    .eq('id', consultation_id)
    .single();

  if (error) throw error;

  const fhirEncounter = {
    resourceType: "Encounter",
    id: consultation.id,
    status: "finished",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "AMB",
      display: "ambulatory"
    },
    subject: {
      reference: `Patient/${consultation.patient_id}`
    },
    participant: [
      {
        individual: {
          reference: `Practitioner/${consultation.doctor_id}`
        }
      }
    ],
    period: {
      start: consultation.created_at,
      end: consultation.updated_at
    },
    reasonCode: [
      {
        text: consultation.chief_complaint
      }
    ],
    diagnosis: consultation.diagnosis ? [
      {
        condition: {
          display: consultation.diagnosis
        }
      }
    ] : []
  };

  return new Response(
    JSON.stringify(fhirEncounter, null, 2),
    { headers: { "Content-Type": "application/fhir+json", ...corsHeaders } }
  );
}

serve(handler);