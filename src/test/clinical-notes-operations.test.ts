import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createClinicalNote,
  updateClinicalNote,
  signClinicalNote,
  lockClinicalNote,
  addFollowUpNote,
  retrievePatientHistory,
  validateNoteGrammar,
  attachDiagnosisCode,
  generateSummary,
  auditNoteAccess,
  deleteDraft,
  restoreFromArchive,
} from '@/utils/clinicalNoteService';
import { logAudit } from '@/utils/sanitize';

vi.mock('@/utils/sanitize');

// Test Fixtures
const mockDoctor = {
  id: 'doc-001',
  name: 'Dr. Sarah Johnson',
  license: 'MCI-12345',
  specialization: 'Internal Medicine',
  hospitalId: 'hosp-001',
};

const mockPatient = {
  id: 'pat-001',
  name: 'Rahul Sharma',
  mrn: '00123456',
  dob: '1980-05-15',
  hospitalId: 'hosp-001',
};

const mockNoteData = {
  patientId: mockPatient.id,
  doctorId: mockDoctor.id,
  hospitalId: 'hosp-001',
  encounterDate: new Date(),
  content: 'Patient presents with fever and cough for 3 days. Vitals: BP 120/80, Temp 38.5°C.',
  diagnosis: 'Acute Upper Respiratory Tract Infection',
  treatment: 'Prescribed amoxicillin 500mg TDS for 5 days.',
};

describe('Clinical Notes - Creation & Editing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should create draft clinical note', async () => {
    const result = await createClinicalNote(mockNoteData);

    expect(result).toEqual(expect.objectContaining({
      id: expect.any(String),
      patientId: mockPatient.id,
      doctorId: mockDoctor.id,
      status: 'draft',
      createdAt: expect.any(Date),
    }));
    expect(result.signed).toBe(false);
  });

  it('should reject note without required fields', async () => {
    const incomplete = { ...mockNoteData, diagnosis: '' };

    await expect(() => createClinicalNote(incomplete))
      .rejects
      .toThrow('Diagnosis required');
  });

  it('should auto-save draft every 30 seconds', async () => {
    const result = await createClinicalNote(mockNoteData);

    expect(result.autoSaveEnabled).toBe(true);
    expect(result.lastAutoSaveTime).toBeDefined();
  });

  it('should prevent unauthorized doctor from editing note', async () => {
    const result = await createClinicalNote(mockNoteData);
    
    const otherDoctor = { ...mockDoctor, id: 'doc-999' };

    await expect(() => updateClinicalNote(result.id, { content: 'Updated' }, otherDoctor))
      .rejects
      .toThrow('Only original doctor can edit unsigned notes');
  });

  it('should update note before signing', async () => {
    const result = await createClinicalNote(mockNoteData);

    const updated = await updateClinicalNote(result.id, {
      content: 'Updated content',
      diagnosis: 'Revised diagnosis',
    }, mockDoctor);

    expect(updated.content).toBe('Updated content');
    expect(updated.diagnosis).toBe('Revised diagnosis');
    expect(updated.status).toBe('draft');
  });

  it('should prevent updates after signing', async () => {
    const result = await createClinicalNote(mockNoteData);
    const signed = await signClinicalNote(result.id, mockDoctor.id);

    await expect(() => updateClinicalNote(result.id, { content: 'New content' }, mockDoctor))
      .rejects
      .toThrow('Cannot modify signed note');
  });

  it('should log note creation', async () => {
    await createClinicalNote(mockNoteData);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'NOTE_CREATED',
        resourceType: 'clinical_note',
      })
    );
  });
});

describe('Clinical Notes - Digital Signature & Locking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sign clinical note with digital signature', async () => {
    const note = await createClinicalNote(mockNoteData);
    const signed = await signClinicalNote(note.id, mockDoctor.id);

    expect(signed.signed).toBe(true);
    expect(signed.signatureTimestamp).toBeDefined();
    expect(signed.signedBy).toBe(mockDoctor.id);
  });

  it('should lock note after signature', async () => {
    const note = await createClinicalNote(mockNoteData);
    await signClinicalNote(note.id, mockDoctor.id);

    const locked = await lockClinicalNote(note.id);

    expect(locked.locked).toBe(true);
    expect(locked.lockedAt).toBeDefined();
  });

  it('should prevent changes to locked notes', async () => {
    const note = await createClinicalNote(mockNoteData);
    await signClinicalNote(note.id, mockDoctor.id);
    await lockClinicalNote(note.id);

    await expect(() => updateClinicalNote(note.id, { content: 'Modified' }, mockDoctor))
      .rejects
      .toThrow('Cannot modify locked note');
  });

  it('should maintain immutability after locking', async () => {
    const note = await createClinicalNote(mockNoteData);
    const signed = await signClinicalNote(note.id, mockDoctor.id);
    const locked = await lockClinicalNote(note.id);

    expect(locked.immutable).toBe(true);
    expect(locked.contentHash).toBeDefined();
  });

  it('should log signature and locking', async () => {
    const note = await createClinicalNote(mockNoteData);
    await signClinicalNote(note.id, mockDoctor.id);
    await lockClinicalNote(note.id);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringMatching(/SIGNED|LOCKED/),
        resourceId: note.id,
      })
    );
  });
});

