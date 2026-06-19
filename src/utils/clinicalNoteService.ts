// @ts-nocheck
import { logAudit } from './sanitize';

const noteStore = new Map<string, any>();

export function clearNoteStore(): void {
  noteStore.clear();
}

// Monotonically increasing timestamps so rapid consecutive calls are always ordered
let _lastTs = 0;
function monotonicNow(): Date {
  const ts = Math.max(Date.now(), _lastTs + 1);
  _lastTs = ts;
  return new Date(ts);
}

// ─── ICD-10 helpers ────────────────────────────────────────────────────────────

const ICD10_PATTERN = /^[A-Z]\d{2}(\.\d{1,4})?$/;

const DIAGNOSIS_CODE_MAP: Record<string, string[]> = {
  'upper respiratory tract infection': ['J06.9', 'J05.9'],
  'pneumonia': ['J18.9'],
  'hypertension': ['I10'],
  'diabetes mellitus': ['E11.9', 'E10.9'],
  'fever': ['R50.9'],
};

function suggestIcdCodes(diagnosisText: string): string[] {
  const lower = diagnosisText.toLowerCase();
  for (const [key, codes] of Object.entries(DIAGNOSIS_CODE_MAP)) {
    if (lower.includes(key)) return codes;
  }
  return ['R50.9'];
}

// ─── Abbreviation helpers ──────────────────────────────────────────────────────

const MEDICAL_ABBREVIATIONS = [
  'BP', 'HR', 'RR', 'SpO2', 'Temp', 'GCS', 'BMI', 'ECG', 'IV', 'IM', 'SC',
  'PO', 'TDS', 'BID', 'QID', 'PRN',
];

const CONDITION_ABBREVIATIONS: Record<string, string> = {
  'acute upper respiratory tract infection': 'URTI',
  'upper respiratory tract infection': 'URTI',
  'lower respiratory tract infection': 'LRTI',
  'urinary tract infection': 'UTI',
  'diabetes mellitus': 'DM',
  'hypertension': 'HTN',
};

function extractAbbreviations(content: string): string[] {
  return MEDICAL_ABBREVIATIONS.filter(a => new RegExp(`\\b${a}\\b`).test(content));
}

function formatDiagnosis(diagnosis: string): string {
  const lower = diagnosis.toLowerCase();
  for (const [key, abbr] of Object.entries(CONDITION_ABBREVIATIONS)) {
    if (lower.includes(key)) return `${abbr} (${diagnosis})`;
  }
  return diagnosis;
}

// ─── Vital sign helpers ────────────────────────────────────────────────────────

function extractVitalsCompact(content: string): string {
  const parts: string[] = [];
  const bp = content.match(/BP[:\s]+([\d]+\/[\d]+)/i);
  if (bp) parts.push(`BP ${bp[1]}`);
  const hr = content.match(/HR[:\s]+([\d]+)/i);
  if (hr) parts.push(`HR ${hr[1]}`);
  const temp = content.match(/Temp[:\s]+([\d.]+)/i);
  if (temp) parts.push(`Temp ${temp[1]}`);
  const rr = content.match(/RR[:\s]+([\d]+)/i);
  if (rr) parts.push(`RR ${rr[1]}`);
  return parts.join(', ');
}

function isAbnormal(content: string): boolean {
  const bp = content.match(/BP[:\s]+([\d]+)\/([\d]+)/i);
  if (bp && (Number(bp[1]) > 160 || Number(bp[2]) > 100 || Number(bp[1]) < 90)) return true;
  const hr = content.match(/HR[:\s]+([\d]+)/i);
  if (hr && (Number(hr[1]) > 100 || Number(hr[1]) < 50)) return true;
  const temp = content.match(/Temp[:\s]+([\d.]+)/i);
  if (temp && (Number(temp[1]) > 38.5 || Number(temp[1]) < 36)) return true;
  return false;
}

function extractSymptomKeywords(content: string): string[] {
  const keywords = ['fever', 'cough', 'pain', 'vomiting', 'nausea', 'diarrhea', 'dyspnea', 'fatigue'];
  return keywords.filter(k => content.toLowerCase().includes(k));
}

