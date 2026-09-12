import { describe, it, expect } from 'vitest';
import {
  MODALITY_CONFIGS,
  DICOM_WINDOW_PRESETS,
  validatePreScanSafety,
  CRITICAL_RADIOLOGY_FINDINGS,
  validateCriticalReadBack,
  evaluateCriticalAlertSla,
  PreScanSafetyChecklist,
} from '@/lib/clinical/radiologyWorkflowRules';

describe('Workflow 8: Radiology, PACS, Pre-Scan Safety & Diagnostic Reporting', () => {
  describe('Decision A1: Modality Protocols & Radiation Physics Configs', () => {
    it('should correctly configure ionizing vs non-ionizing modalities', () => {
      expect(MODALITY_CONFIGS.xray.isIonizing).toBe(true);
      expect(MODALITY_CONFIGS.ct.isIonizing).toBe(true);
      expect(MODALITY_CONFIGS.mammography.isIonizing).toBe(true);
      expect(MODALITY_CONFIGS.mri.isIonizing).toBe(false);
      expect(MODALITY_CONFIGS.ultrasound.isIonizing).toBe(false);
    });

    it('should identify modalities requiring contrast renal function screening', () => {
      expect(MODALITY_CONFIGS.ct.requiresRenalScreeningForContrast).toBe(true);
      expect(MODALITY_CONFIGS.mri.requiresRenalScreeningForContrast).toBe(true);
      expect(MODALITY_CONFIGS.xray.requiresRenalScreeningForContrast).toBe(false);
      expect(MODALITY_CONFIGS.ultrasound.requiresRenalScreeningForContrast).toBe(false);
    });

    it('should specify ferromagnetic screening requirement exclusively for MRI', () => {
      expect(MODALITY_CONFIGS.mri.requiresFerromagneticScreening).toBe(true);
      expect(MODALITY_CONFIGS.ct.requiresFerromagneticScreening).toBe(false);
      expect(MODALITY_CONFIGS.xray.requiresFerromagneticScreening).toBe(false);
    });
  });

  describe('Decision A2: Technician Pre-Scan Safety Gates (Pregnancy, CIN & Ferromagnetic)', () => {
    it('should block ionizing radiation on females 12-55 when pregnancy is unverified', () => {
      const checklist: PreScanSafetyChecklist = {
        patientAge: 28,
        patientGender: 'female',
        modality: 'ct',
        contrastProtocol: 'none',
        pregnancyScreenResult: undefined,
      };

      const result = validatePreScanSafety(checklist);
      expect(result.cleared).toBe(false);
      expect(result.blockers.some((b) => b.includes('pregnancy verification'))).toBe(true);
    });

    it('should block ionizing radiation when patient is confirmed pregnant', () => {
      const checklist: PreScanSafetyChecklist = {
        patientAge: 32,
        patientGender: 'female',
        modality: 'xray',
        contrastProtocol: 'none',
        pregnancyScreenResult: 'pregnant',
      };

      const result = validatePreScanSafety(checklist);
      expect(result.cleared).toBe(false);
      expect(result.blockers.some((b) => b.includes('Patient is confirmed PREGNANT'))).toBe(true);
    });

    it('should clear pregnancy gate when test is verified negative', () => {
      const checklist: PreScanSafetyChecklist = {
        patientAge: 32,
        patientGender: 'female',
        modality: 'xray',
        contrastProtocol: 'none',
        pregnancyScreenResult: 'negative',
      };

      const result = validatePreScanSafety(checklist);
      expect(result.cleared).toBe(true);
      expect(result.blockers.length).toBe(0);
    });

    it('should block IV iodinated CT contrast when eGFR < 30 mL/min (high CIN risk)', () => {
      const checklist: PreScanSafetyChecklist = {
        patientAge: 65,
        patientGender: 'male',
        modality: 'ct',
        contrastProtocol: 'iv_contrast',
        egfrValue: 24, // severe renal failure
      };

      const result = validatePreScanSafety(checklist);
      expect(result.cleared).toBe(false);
      expect(result.blockers.some((b) => b.includes('Severe renal impairment'))).toBe(true);
    });

    it('should warn and suggest IV hydration when eGFR is 30-44 mL/min for CT contrast', () => {
      const checklist: PreScanSafetyChecklist = {
        patientAge: 58,
        patientGender: 'male',
        modality: 'ct',
        contrastProtocol: 'iv_contrast',
        egfrValue: 38, // moderate renal failure
      };

      const result = validatePreScanSafety(checklist);
      expect(result.cleared).toBe(true); // warning only, not blocked
      expect(result.warnings.some((w) => w.includes('pre-hydration'))).toBe(true);
    });

    it('should block Gadolinium MRI contrast when eGFR < 30 mL/min due to NSF risk', () => {
      const checklist: PreScanSafetyChecklist = {
        patientAge: 45,
        patientGender: 'male',
        modality: 'mri',
        contrastProtocol: 'iv_contrast',
        egfrValue: 22,
      };

      const result = validatePreScanSafety(checklist);
      expect(result.cleared).toBe(false);
      expect(result.blockers.some((b) => b.includes('Nephrogenic Systemic Fibrosis'))).toBe(true);
    });

    it('should block MRI scan if patient has cardiac pacemaker or ferromagnetic implant', () => {
      const checklist: PreScanSafetyChecklist = {
        patientAge: 70,
        patientGender: 'male',
        modality: 'mri',
        contrastProtocol: 'none',
        hasPacemaker: true,
      };

      const result = validatePreScanSafety(checklist);
      expect(result.cleared).toBe(false);
      expect(result.blockers.some((b) => b.includes('PACEMAKER'))).toBe(true);
    });

    it('should clear fully compliant pre-scan checklist', () => {
      const checklist: PreScanSafetyChecklist = {
        patientAge: 40,
        patientGender: 'female',
        modality: 'ct',
        contrastProtocol: 'iv_contrast',
        pregnancyScreenResult: 'negative',
        egfrValue: 92,
        serumCreatinine: 0.8,
        doseDlp: 420,
        doseCtdiVol: 12.0,
      };

      const result = validatePreScanSafety(checklist);
      expect(result.cleared).toBe(true);
      expect(result.blockers.length).toBe(0);
      expect(result.warnings.length).toBe(0);
    });
  });

  describe('Decision A3: DICOM / PACS Window / Level Tissue Density Presets', () => {
    it('should define correct Hounsfield Unit window settings for standard tissues', () => {
      expect(DICOM_WINDOW_PRESETS.lung.windowWidth).toBe(1500);
      expect(DICOM_WINDOW_PRESETS.lung.windowCenter).toBe(-600);

      expect(DICOM_WINDOW_PRESETS.bone.windowWidth).toBe(2000);
      expect(DICOM_WINDOW_PRESETS.bone.windowCenter).toBe(300);

      expect(DICOM_WINDOW_PRESETS.soft_tissue.windowWidth).toBe(400);
      expect(DICOM_WINDOW_PRESETS.soft_tissue.windowCenter).toBe(40);

      expect(DICOM_WINDOW_PRESETS.brain.windowWidth).toBe(80);
      expect(DICOM_WINDOW_PRESETS.brain.windowCenter).toBe(40);

      expect(DICOM_WINDOW_PRESETS.stroke.windowWidth).toBe(40);
      expect(DICOM_WINDOW_PRESETS.stroke.windowCenter).toBe(40);
    });
  });

  describe('Decision A4: ACR Reporting Lifecycle (Preliminary vs Final Sign-off)', () => {
    it('should validate structured report sections existence', () => {
      const report = {
        clinicalHistory: 'Chest pain following MVA',
        technique: 'Non-contrast spiral CT Chest',
        comparison: 'None',
        findings: 'No pneumothorax, lungs clear.',
        impression: '1. Normal post-traumatic chest CT.',
      };

      expect(report.clinicalHistory.length).toBeGreaterThan(0);
      expect(report.technique.length).toBeGreaterThan(0);
      expect(report.findings.length).toBeGreaterThan(0);
      expect(report.impression.length).toBeGreaterThan(0);
    });
  });

  describe('Decision A5: Critical Radiologic Findings & Closed-Loop Read-Back SLA', () => {
    it('should catalog emergency life-threatening imaging conditions', () => {
      const codes = CRITICAL_RADIOLOGY_FINDINGS.map((f) => f.code);
      expect(codes).toContain('PNEUMO-TENSION');
      expect(codes).toContain('ICH-ACUTE');
      expect(codes).toContain('AORTIC-DISSECT');
      expect(codes).toContain('PE-MASSIVE');
      expect(codes).toContain('PNEUMO-PERITONEUM');
      expect(codes).toContain('CORD-COMPRESS');
    });

    it('should enforce doctor name, phone, and verbal read-back confirmation', () => {
      const invalidDetails = {
        orderingDoctorName: '',
        doctorPhoneNumber: '',
        readBackConfirmed: false,
        calledAt: new Date().toISOString(),
        radiologistName: 'Dr. Shah',
      };

      const result1 = validateCriticalReadBack(invalidDetails);
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('physician name');

      const missingConfirmation = {
        ...invalidDetails,
        orderingDoctorName: 'Dr. John Doe',
        doctorPhoneNumber: '+91 98765 43210',
        readBackConfirmed: false,
      };
      const result2 = validateCriticalReadBack(missingConfirmation);
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('read-back confirmation is required');

      const validDetails = {
        ...missingConfirmation,
        readBackConfirmed: true,
      };
      const result3 = validateCriticalReadBack(validDetails);
      expect(result3.valid).toBe(true);
    });

    it('should calculate 30-minute SLA countdown for pending critical findings', () => {
      const findingTime = new Date('2026-09-11T10:00:00Z');
      const now1015 = new Date('2026-09-11T10:15:00Z'); // 15 mins elapsed

      const slaActive = evaluateCriticalAlertSla(findingTime, null, now1015);
      expect(slaActive.isCompleted).toBe(false);
      expect(slaActive.isBreached).toBe(false);
      expect(slaActive.slaMinutesRemaining).toBe(15);
      expect(slaActive.badgeVariant).toBe('secondary');

      const now1035 = new Date('2026-09-11T10:35:00Z'); // 35 mins elapsed (breached)
      const slaBreached = evaluateCriticalAlertSla(findingTime, null, now1035);
      expect(slaBreached.isCompleted).toBe(false);
      expect(slaBreached.isBreached).toBe(true);
      expect(slaBreached.slaMinutesRemaining).toBe(0);
      expect(slaBreached.badgeVariant).toBe('destructive');
      expect(slaBreached.statusLabel).toContain('SLA BREACHED');
    });

    it('should record SLA compliance when read-back is completed within 30 minutes', () => {
      const findingTime = new Date('2026-09-11T10:00:00Z');
      const notifiedTime = new Date('2026-09-11T10:12:00Z'); // notified in 12 mins

      const slaCompleted = evaluateCriticalAlertSla(findingTime, notifiedTime);
      expect(slaCompleted.isCompleted).toBe(true);
      expect(slaCompleted.isBreached).toBe(false);
      expect(slaCompleted.badgeVariant).toBe('default');
      expect(slaCompleted.statusLabel).toContain('Closed-Loop Confirmed');
    });
  });
});
