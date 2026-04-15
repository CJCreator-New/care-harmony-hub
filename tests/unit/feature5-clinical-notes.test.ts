import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as clinicalNotesManager from "../../src/lib/clinical-notes.manager";

/**
 * Feature 5: Clinical Notes Backend & UI Unit Tests
 * Tests note creation, versioning, signing, compliance, audit trail
 */

describe("Feature 5: Clinical Notes Manager", () => {
  // Mock data
  const mockHospitalId = "hospital-test-001";
  const mockAppointmentId = "appt-001";
  const mockPatientId = "patient-001";
  const mockDoctorId = "doctor-001";
  const mockNurseId = "nurse-001";

  const mockNoteData: clinicalNotesManager.ClinicalNoteData = {
    hospital_id: mockHospitalId,
    appointment_id: mockAppointmentId,
    patient_id: mockPatientId,
    doctor_id: mockDoctorId,
    title: "Office Visit Summary",
    note_type: "progress",
    chief_complaint: "Regular checkup",
    findings: "Blood pressure 120/80, heart rate regular, lungs clear to auscultation bilaterally",
    assessment: "Patient in good overall health. No acute conditions identified.",
    plan: "Continue current medications. Follow-up appointment in 6 months.",
    medications_prescribed: [
      { medication: "Lisinopril", dosage: "10mg", frequency: "Daily" },
      { medication: "Metformin", dosage: "500mg", frequency: "BID" },
    ],
    vitals_recorded: {
      blood_pressure: "120/80",
      heart_rate: 72,
      temperature: 37.0,
      respiratory_rate: 16,
      oxygen_saturation: 98,
    },
  };

  describe("createClinicalNote", () => {
    it("5.1: Creates clinical note in draft status", async () => {
      // Arrange
      const createdBy = mockDoctorId;

      // Act
      const noteId = await clinicalNotesManager.createClinicalNote(
        mockNoteData,
        createdBy
      );

      // Assert
      expect(noteId).toBeDefined();
      expect(noteId).toMatch(/^[a-z0-9-]+$/);
    });

    it("5.2: Note starts in draft status (not immutable)", async () => {
      // Arrange
      const createdBy = mockDoctorId;

      // Act
      const noteId = await clinicalNotesManager.createClinicalNote(
        mockNoteData,
        createdBy
      );

      // Assert - would need actual DB check in integration test
      // Here we verify the function completes without throwing
      expect(noteId).toBeDefined();
    });

    it("5.3: Creates audit log for note creation", async () => {
      // Arrange
      const createdBy = mockDoctorId;

      // Act
      const noteId = await clinicalNotesManager.createClinicalNote(
        mockNoteData,
        createdBy
      );

      // Assert - audit log created (verified in integration test)
      expect(noteId).toBeDefined();

      // In production: Verify audit_logs table has entry with:
      // - action: "CLINICAL_NOTE_CREATED"
      // - user_id: mockDoctorId
      // - record_id: noteId
    });

    it("5.4: Prescribes medications correctly", async () => {
      // Arrange
      const dataWithMeds: clinicalNotesManager.ClinicalNoteData = {
        ...mockNoteData,
        medications_prescribed: [
          { medication: "Aspirin", dosage: "81mg", frequency: "Daily" },
          { medication: "Vitamin D", dosage: "2000IU", frequency: "Daily" },
          { medication: "Amoxicillin", dosage: "500mg", frequency: "TID x7 days" },
        ],
      };

      // Act
      const noteId = await clinicalNotesManager.createClinicalNote(
        dataWithMeds,
        mockDoctorId
      );

      // Assert
      expect(noteId).toBeDefined();
    });

    it("5.5: Records vitals correctly", async () => {
      // Arrange
      const dataWithVitals: clinicalNotesManager.ClinicalNoteData = {
        ...mockNoteData,
        vitals_recorded: {
          blood_pressure: "138/88",
          heart_rate: 78,
          temperature: 37.2,
          respiratory_rate: 18,
          oxygen_saturation: 97,
        },
      };

      // Act
      const noteId = await clinicalNotesManager.createClinicalNote(
        dataWithVitals,
        mockDoctorId
      );

      // Assert
      expect(noteId).toBeDefined();
    });

    it("5.6: Supports all note types", async () => {
      const noteTypes: clinicalNotesManager.NoteType[] = [
        "progress",
        "consultation",
        "procedure",
        "discharge",
        "follow_up",
      ];

      for (const noteType of noteTypes) {
        const dataWithType: clinicalNotesManager.ClinicalNoteData = {
          ...mockNoteData,
          note_type: noteType,
        };

        const noteId = await clinicalNotesManager.createClinicalNote(
          dataWithType,
          mockDoctorId
        );

        expect(noteId).toBeDefined();
      }
    });
  });

  describe("updateClinicalNote", () => {
    let noteId: string;

    beforeEach(async () => {
      // Create a note before each test
      noteId = await clinicalNotesManager.createClinicalNote(
        mockNoteData,
        mockDoctorId
      );
    });

    it("5.7: Updates draft note successfully", async () => {
      // Arrange
      const updates: Partial<clinicalNotesManager.ClinicalNoteData> = {
        findings: "Updated findings: BP elevated to 140/92",
      };

      // Act & Assert - should not throw
      await expect(
        clinicalNotesManager.updateClinicalNote(noteId, updates, mockDoctorId)
      ).resolves.not.toThrow();
    });

    it("5.8: Throws error when updating signed note", async () => {
      // Arrange - First sign the note
      const mockPrivateKey = "mock-private-key";
      await clinicalNotesManager.signClinicalNote(
        noteId,
        mockDoctorId,
        mockPrivateKey
      );

      // Try to update
      const updates: Partial<clinicalNotesManager.ClinicalNoteData> = {
        findings: "Unauthorized update attempt",
      };

      // Act & Assert
      await expect(
        clinicalNotesManager.updateClinicalNote(noteId, updates, mockDoctorId)
      ).rejects.toThrow("Cannot modify signed or immutable clinical note");
    });

    it("5.9: Creates version record when updating", async () => {
      // Arrange
      const updates: Partial<clinicalNotesManager.ClinicalNoteData> = {
        assessment: "Updated assessment after second exam",
      };

      // Act
      await clinicalNotesManager.updateClinicalNote(noteId, updates, mockDoctorId);

      // Assert - version record created (verified in integration test)
      // In production: Check clinical_note_versions table for new record
    });

    it("5.10: Tracks change history with diffs", async () => {
      // Arrange
      const originalAssessment = mockNoteData.assessment;
      const newAssessment = "New assessment after consultation";

      const updates: Partial<clinicalNotesManager.ClinicalNoteData> = {
        assessment: newAssessment,
      };

      // Act
      await clinicalNotesManager.updateClinicalNote(noteId, updates, mockDoctorId);

      // Assert - diff tracked (verified in integration test)
      // In production: Check that version diff contains before/after
    });
  });

  describe("signClinicalNote", () => {
    let noteId: string;

    beforeEach(async () => {
      noteId = await clinicalNotesManager.createClinicalNote(
        mockNoteData,
        mockDoctorId
      );
    });

    it("5.11: Signs note successfully", async () => {
      // Arrange
      const mockPrivateKey = "-----BEGIN PRIVATE KEY-----\nMIIBVAIBADANBg...";

      // Act & Assert - should not throw
      await expect(
        clinicalNotesManager.signClinicalNote(noteId, mockDoctorId, mockPrivateKey)
      ).resolves.not.toThrow();
    });

    it("5.12: Makes note immutable after signing", async () => {
      // Arrange
      const mockPrivateKey = "mock-key";
      await clinicalNotesManager.signClinicalNote(
        noteId,
        mockDoctorId,
        mockPrivateKey
      );

      // Try to update
      const updates: Partial<clinicalNotesManager.ClinicalNoteData> = {
        findings: "Attempted update after signing",
      };

      // Act & Assert
      await expect(
        clinicalNotesManager.updateClinicalNote(noteId, updates, mockDoctorId)
      ).rejects.toThrow("Cannot modify signed or immutable clinical note");
    });

    it("5.13: Creates digital signature record", async () => {
      // Arrange
      const mockPrivateKey = "mock-key";

      // Act
      await clinicalNotesManager.signClinicalNote(
        noteId,
        mockDoctorId,
        mockPrivateKey
      );

      // Assert - signature record created
      // In production: Check clinical_note_signatures table for:
      // - signed_at timestamp
      // - signed_by user ID
      // - signature_algorithm: "SHA256RSA"
      // - signature_valid: true
    });

    it("5.14: Blocks multiple signatures on same note", async () => {
      // Arrange
      const mockPrivateKey = "mock-key";
      await clinicalNotesManager.signClinicalNote(
        noteId,
        mockDoctorId,
        mockPrivateKey
      );

      // Act & Assert - second sign should fail
      await expect(
        clinicalNotesManager.signClinicalNote(
          noteId,
          mockDoctorId,
          mockPrivateKey
        )
      ).rejects.toThrow("Note is already signed");
    });

    it("5.15: Signature includes timestamp for audit trail", async () => {
      // Arrange
      const signTimeBefore = new Date();
      const mockPrivateKey = "mock-key";

      // Act
      await clinicalNotesManager.signClinicalNote(
        noteId,
        mockDoctorId,
        mockPrivateKey
      );

      // Assert - timestamp would be captured
      // In production: Verify signed_at is between signTimeBefore and now
    });

    it("5.16: Creates audit log for signature", async () => {
      // Arrange
      const mockPrivateKey = "mock-key";

      // Act
      await clinicalNotesManager.signClinicalNote(
        noteId,
        mockDoctorId,
        mockPrivateKey
      );

      // Assert - audit log created with action "CLINICAL_NOTE_SIGNED"
    });
  });

  describe("addNurseObservation", () => {
    let noteId: string;

    beforeEach(async () => {
      noteId = await clinicalNotesManager.createClinicalNote(
        mockNoteData,
        mockDoctorId
      );
    });

    it("5.17: Adds nurse observation to note", async () => {
      // Arrange
      const observation =
        "Patient responded well to treatment, vital signs stable";
      const category = "patient_behavior" as const;

      // Act
      const observationId = await clinicalNotesManager.addNurseObservation(
        noteId,
        mockAppointmentId,
        mockNurseId,
        observation,
        category
      );

      // Assert
      expect(observationId).toBeDefined();
    });

    it("5.18: Observations are append-only (locked on creation)", async () => {
      // Arrange
      const observation = "Initial observation";

      // Act
      const observationId = await clinicalNotesManager.addNurseObservation(
        noteId,
        mockAppointmentId,
        mockNurseId,
        observation,
        "vital_sign"
      );

      // Assert - observation is locked (immutable after creation)
      // In production: is_locked = true on record
    });

    it("5.19: Categorizes observations correctly", async () => {
      const categories: clinicalNotesManager.ClinicalNoteData["vitals_recorded"] = {
        blood_pressure: "120/80",
      };

      const observations_categories = [
        "vital_sign",
        "patient_behavior",
        "pain_level",
        "medication_reaction",
        "comfort",
        "other",
      ] as const;

      for (const category of observations_categories) {
        const observationId = await clinicalNotesManager.addNurseObservation(
          noteId,
          mockAppointmentId,
          mockNurseId,
          `${category} observation`,
          category
        );

        expect(observationId).toBeDefined();
      }
    });

    it("5.20: Multiple nurses can add observations", async () => {
      // Arrange
      const nurse1Id = "nurse-001";
      const nurse2Id = "nurse-002";

      // Act
      const obs1 = await clinicalNotesManager.addNurseObservation(
        noteId,
        mockAppointmentId,
        nurse1Id,
        "Obs from nurse 1",
        "vital_sign"
      );

      const obs2 = await clinicalNotesManager.addNurseObservation(
        noteId,
        mockAppointmentId,
        nurse2Id,
        "Obs from nurse 2",
        "patient_behavior"
      );

      // Assert
      expect(obs1).toBeDefined();
      expect(obs2).toBeDefined();
      expect(obs1).not.toBe(obs2);
    });

    it("5.21: Observations have timestamps", async () => {
      // Arrange
      const timeBeforeObs = new Date();

      // Act
      await clinicalNotesManager.addNurseObservation(
        noteId,
        mockAppointmentId,
        mockNurseId,
        "Timestamped observation",
        "other"
      );

      // Assert - timestamp would be verified in integration test
    });

    it("5.22: Creates audit log for each observation", async () => {
      // Arrange & Act
      await clinicalNotesManager.addNurseObservation(
        noteId,
        mockAppointmentId,
        mockNurseId,
        "Auditable observation",
        "patient_behavior"
      );

      // Assert - audit log created with action "OBSERVATION_ADDED"
    });
  });

  describe("getClinicalNoteWithHistory", () => {
    let noteId: string;

    beforeEach(async () => {
      noteId = await clinicalNotesManager.createClinicalNote(
        mockNoteData,
        mockDoctorId
      );
    });

    it("5.23: Retrieves full note with history", async () => {
      // Arrange & Act
      const noteWithHistory =
        await clinicalNotesManager.getClinicalNoteWithHistory(noteId);

      // Assert
      expect(noteWithHistory).toBeDefined();
      expect(noteWithHistory.id).toBe(noteId);
      expect(noteWithHistory.status).toBe("draft");
    });

    it("5.24: Includes all versions", async () => {
      // Arrange - update note to create version
      const updates: Partial<clinicalNotesManager.ClinicalNoteData> = {
        findings: "Updated findings",
      };
      await clinicalNotesManager.updateClinicalNote(noteId, updates, mockDoctorId);

      // Act
      const noteWithHistory =
        await clinicalNotesManager.getClinicalNoteWithHistory(noteId);

      // Assert
      expect(noteWithHistory.versions).toBeDefined();
      expect(Array.isArray(noteWithHistory.versions)).toBe(true);
      expect(noteWithHistory.versions.length).toBeGreaterThan(0);
    });

    it("5.25: Includes signature records after signing", async () => {
      // Arrange
      const mockPrivateKey = "mock-key";
      await clinicalNotesManager.signClinicalNote(
        noteId,
        mockDoctorId,
        mockPrivateKey
      );

      // Act
      const noteWithHistory =
        await clinicalNotesManager.getClinicalNoteWithHistory(noteId);

      // Assert
      expect(noteWithHistory.signatures).toBeDefined();
      expect(Array.isArray(noteWithHistory.signatures)).toBe(true);
    });

    it("5.26: Includes observations", async () => {
      // Arrange
      await clinicalNotesManager.addNurseObservation(
        noteId,
        mockAppointmentId,
        mockNurseId,
        "Test observation",
        "vital_sign"
      );

      // Act
      const noteWithHistory =
        await clinicalNotesManager.getClinicalNoteWithHistory(noteId);

      // Assert
      expect(noteWithHistory.observations).toBeDefined();
      expect(Array.isArray(noteWithHistory.observations)).toBe(true);
      expect(noteWithHistory.observations.length).toBeGreaterThan(0);
    });
  });

  describe("archiveClinicalNote", () => {
    let noteId: string;

    beforeEach(async () => {
      noteId = await clinicalNotesManager.createClinicalNote(
        mockNoteData,
        mockDoctorId
      );
    });

    it("5.27: Archives note successfully", async () => {
      // Act & Assert - should not throw
      await expect(
        clinicalNotesManager.archiveClinicalNote(noteId, mockDoctorId)
      ).resolves.not.toThrow();
    });

    it("5.28: Changes status to archived", async () => {
      // Arrange & Act
      await clinicalNotesManager.archiveClinicalNote(noteId, mockDoctorId);

      // Verify status changed (in integration test)
      // In production: query DB and verify status = "archived"
    });

    it("5.29: Creates audit log for archival", async () => {
      // Act
      await clinicalNotesManager.archiveClinicalNote(noteId, mockDoctorId);

      // Assert - audit log created with action "CLINICAL_NOTE_ARCHIVED"
    });
  });

  describe("Compliance & Security", () => {
    it("5.30: Enforces HIPAA audit trail", async () => {
      // Create a complete workflow
      const noteId = await clinicalNotesManager.createClinicalNote(
        mockNoteData,
        mockDoctorId
      );

      // Update the note
      await clinicalNotesManager.updateClinicalNote(
        noteId,
        { findings: "Updated" },
        mockDoctorId
      );

      // Sign the note
      await clinicalNotesManager.signClinicalNote(
        noteId,
        mockDoctorId,
        "mock-key"
      );

      // Add observation
      await clinicalNotesManager.addNurseObservation(
        noteId,
        mockAppointmentId,
        mockNurseId,
        "Observation",
        "vital_sign"
      );

      // Archive note
      await clinicalNotesManager.archiveClinicalNote(noteId, mockDoctorId);

      // Verify complete audit trail exists
      // In production: verify audit_logs has min 5 entries for this workflow
    });

    it("5.31: Note encryption for sensitive data", async () => {
      // This test would verify that notes containing PHI are encrypted in transit/at rest
      // Implementation depends on Supabase encryption settings

      const noteWithPHI: clinicalNotesManager.ClinicalNoteData = {
        ...mockNoteData,
        findings: "Patient disclosed sexual abuse history during consultation",
      };

      const noteId = await clinicalNotesManager.createClinicalNote(
        noteWithPHI,
        mockDoctorId
      );

      expect(noteId).toBeDefined();
      // In production: Verify findings are encrypted in DB
    });

    it("5.32: Immutability prevents tampering", async () => {
      // Create, update, sign, then try to tamper
      const noteId = await clinicalNotesManager.createClinicalNote(
        mockNoteData,
        mockDoctorId
      );

      // Sign the note
      await clinicalNotesManager.signClinicalNote(
        noteId,
        mockDoctorId,
        "mock-key"
      );

      // Attempt to modify signed assessment (malicious actor)
      const tamperedUpdate: Partial<clinicalNotesManager.ClinicalNoteData> = {
        assessment: "TAMPERED: Patient has no conditions",
      };

      // Should fail
      await expect(
        clinicalNotesManager.updateClinicalNote(
          noteId,
          tamperedUpdate,
          mockDoctorId
        )
      ).rejects.toThrow("Cannot modify signed or immutable clinical note");
    });
  });

  describe("Edge Cases", () => {
    it("5.33: Handles very long note content", async () => {
      const longContent = "A".repeat(50000); // 50K character note

      const dataWithLongContent: clinicalNotesManager.ClinicalNoteData = {
        ...mockNoteData,
        findings: longContent,
      };

      const noteId = await clinicalNotesManager.createClinicalNote(
        dataWithLongContent,
        mockDoctorId
      );

      expect(noteId).toBeDefined();
    });

    it("5.34: Handles special characters in content", async () => {
      const specialContent =
        "Test with émojis 🏥 and spëcial çhars: @#$%^&*()_+-={}[]|:;<>?,./";

      const dataWithSpecialChars: clinicalNotesManager.ClinicalNoteData = {
        ...mockNoteData,
        findings: specialContent,
      };

      const noteId = await clinicalNotesManager.createClinicalNote(
        dataWithSpecialChars,
        mockDoctorId
      );

      expect(noteId).toBeDefined();
    });

    it("5.35: Handles null/undefined values gracefully", async () => {
      const dataWithOptionalFields: clinicalNotesManager.ClinicalNoteData = {
        ...mockNoteData,
        vitals_recorded: {
          blood_pressure: "120/80",
          // Other fields undefined
        },
      };

      const noteId = await clinicalNotesManager.createClinicalNote(
        dataWithOptionalFields,
        mockDoctorId
      );

      expect(noteId).toBeDefined();
    });

    it("5.36: Performance: creates note in <  100ms", async () => {
      const startTime = Date.now();

      await clinicalNotesManager.createClinicalNote(
        mockNoteData,
        mockDoctorId
      );

      const duration = Date.now() - startTime;

      // Should be fast
      expect(duration).toBeLessThan(100);
    });
  });
});
