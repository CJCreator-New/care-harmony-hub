/**
 * Clinical Notes Manager
 * Handles creation, versioning, signing, and immutability of clinical notes
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type NoteType = "progress" | "consultation" | "procedure" | "discharge" | "follow_up";
export type NoteStatus = "draft" | "pending_review" | "signed" | "archived";

export interface ClinicalNoteData {
  hospital_id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  title: string;
  note_type: NoteType;
  chief_complaint: string;
  findings: string;
  assessment: string;
  plan: string;
  medications_prescribed: Array<{
    medication: string;
    dosage: string;
    frequency: string;
  }>;
  vitals_recorded: {
    blood_pressure?: string;
    heart_rate?: number;
    temperature?: number;
    respiratory_rate?: number;
    oxygen_saturation?: number;
  };
}

export interface DigitalSignature {
  algorithm: string;
  timestamp: string;
  certificate_id: string;
  public_key_id: string;
  signature_data: string;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Create clinical note
 */
export async function createClinicalNote(
  data: ClinicalNoteData,
  createdBy: string
): Promise<string> {
  const { error: insertError, data: note } = await supabase
    .from("clinical_notes")
    .insert([
      {
        hospital_id: data.hospital_id,
        appointment_id: data.appointment_id,
        patient_id: data.patient_id,
        doctor_id: data.doctor_id,
        title: data.title,
        note_type: data.note_type,
        chief_complaint: data.chief_complaint,
        findings: data.findings,
        assessment: data.assessment,
        plan: data.plan,
        medications_prescribed: data.medications_prescribed,
        vitals_recorded: data.vitals_recorded,
        status: "draft",
        is_immutable: false,
        created_by: createdBy,
      },
    ])
    .select("id")
    .single();

  if (insertError) throw insertError;

  // Log audit
  await supabase.from("audit_logs").insert([
    {
      user_id: createdBy,
      action: "CLINICAL_NOTE_CREATED",
      table_name: "clinical_notes",
      record_id: note.id,
      description: `Created ${data.note_type} note for appointment ${data.appointment_id}`,
      created_at: new Date().toISOString(),
    },
  ]);

  return note.id;
}

/**
 * Update clinical note (only allowed for Draft status)
 */
export async function updateClinicalNote(
  noteId: string,
  updates: Partial<ClinicalNoteData>,
  updatedBy: string
): Promise<void> {
  // Verify note exists and is not immutable
  const { data: note } = await supabase
    .from("clinical_notes")
    .select("status, is_immutable, hospital_id")
    .eq("id", noteId)
    .single();

  if (!note) throw new Error("Clinical note not found");
  if (note.status !== "draft" || note.is_immutable) {
    throw new Error("Cannot modify signed or immutable clinical note");
  }

  // Create version record before updating
  const { data: latestVersion } = await supabase
    .from("clinical_note_versions")
    .select("version_number")
    .eq("clinical_note_id", noteId)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  const newVersion = (latestVersion?.version_number || 0) + 1;

  // Get current note for version comparison
  const { data: currentNote } = await supabase
    .from("clinical_notes")
    .select("*")
    .eq("id", noteId)
    .single();

  // Create version record
  await supabase.from("clinical_note_versions").insert([
    {
      hospital_id: note.hospital_id,
      clinical_note_id: noteId,
      version_number: newVersion,
      change_reason: "Draft edit",
      status_at_version: currentNote.status,
      changed_by: updatedBy,
      diff_from_previous: {
        before: currentNote,
        after: { ...currentNote, ...updates },
      },
    },
  ]);

  // Update note
  const { error: updateError } = await supabase
    .from("clinical_notes")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId);

  if (updateError) throw updateError;

  // Log audit
  await supabase.from("audit_logs").insert([
    {
      user_id: updatedBy,
      action: "CLINICAL_NOTE_UPDATED",
      table_name: "clinical_notes",
      record_id: noteId,
      description: `Updated draft note to version ${newVersion}`,
      created_at: new Date().toISOString(),
    },
  ]);
}

/**
 * Digitally sign clinical note
 * Once signed, note becomes immutable
 */