// ─── createClinicalNote ────────────────────────────────────────────────────────

export async function createClinicalNote(noteData: any): Promise<any> {
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
    archived: false,
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

// ─── updateClinicalNote ────────────────────────────────────────────────────────

export async function updateClinicalNote(
  noteId: string,
  updates: any,
  doctor: any
): Promise<any> {
  const note = noteStore.get(noteId);
  if (!note) throw new Error('Note not found');

  if (note.locked) throw new Error('Cannot modify locked note');
  if (note.signed) throw new Error('Cannot modify signed note');
  if (note.createdBy !== doctor.id) throw new Error('Only original doctor can edit unsigned notes');

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

// ─── signClinicalNote ──────────────────────────────────────────────────────────

export async function signClinicalNote(noteId: string, doctorId: string): Promise<any> {
  const note = noteStore.get(noteId);
  if (!note) throw new Error('Note not found');

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
    resourceId: noteId,
    hospital_id: note.hospitalId,
    user_id: doctorId,
    entity_id: noteId,
  });

  return signed;
}

// ─── lockClinicalNote ──────────────────────────────────────────────────────────

export async function lockClinicalNote(noteId: string): Promise<any> {
  const note = noteStore.get(noteId);
  if (!note) throw new Error('Note not found');

  const contentHash = btoa(unescape(encodeURIComponent(note.content || ''))).slice(0, 32);

  const locked = {
    ...note,
    locked: true,
    status: 'locked',
    lockedAt: new Date(),
    updatedAt: new Date(),
    immutable: true,
    contentHash,
  };

  noteStore.set(noteId, locked);

  logAudit({
    action: 'NOTE_LOCKED',
    resourceType: 'clinical_note',
    resourceId: noteId,
    hospital_id: note.hospitalId,
    user_id: 'system',
    entity_id: noteId,
  });

  return locked;
}

// ─── addFollowUpNote ───────────────────────────────────────────────────────────

