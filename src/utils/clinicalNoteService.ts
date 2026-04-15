import { logAudit } from './sanitize';

export interface ClinicalNote {
  id: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  encounterDate: Date;
  content: string;
  diagnosis: string;
  treatment: string;
  status: 'draft' | 'signed' | 'locked' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  signedAt?: Date;
  lockedAt?: Date;
}

export async function createClinicalNote(noteData: Partial<ClinicalNote>): Promise<ClinicalNote> {
  const note: ClinicalNote = {
    id: `note_${Date.now()}`,
    patientId: noteData.patientId || '',
    doctorId: noteData.doctorId || '',
    hospitalId: noteData.hospitalId || '',
    encounterDate: noteData.encounterDate || new Date(),
    content: noteData.content || '',
    diagnosis: noteData.diagnosis || '',
    treatment: noteData.treatment || '',
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  logAudit({
    hospital_id: note.hospitalId,
    user_id: note.doctorId,
    action_type: 'create_clinical_note',
    entity_type: 'clinical_note',
    entity_id: note.id,
  });

  return note;
}

export async function updateClinicalNote(
  noteId: string,
  updates: Partial<ClinicalNote>
): Promise<ClinicalNote> {
  const note: ClinicalNote = {
    id: noteId,
    patientId: updates.patientId || '',
    doctorId: updates.doctorId || '',
    hospitalId: updates.hospitalId || '',
    encounterDate: updates.encounterDate || new Date(),
    content: updates.content || '',
    diagnosis: updates.diagnosis || '',
    treatment: updates.treatment || '',
    status: updates.status || 'draft',
    createdAt: updates.createdAt || new Date(),
    updatedAt: new Date(),
  };

  logAudit({
    hospital_id: note.hospitalId,
    user_id: note.doctorId,
    action_type: 'update_clinical_note',
    entity_type: 'clinical_note',
    entity_id: noteId,
  });

  return note;
}

export async function signClinicalNote(noteId: string, doctorId: string): Promise<ClinicalNote> {
  return {
    id: noteId,
    patientId: '',
    doctorId,
    hospitalId: '',
    encounterDate: new Date(),
    content: '',
    diagnosis: '',
    treatment: '',
    status: 'signed',
    createdAt: new Date(),
    updatedAt: new Date(),
    signedAt: new Date(),
  };
}

export async function lockClinicalNote(noteId: string): Promise<ClinicalNote> {
  return {
    id: noteId,
    patientId: '',
    doctorId: '',
    hospitalId: '',
    encounterDate: new Date(),
    content: '',
    diagnosis: '',
    treatment: '',
    status: 'locked',
    createdAt: new Date(),
    updatedAt: new Date(),
    lockedAt: new Date(),
  };
}

export async function addFollowUpNote(
  originalNoteId: string,
  followUpContent: string
): Promise<ClinicalNote> {
  return {
    id: `note_${Date.now()}`,
    patientId: '',
    doctorId: '',
    hospitalId: '',
    encounterDate: new Date(),
    content: followUpContent,
    diagnosis: '',
    treatment: '',
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function retrievePatientHistory(patientId: string): Promise<ClinicalNote[]> {
  return [];
}

export async function validateNoteGrammar(content: string): Promise<boolean> {
  return content.length > 0;
}

export async function attachDiagnosisCode(noteId: string, code: string): Promise<ClinicalNote> {
  return {
    id: noteId,
    patientId: '',
    doctorId: '',
    hospitalId: '',
    encounterDate: new Date(),
    content: '',
    diagnosis: code,
    treatment: '',
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function generateSummary(noteId: string): Promise<string> {
  return 'Clinical note summary';
}

export async function auditNoteAccess(
  noteId: string,
  userId: string,
  action: string
): Promise<void> {
  logAudit({
    hospital_id: '',
    user_id: userId,
    action_type: action,
    entity_type: 'clinical_note',
    entity_id: noteId,
  });
}

export async function deleteDraft(noteId: string): Promise<void> {
  logAudit({
    hospital_id: '',
    user_id: '',
    action_type: 'delete_draft_note',
    entity_type: 'clinical_note',
    entity_id: noteId,
  });
}

export async function restoreFromArchive(noteId: string): Promise<ClinicalNote> {
  return {
    id: noteId,
    patientId: '',
    doctorId: '',
    hospitalId: '',
    encounterDate: new Date(),
    content: '',
    diagnosis: '',
    treatment: '',
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
