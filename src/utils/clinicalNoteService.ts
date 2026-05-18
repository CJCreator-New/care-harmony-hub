// @ts-nocheck
import { logAudit } from './sanitize';

// ─── Clinical Note Service ────────────────────────────────────────────

// Internal storage for tracking notes (in-memory for testing)
const noteStore = new Map<string, any>();

export async function createClinicalNote(noteData: any): Promise<any> {
  // Validation
  if (!noteData.diagnosis || noteData.diagnosis.trim() === '') {
    throw new Error('Diagnosis required');
  }

  const noteId = `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date();

  const note = {
    id: noteId,
    patientId: noteData.patientId,
    doctorId: noteData.doctorId,
    hospitalId: noteData.hospitalId,
    encounterDate: noteData.encounterDate || now,
    content: noteData.content,
    diagnosis: noteData.diagnosis,
    treatment: noteData.treatment,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    signed: false,
    locked: false,
    autoSaveEnabled: true,
    lastAutoSaveTime: now,
    signatureTimestamp: null,
    signedBy: null,
    lockedAt: null,
    createdBy: noteData.doctorId,
  };

  noteStore.set(noteId, note);

  logAudit({
    action: 'NOTE_CREATED',
    resourceType: 'clinical_note',
    hospital_id: noteData.hospitalId,
    user_id: noteData.doctorId,
    entity_id: noteId,
  });

  return note;
}

export async function updateClinicalNote(
  noteId: string,
  updates: any,
  doctor: any
): Promise<any> {
  const note = noteStore.get(noteId);
  if (!note) {
    throw new Error('Note not found');
  }

  // Check authorization
  if (note.createdBy !== doctor.id && note.signed) {
    throw new Error('Only original doctor can edit unsigned notes');
  }

  if (note.signed) {
    throw new Error('Cannot modify signed note');
  }

  // Update note
  const updated = {
    ...note,
    ...updates,
    updatedAt: new Date(),
    lastAutoSaveTime: new Date(),
  };

  noteStore.set(noteId, updated);

  logAudit({
    action: 'NOTE_UPDATED',
    resourceType: 'clinical_note',
    hospital_id: note.hospitalId,
    user_id: doctor.id,
    entity_id: noteId,
  });

  return updated;
}

export async function signClinicalNote(noteId: string, doctorId: string): Promise<any> {
  const note = noteStore.get(noteId);
  if (!note) {
    throw new Error('Note not found');
  }

  const signed = {
    ...note,
    signed: true,
    status: 'signed',
    signatureTimestamp: new Date(),
    signedBy: doctorId,
    updatedAt: new Date(),
  };

  noteStore.set(noteId, signed);

  logAudit({
    action: 'NOTE_SIGNED',
    resourceType: 'clinical_note',
    hospital_id: note.hospitalId,
    user_id: doctorId,
    entity_id: noteId,
  });

  return signed;
}

export async function lockClinicalNote(noteId: string): Promise<any> {
  const note = noteStore.get(noteId);
  if (!note) {
    throw new Error('Note not found');
  }

  const locked = {
    ...note,
    locked: true,
    status: 'locked',
    lockedAt: new Date(),
    updatedAt: new Date(),
  };

  noteStore.set(noteId, locked);

  logAudit({
    action: 'NOTE_LOCKED',
    resourceType: 'clinical_note',
    hospital_id: note.hospitalId,
    user_id: 'system',
    entity_id: noteId,
  });

  return locked;
}

export async function addFollowUpNote(
  parentNoteId: string,
  followUpData: any
): Promise<any> {
  const parentNote = noteStore.get(parentNoteId);
  if (!parentNote) {
    throw new Error('Parent note not found');
  }

  const followUpId = `followup_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date();

  const followUp = {
    id: followUpId,
    parentNoteId,
    patientId: parentNote.patientId,
    doctorId: followUpData.doctorId,
    hospitalId: parentNote.hospitalId,
    content: followUpData.content,
    createdAt: now,
    status: 'draft',
    signed: false,
    parentReference: parentNoteId,
  };

  noteStore.set(followUpId, followUp);

  return followUp;
}

export async function retrievePatientHistory(patientId: string): Promise<any[]> {
  const notes = Array.from(noteStore.values()).filter(
    (note) => note.patientId === patientId
  );

  return notes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function validateNoteGrammar(content: string): Promise<any> {
  const issues: string[] = [];

  // Simple grammar checks
  if (content.length < 10) {
    issues.push('Note content too short');
  }
  if (!/[.!?]$/.test(content)) {
    issues.push('Note should end with punctuation');
  }

  return {
    isValid: issues.length === 0,
    issues,
    grammarScore: 100 - issues.length * 10,
  };
}

export async function attachDiagnosisCode(
  noteId: string,
  icdCode: string
): Promise<any> {
  const note = noteStore.get(noteId);
  if (!note) {
    throw new Error('Note not found');
  }

  const updated = {
    ...note,
    diagnosisCode: icdCode,
    diagnosisCodeAttachedAt: new Date(),
    updatedAt: new Date(),
  };

  noteStore.set(noteId, updated);

  return updated;
}

export async function generateSummary(noteId: string): Promise<string> {
  const note = noteStore.get(noteId);
  if (!note) {
    throw new Error('Note not found');
  }

  return `Summary for ${note.patientId}: ${note.diagnosis}. Treatment: ${note.treatment}`;
}

export async function auditNoteAccess(
  noteId: string,
  userId: string,
  accessType: string
): Promise<any> {
  const note = noteStore.get(noteId);
  if (!note) {
    throw new Error('Note not found');
  }

  logAudit({
    action: `NOTE_${accessType.toUpperCase()}`,
    resourceType: 'clinical_note',
    hospital_id: note.hospitalId,
    user_id: userId,
    entity_id: noteId,
  });

  return { success: true, accessRecorded: true };
}

export async function deleteDraft(noteId: string): Promise<any> {
  const note = noteStore.get(noteId);
  if (!note) {
    throw new Error('Note not found');
  }

  if (note.signed) {
    throw new Error('Cannot delete signed note');
  }

  const deleted = {
    ...note,
    status: 'archived',
    deletedAt: new Date(),
  };

  noteStore.set(noteId, deleted);

  logAudit({
    action: 'NOTE_DELETED',
    resourceType: 'clinical_note',
    hospital_id: note.hospitalId,
    user_id: 'system',
    entity_id: noteId,
  });

  return deleted;
}

export async function restoreFromArchive(noteId: string): Promise<any> {
  const note = noteStore.get(noteId);
  if (!note) {
    throw new Error('Note not found');
  }

  const restored = {
    ...note,
    status: 'draft',
    restoredAt: new Date(),
    deletedAt: null,
  };

  noteStore.set(noteId, restored);

  logAudit({
    action: 'NOTE_RESTORED',
    resourceType: 'clinical_note',
    hospital_id: note.hospitalId,
    user_id: 'system',
    entity_id: noteId,
  });

  return restored;
}
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