export async function addFollowUpNote(
  parentNoteId: string,
  followUpData: any
): Promise<any> {
  const parentNote = noteStore.get(parentNoteId);
  if (!parentNote) throw new Error('Parent note not found');

  // Build the full ancestor chain
  const parentChain: string[] = parentNote.noteChain
    ? [...parentNote.noteChain]
    : [parentNote.id];
  if (!parentChain.includes(parentNote.id)) parentChain.push(parentNote.id);
  const sequence = parentChain.length + 1;

  const followUpId = `followup_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date();

  const followUp = {
    id: followUpId,
    linkedToNoteId: parentNoteId,
    parentNoteId,
    patientId: parentNote.patientId,
    doctorId: followUpData.doctorId,
    hospitalId: parentNote.hospitalId,
    encounterDate: now,
    content: followUpData.content,
    status: followUpData.status || 'draft',
    isFollowUp: true,
    sequence,
    noteChain: parentChain,
    createdAt: now,
    updatedAt: now,
    signed: false,
    locked: false,
    archived: false,
    autoSaveEnabled: true,
    lastAutoSaveTime: now,
    createdBy: followUpData.doctorId,
  };

  noteStore.set(followUpId, followUp);

  return followUp;
}

// ─── retrievePatientHistory ────────────────────────────────────────────────────

export async function retrievePatientHistory(
  patientId: string,
  options?: { startDate?: Date; endDate?: Date }
): Promise<any[]> {
  let notes = Array.from(noteStore.values()).filter(n => n.patientId === patientId);

  if (options?.startDate) {
    notes = notes.filter(n => n.encounterDate >= options.startDate!);
  }
  if (options?.endDate) {
    notes = notes.filter(n => n.encounterDate <= options.endDate!);
  }

  // Chronological order — oldest first
  return notes.sort((a, b) => a.encounterDate.getTime() - b.encounterDate.getTime());
}

// ─── validateNoteGrammar ───────────────────────────────────────────────────────

export async function validateNoteGrammar(content: string): Promise<any> {
  const errors: string[] = [];

  if (content.length < 10) errors.push('Note content too short');
  if (!/[.!?]$/.test(content.trim())) errors.push('Note should end with punctuation');

  return {
    valid: errors.length === 0,
    errors,
    abbreviationsFound: extractAbbreviations(content),
    grammarScore: 100 - errors.length * 10,
  };
}

// ─── attachDiagnosisCode ───────────────────────────────────────────────────────

export async function attachDiagnosisCode(
  diagnosisText: string,
  icdCode: string
): Promise<any> {
  if (icdCode && !ICD10_PATTERN.test(icdCode)) {
    throw new Error('Invalid ICD-10 code format');
  }

  if (!icdCode) {
    return {
      diagnosisText,
      icd10Code: null,
      codingValid: false,
      suggestedCodes: suggestIcdCodes(diagnosisText),
      warning: 'Diagnosis code recommended for billing and reporting',
    };
  }

  return {
    diagnosisText,
    icd10Code: icdCode,
    codingValid: true,
    suggestedCodes: [],
  };
}

// ─── generateSummary ───────────────────────────────────────────────────────────

export async function generateSummary(noteId: string): Promise<string> {
  const note = noteStore.get(noteId);
  if (!note) throw new Error('Note not found');

  const { content, diagnosis, treatment } = note;
  const symptoms = extractSymptomKeywords(content);
  const abnormalFlag = isAbnormal(content) ? ' [abnormal]' : '';
  const diagStr = formatDiagnosis(diagnosis);

  const drugMatch = (treatment || '').match(
    /\b([a-z]+(?:cillin|mycin|pril|sartan|olol|statin|zole|cycline|zosin)\w*)\b/i
  );
  const drug = drugMatch ? drugMatch[1] : '';

  if (symptoms.length > 0) {
    const parts = [symptoms.join(', '), diagStr];
    if (drug) parts.push(drug);
    return parts.join(' · ') + abnormalFlag;
  }

  const vitals = extractVitalsCompact(content);
  const parts = [diagStr];
  if (drug) parts.push(drug);
  if (vitals) parts.push(vitals + abnormalFlag);
  else if (abnormalFlag) parts[parts.length - 1] += abnormalFlag;
  return parts.join(' · ');
}

// ─── auditNoteAccess ───────────────────────────────────────────────────────────

export async function auditNoteAccess(
  noteId: string,
  userId: string,
  action: string
): Promise<any> {
  const note = noteStore.get(noteId);
  if (!note) throw new Error('Note not found');

  logAudit({
    action: 'NOTE_ACCESSED',
    resourceType: 'clinical_note',
    resourceId: noteId,
    hospital_id: note.hospitalId,
    user_id: userId,
    entity_id: noteId,
  });

  return {
    noteId,
    accessedBy: userId,
    accessTime: monotonicNow(),
    action,
  };
}

// ─── deleteDraft ──────────────────────────────────────────────────────────────

export async function deleteDraft(noteId: string): Promise<any> {
  const note = noteStore.get(noteId);
  if (!note) throw new Error('Note not found');

  const now = new Date();

  // Signed/locked notes are archived rather than hard-deleted
  if (note.signed || note.locked) {
    const archived = { ...note, archived: true, deletedAt: now, status: 'archived' };
    noteStore.set(noteId, archived);

    logAudit({
      action: 'NOTE_ARCHIVED',
      resourceType: 'clinical_note',
      hospital_id: note.hospitalId,
      user_id: 'system',
      entity_id: noteId,
    });

    return archived;
  }

  const deleted = { ...note, deleted: true, deletedAt: now, status: 'deleted' };
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

// ─── restoreFromArchive ────────────────────────────────────────────────────────

export async function restoreFromArchive(noteId: string): Promise<any> {
  const note = noteStore.get(noteId);
  if (!note) throw new Error('Note not found');

  if (note.archived === false && note.restoredAt) {
    throw new Error('Note already restored');
  }

  const restored = {
    ...note,
    archived: false,
    status: 'signed',
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