export async function signClinicalNote(
  noteId: string,
  signedBy: string,
  privateKey: string
): Promise<void> {
  // Get note
  const { data: note } = await supabase
    .from("clinical_notes")
    .select("*")
    .eq("id", noteId)
    .single();

  if (!note) throw new Error("Clinical note not found");
  if (note.is_immutable) throw new Error("Note is already signed");

  // Create signature
  const timestamp = new Date().toISOString();
  const contentToSign = `${note.id}|${note.findings}|${note.assessment}|${timestamp}`;

  // Generate signature (simplified - use proper crypto in production)
  const signature: DigitalSignature = {
    algorithm: "SHA256RSA",
    timestamp,
    certificate_id: "cert-" + Math.random().toString(36).substring(7),
    public_key_id: "key-" + Math.random().toString(36).substring(7),
    signature_data: btoa(contentToSign + Math.random().toString()), // Simplified
  };

  // Store signature
  const { error: sigError } = await supabase
    .from("clinical_note_signatures")
    .insert([
      {
        hospital_id: note.hospital_id,
        clinical_note_id: noteId,
        signed_by: signedBy,
        signed_at: timestamp,
        signature_algorithm: signature.algorithm,
        signature_certificate_id: signature.certificate_id,
        signature_public_key_id: signature.public_key_id,
        signature_data: signature.signature_data,
        signature_valid: true,
        validation_timestamp: timestamp,
      },
    ]);

  if (sigError) throw sigError;

  // Mark note as signed and immutable
  const { error: updateError } = await supabase
    .from("clinical_notes")
    .update({
      status: "signed",
      is_signed: true,
      is_immutable: true,
      signed_at: timestamp,
      signed_by: signedBy,
      signature_data: signature,
    })
    .eq("id", noteId);

  if (updateError) throw updateError;

  // Log audit
  await supabase.from("audit_logs").insert([
    {
      user_id: signedBy,
      action: "CLINICAL_NOTE_SIGNED",
      table_name: "clinical_notes",
      record_id: noteId,
      description: `Clinical note digitally signed and locked`,
      created_at: new Date().toISOString(),
    },
  ]);
}

/**
 * Add nurse observation (append-only)
 */
export async function addNurseObservation(
  noteId: string,
  appointmentId: string,
  observedBy: string,
  observationText: string,
  category: "vital_sign" | "patient_behavior" | "pain_level" | "medication_reaction" | "comfort" | "other"
): Promise<string> {
  const { data: note } = await supabase
    .from("clinical_notes")
    .select("hospital_id")
    .eq("id", noteId)
    .single();

  if (!note) throw new Error("Clinical note not found");

  const { error: insertError, data: observation } = await supabase
    .from("clinical_note_observations")
    .insert([
      {
        hospital_id: note.hospital_id,
        clinical_note_id: noteId,
        appointment_id: appointmentId,
        observed_by: observedBy,
        observation_text: observationText,
        observation_category: category,
        observed_at: new Date().toISOString(),
        is_locked: true, // Append-only: always locked
      },
    ])
    .select("id")
    .single();

  if (insertError) throw insertError;

  // Log audit
  await supabase.from("audit_logs").insert([
    {
      user_id: observedBy,
      action: "OBSERVATION_ADDED",
      table_name: "clinical_note_observations",
      record_id: observation.id,
      description: `Added ${category} observation`,
      created_at: new Date().toISOString(),
    },
  ]);

  return observation.id;
}

/**
 * Retrieve clinical note with full history
 */
export async function getClinicalNoteWithHistory(noteId: string) {
  const { data: note } = await supabase
    .from("clinical_notes")
    .select(
      `
      *,
      versions:clinical_note_versions(*),
      signatures:clinical_note_signatures(*),
      observations:clinical_note_observations(*)
    `
    )
    .eq("id", noteId)
    .single();

  return note;
}

/**
 * Archive clinical note
 */
export async function archiveClinicalNote(
  noteId: string,
  archivedBy: string
): Promise<void> {
  const { error } = await supabase
    .from("clinical_notes")
    .update({
      status: "archived",
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId);

  if (error) throw error;

  await supabase.from("audit_logs").insert([
    {
      user_id: archivedBy,
      action: "CLINICAL_NOTE_ARCHIVED",
      table_name: "clinical_notes",
      record_id: noteId,
      created_at: new Date().toISOString(),
    },
  ]);
}

export default {
  createClinicalNote,
  updateClinicalNote,
  signClinicalNote,
  addNurseObservation,
  getClinicalNoteWithHistory,
  archiveClinicalNote,
};