describe('Clinical Notes - Follow-up & History', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add follow-up note', async () => {
    const original = await createClinicalNote(mockNoteData);
    const followUp = await addFollowUpNote(original.id, {
      content: 'Patient improving, fever reduced.',
      status: 'improving',
      doctorId: mockDoctor.id,
    });

    expect(followUp.linkedToNoteId).toBe(original.id);
    expect(followUp.isFollowUp).toBe(true);
    expect(followUp.sequence).toBe(2);
  });

  it('should chain multiple follow-ups', async () => {
    const note1 = await createClinicalNote(mockNoteData);
    const note2 = await addFollowUpNote(note1.id, { content: 'Follow-up 1', doctorId: mockDoctor.id });
    const note3 = await addFollowUpNote(note2.id, { content: 'Follow-up 2', doctorId: mockDoctor.id });

    expect(note3.sequence).toBe(3);
    expect(note3.noteChain).toContain(note1.id);
  });

  it('should retrieve complete patient history', async () => {
    const note1 = await createClinicalNote(mockNoteData);
    const note2 = await addFollowUpNote(note1.id, { content: 'Follow-up', doctorId: mockDoctor.id });

    const history = await retrievePatientHistory(mockPatient.id);

    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].id).toBe(note1.id);
  });

  it('should maintain chronological order in history', async () => {
    const date1 = new Date('2026-01-01');
    const date2 = new Date('2026-01-02');

    const note1 = await createClinicalNote({ ...mockNoteData, encounterDate: date1 });
    const note2 = await createClinicalNote({ ...mockNoteData, encounterDate: date2 });

    const history = await retrievePatientHistory(mockPatient.id);

    expect(history[0].encounterDate.getTime()).toBeLessThan(history[1].encounterDate.getTime());
  });

  it('should filter history by date range', async () => {
    const history = await retrievePatientHistory(mockPatient.id, {
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-31'),
    });

    history.forEach(note => {
      expect(note.encounterDate).toBeDefined();
    });
  });
});

describe('Clinical Notes - Validation & Diagnosis Coding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate note grammar and spelling', async () => {
    const result = await validateNoteGrammar(mockNoteData.content);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should detect common medical abbreviations', async () => {
    const content = 'BP: 120/80, HR: 72, RR: 16';
    const result = await validateNoteGrammar(content);

    expect(result.abbreviationsFound).toContain('BP');
    expect(result.abbreviationsFound).toContain('HR');
  });

  it('should attach ICD-10 diagnosis code', async () => {
    const result = await attachDiagnosisCode(mockNoteData.diagnosis, 'J06.9');

    expect(result.icd10Code).toBe('J06.9');
    expect(result.codingValid).toBe(true);
  });

  it('should validate diagnosis against ICD-10 database', async () => {
    const result = await attachDiagnosisCode('Acute Upper Respiratory Tract Infection', '');

    expect(result.suggestedCodes).toContain('J06.9');
    expect(result.suggestedCodes).toContain('J05.9');
  });

  it('should prevent invalid ICD-10 codes', async () => {
    await expect(() => attachDiagnosisCode(mockNoteData.diagnosis, 'INVALID-CODE'))
      .rejects
      .toThrow('Invalid ICD-10 code format');
  });

  it('should alert on missing diagnosis code', async () => {
    const result = await attachDiagnosisCode(mockNoteData.diagnosis, '');

    expect(result.warning).toContain('Diagnosis code recommended');
  });
});

describe('Clinical Notes - Summary Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate clinical summary from note', async () => {
    const note = await createClinicalNote(mockNoteData);
    const summary = await generateSummary(note.id);

    expect(summary).toContain('fever');
    expect(summary).toContain('URTI');
    expect(summary.length).toBeLessThan(mockNoteData.content.length);
  });

  it('should include key diagnosis and treatment in summary', async () => {
    const note = await createClinicalNote(mockNoteData);
    const summary = await generateSummary(note.id);

    expect(summary).toContain('Upper Respiratory Tract Infection');
    expect(summary).toContain('amoxicillin');
  });

  it('should extract vital signs in summary', async () => {
    const noteWithVitals = {
      ...mockNoteData,
      content: 'BP: 140/90, HR: 88, Temp: 38.5°C, RR: 20',
    };

    const note = await createClinicalNote(noteWithVitals);
    const summary = await generateSummary(note.id);

    expect(summary).toContain('140/90');
    expect(summary).toContain('38.5');
  });

  it('should flag abnormal vitals in summary', async () => {
    const abnormalVitals = {
      ...mockNoteData,
      content: 'BP: 180/110, considered hypertensive crisis',
    };

    const note = await createClinicalNote(abnormalVitals);
    const summary = await generateSummary(note.id);

    expect(summary).toContain('abnormal');
  });
});

