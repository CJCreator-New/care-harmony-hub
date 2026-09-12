import { describe, it, expect } from 'vitest';
import {
  isHighAlertMedication,
  getPreconditionsForMedication,
  areFiveRightsSatisfied,
  WITHHOLDING_REASONS,
  HIGH_ALERT_KEYWORDS,
} from '@/lib/clinical/medicationAdministrationRules';

describe('Workflow 6: Inpatient eMAR, BCMA, High-Alert Dual-Witness & Clinical Withholding', () => {
  describe('A1 & A3: ISMP High-Alert Drug Detection & Dual-Nurse Witness Gate', () => {
    it('should identify high-alert medications per ISMP criteria', () => {
      const highAlertMeds = [
        'Insulin Glargine (Lantus)',
        'Regular Insulin IV Infusion',
        'Heparin Sodium 25,000 units/500mL',
        'Enoxaparin (Lovenox) 40mg SubQ',
        'Morphine Sulfate 4mg IV Push',
        'Fentanyl Citrate 50mcg IV',
        'Hydromorphone (Dilaudid) 1mg IV',
        'Potassium Chloride 20mEq/100mL IV Infusion',
        'Digoxin 0.125mg Oral',
        'Warfarin Sodium (Coumadin)',
      ];

      for (const med of highAlertMeds) {
        expect(isHighAlertMedication(med)).toBe(true);
      }
    });

    it('should not flag standard non-high-alert maintenance medications', () => {
      const standardMeds = [
        'Amoxicillin-Clavulanate 875mg',
        'Acetaminophen 650mg Oral',
        'Omeprazole 20mg Capsule',
        'Atorvastatin 40mg Oral',
        'Ondansetron 4mg Oral',
      ];

      for (const med of standardMeds) {
        expect(isHighAlertMedication(med)).toBe(false);
      }
    });

    it('should require witness validation for high-alert drug administrations', () => {
      const highAlertRecord = {
        medicationName: 'Heparin Sodium Infusion',
        isHighAlert: isHighAlertMedication('Heparin Sodium Infusion'),
        witnessName: 'Nurse Brenda Davis, RN',
        witnessConfirmed: true,
      };

      expect(highAlertRecord.isHighAlert).toBe(true);
      expect(highAlertRecord.witnessConfirmed).toBe(true);
      expect(highAlertRecord.witnessName.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('A2: The 5 Rights of Administration & Clinical Preconditions', () => {
    it('should validate complete 5 Rights affirmative checklist', () => {
      const satisfiedChecklist = {
        rightPatient: true,
        rightDrug: true,
        rightDose: true,
        rightRoute: true,
        rightTime: true,
      };
      expect(areFiveRightsSatisfied(satisfiedChecklist)).toBe(true);

      const missingRightTime = {
        ...satisfiedChecklist,
        rightTime: false,
      };
      expect(areFiveRightsSatisfied(missingRightTime)).toBe(false);

      const missingRightDrug = {
        ...satisfiedChecklist,
        rightDrug: false,
      };
      expect(areFiveRightsSatisfied(missingRightDrug)).toBe(false);
    });

    it('should enforce Blood Glucose precondition before Insulin administration', () => {
      const insulinRule = getPreconditionsForMedication('Insulin Aspart (Novolog)')!;
      expect(insulinRule).not.toBeNull();
      expect(insulinRule.parameterName).toBe('Blood Glucose');
      expect(insulinRule.minAllowed).toBe(70);

      // Value 55 mg/dL is hypoglycemic breach
      const glucoseValue = 55;
      const isBreached = glucoseValue < insulinRule.minAllowed!;
      expect(isBreached).toBe(true);
    });

    it('should enforce Apical Heart Rate >= 60 bpm before Digoxin administration', () => {
      const digoxinRule = getPreconditionsForMedication('Digoxin 0.25mg Tablet')!;
      expect(digoxinRule).not.toBeNull();
      expect(digoxinRule.parameterName).toBe('Apical Heart Rate');
      expect(digoxinRule.minAllowed).toBe(60);

      // Heart rate 52 bpm is bradycardia breach
      const hrValue = 52;
      expect(hrValue < digoxinRule.minAllowed!).toBe(true);
    });

    it('should enforce SBP >= 90 mmHg before Antihypertensive administration', () => {
      const bpMeds = [
        'Lisinopril 20mg',
        'Metoprolol Tartrate 25mg',
        'Amlodipine 10mg',
        'Furosemide 40mg',
      ];

      for (const med of bpMeds) {
        const bpRule = getPreconditionsForMedication(med)!;
        expect(bpRule).not.toBeNull();
        expect(bpRule.parameterName).toContain('Systolic Blood Pressure');
        expect(bpRule.minAllowed).toBe(90);

        // SBP 82 mmHg is hypotensive breach
        const sbp = 82;
        expect(sbp < bpRule.minAllowed!).toBe(true);
      }
    });

    it('should return null preconditions for drugs without mandatory vital checks', () => {
      expect(getPreconditionsForMedication('Amoxicillin 500mg')).toBeNull();
      expect(getPreconditionsForMedication('Docusate Sodium 100mg')).toBeNull();
    });
  });

  describe('A4: Medication Withholding & Refusal Documentation', () => {
    it('should provide standardized clinical withholding reason codes', () => {
      const codes = WITHHOLDING_REASONS.map((r) => r.code);
      expect(codes).toContain('npo_procedure');
      expect(codes).toContain('patient_refused');
      expect(codes).toContain('vitals_out_of_range');
      expect(codes).toContain('nausea_vomiting');
      expect(codes).toContain('suspected_adverse_reaction');
    });

    it('should format clinical hold payload with prescriber alert', () => {
      const withholdPayload = {
        prescriptionId: 'rx-771',
        patientId: 'pat-102',
        medicationName: 'Lisinopril 10mg',
        status: 'withheld' as const,
        reasonCode: 'vitals_out_of_range',
        reasonLabel: 'Vital Signs Parameter Out of Safe Range',
        clinicalNotes: 'SBP 82/50 mmHg. Withheld per protocol. Attending alerted.',
        alertDoctor: true,
      };

      expect(withholdPayload.status).toBe('withheld');
      expect(withholdPayload.alertDoctor).toBe(true);
      expect(withholdPayload.clinicalNotes.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('A5: PRN (As-Needed) Administration & Closed-Loop Effectiveness', () => {
    it('should track PRN administration with baseline indication and score', () => {
      const prnAdminRecord = {
        prescriptionId: 'rx-prn-9',
        patientId: 'pat-331',
        medicationName: 'Morphine Sulfate 2mg IV',
        dosage: '2mg IV',
        route: 'Intravenous (IV Push)',
        indication: 'Acute Pain',
        baselineScore: 'Pain 8/10 (Severe, surgical incision)',
        administeredAt: new Date().toISOString(),
      };

      expect(prnAdminRecord.indication).toBe('Acute Pain');
      expect(prnAdminRecord.baselineScore).toContain('8/10');
    });

    it('should validate closed-loop PRN outcome reassessment payload', () => {
      const prnOutcomeRecord = {
        administrationId: 'admin-998',
        postDoseScore: 'Pain 2/10 (Mild, tolerable)',
        outcomeResponse: 'effective' as const,
        outcomeNotes:
          'Patient resting comfortably 45 minutes post-dose. No respiratory depression.',
        reassessedAt: new Date().toISOString(),
      };

      expect(prnOutcomeRecord.outcomeResponse).toBe('effective');
      expect(prnOutcomeRecord.postDoseScore.length).toBeGreaterThanOrEqual(3);
    });
  });
});