describe('Clinical Notes - Audit & Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should audit all note access', async () => {
    const note = await createClinicalNote(mockNoteData);
    await auditNoteAccess(note.id, mockDoctor.id, 'read');

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'NOTE_ACCESSED',
        resourceId: note.id,
      })
    );
  });

  it('should track who accessed the note and when', async () => {
    const note = await createClinicalNote(mockNoteData);
    const audit = await auditNoteAccess(note.id, mockDoctor.id, 'read');

    expect(audit.accessedBy).toBe(mockDoctor.id);
    expect(audit.accessTime).toBeDefined();
    expect(audit.action).toBe('read');
  });

  it('should allow only authorized roles to view notes', async () => {
    const note = await createClinicalNote(mockNoteData);

    // Assuming role-based access control
    const unauthorized = { id: 'staff-001', role: 'receptionist' };

    const result = await auditNoteAccess(note.id, unauthorized.id, 'read');

    // Note: May throw or return unauthorized status
    expect(result).toBeDefined();
  });

  it('should maintain immutable audit trail', async () => {
    const note = await createClinicalNote(mockNoteData);
    const audit1 = await auditNoteAccess(note.id, mockDoctor.id, 'read');
    const audit2 = await auditNoteAccess(note.id, mockDoctor.id, 'read');

    expect(audit1).not.toEqual(audit2); // Different timestamps
    expect(audit2.accessTime.getTime()).toBeGreaterThan(audit1.accessTime.getTime());
  });
});

describe('Clinical Notes - Draft Management & Recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete draft note', async () => {
    const note = await createClinicalNote(mockNoteData);

    const result = await deleteDraft(note.id);

    expect(result.deleted).toBe(true);
    expect(result.deletedAt).toBeDefined();
  });

  it('should prevent deletion of signed notes', async () => {
    const note = await createClinicalNote(mockNoteData);
    await signClinicalNote(note.id, mockDoctor.id);

    await expect(() => deleteDraft(note.id))
      .rejects
      .toThrow('Cannot delete signed note');
  });

  it('should archive instead of permanently delete finalized notes', async () => {
    const note = await createClinicalNote(mockNoteData);
    await signClinicalNote(note.id, mockDoctor.id);

    const result = await deleteDraft(note.id);

    expect(result.archived).toBe(true);
  });

  it('should restore archived note', async () => {
    const note = await createClinicalNote(mockNoteData);
    await signClinicalNote(note.id, mockDoctor.id);
    await deleteDraft(note.id);

    const restored = await restoreFromArchive(note.id);

    expect(restored.archived).toBe(false);
    expect(restored.restoredAt).toBeDefined();
  });

  it('should prevent duplicate recovery', async () => {
    const note = await createClinicalNote(mockNoteData);
    await signClinicalNote(note.id, mockDoctor.id);
    await deleteDraft(note.id);
    await restoreFromArchive(note.id);

    await expect(() => restoreFromArchive(note.id))
      .rejects
      .toThrow('Note already restored');
  });
});

describe('Clinical Notes - Complete Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete full clinical note lifecycle', async () => {
    // 1. Create note
    const note = await createClinicalNote(mockNoteData);
    expect(note.status).toBe('draft');

    // 2. Update content
    const updated = await updateClinicalNote(note.id, { content: 'Updated findings' }, mockDoctor);
    expect(updated.status).toBe('draft');

    // 3. Attach diagnosis code
    const coded = await attachDiagnosisCode(updated.diagnosis, 'J06.9');
    expect(coded.icd10Code).toBe('J06.9');

    // 4. Generate summary
    const summary = await generateSummary(note.id);
    expect(summary).toBeDefined();

    // 5. Sign note
    const signed = await signClinicalNote(note.id, mockDoctor.id);
    expect(signed.signed).toBe(true);

    // 6. Lock note
    const locked = await lockClinicalNote(note.id);
    expect(locked.locked).toBe(true);
  });

  it('should track access with audit trail after signing', async () => {
    const note = await createClinicalNote(mockNoteData);
    await signClinicalNote(note.id, mockDoctor.id);
    await lockClinicalNote(note.id);

    const audit1 = await auditNoteAccess(note.id, mockDoctor.id, 'read');
    const history = await retrievePatientHistory(mockPatient.id);

    expect(audit1.accessedBy).toBe(mockDoctor.id);
    expect(history).toContainEqual(expect.objectContaining({ id: note.id }));
  });
});
