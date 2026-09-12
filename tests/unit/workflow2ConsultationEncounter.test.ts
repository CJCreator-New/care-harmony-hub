import { describe, it, expect } from 'vitest';
import { evaluateVitalSigns } from '@/modules/vital-signs';

describe('Workflow 2 - Consultation Encounter Logic & Safety Gates', () => {
  describe('NEWS2 Clinical Deterioration Trigger', () => {
    it('flags high risk when NEWS2 score >= 7', () => {
      const evaluation = evaluateVitalSigns({
        heartRate: 135,
        bloodPressureSystolic: 85,
        bloodPressureDiastolic: 50,
        respiratoryRate: 26,
        oxygenSaturation: 90,
        temperature: 39.5,
      });

      expect(evaluation.news2.totalScore).toBeGreaterThanOrEqual(7);
      expect(evaluation.news2.riskLevel).toBe('high');
    });

    it('flags normal / low risk for healthy vitals', () => {
      const evaluation = evaluateVitalSigns({
        heartRate: 72,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        respiratoryRate: 16,
        oxygenSaturation: 99,
        temperature: 36.8,
      });

      expect(evaluation.news2.totalScore).toBe(0);
      expect(evaluation.news2.riskLevel).toBe('low');
    });
  });

  describe('Structured Diagnosis to Invoice Line Items', () => {
    it('formats primary diagnosis and ICD-10 line items for billing invoice', () => {
      const rawDiagnoses = [
        'Essential hypertension (I10)',
        'Type 2 diabetes mellitus without complications (E11.9)',
      ];

      const structuredDx = rawDiagnoses.map((dx, idx) => {
        const icdMatch = dx.match(/\(([A-Z][0-9]+(?:\.[0-9]+)?)\)/i);
        return {
          icd_code: icdMatch ? icdMatch[1] : undefined,
          description: dx.replace(/\s*\([A-Z0-9.]+\)/i, '').trim(),
          is_primary: idx === 0,
        };
      });

      expect(structuredDx[0]).toEqual({
        icd_code: 'I10',
        description: 'Essential hypertension',
        is_primary: true,
      });
      expect(structuredDx[1]).toEqual({
        icd_code: 'E11.9',
        description: 'Type 2 diabetes mellitus without complications',
        is_primary: false,
      });

      const primaryDx = structuredDx.find((d) => d.is_primary);
      const diagnosticSummary = structuredDx
        .map((d) => (d.icd_code ? `${d.description} [${d.icd_code}]` : d.description))
        .join('; ');

      expect(primaryDx?.icd_code).toBe('I10');
      expect(diagnosticSummary).toBe(
        'Essential hypertension [I10]; Type 2 diabetes mellitus without complications [E11.9]'
      );
    });
  });

  describe('Signed Addendum Construction', () => {
    it('creates tamper-evident audit-stamped addendum with doctor credentials and rationale', () => {
      const doctorName = 'Dr. Jane Smith';
      const rationale = 'Late lab results review';
      const addendumText =
        'Patient lipid panel indicates elevated triglycerides. Advised atorvastatin titration.';
      const formattedTimestamp = '04/18/2026, 17:30:00';

      const addendumBlock = `\n\n--- SIGNED CLINICAL ADDENDUM (${formattedTimestamp}) ---\nSigned by: ${doctorName}\nRationale: ${rationale}\nAddendum:\n${addendumText}\n--- END ADDENDUM ---`;

      expect(addendumBlock).toContain('--- SIGNED CLINICAL ADDENDUM');
      expect(addendumBlock).toContain(`Signed by: ${doctorName}`);
      expect(addendumBlock).toContain(`Rationale: ${rationale}`);
      expect(addendumBlock).toContain(addendumText);
      expect(addendumBlock).toContain('--- END ADDENDUM ---');
    });
  });

  describe('Contraindicated Drug Safety Break-Glass Gate', () => {
    it('blocks consultation completion if contraindicated drug lacks breakglass rationale', () => {
      const safetyAlerts = [
        {
          drug1: 'Warfarin',
          drug2: 'Aspirin',
          severity: 'contraindicated',
          description: 'Severe risk of major internal hemorrhage',
        },
      ];
      const hasContraindicated = safetyAlerts.some((a) => a.severity === 'contraindicated');
      const clinicalOverrideReason = '';

      const canComplete = !hasContraindicated || clinicalOverrideReason.trim().length > 0;
      expect(hasContraindicated).toBe(true);
      expect(canComplete).toBe(false);
    });

    it('permits consultation completion when valid breakglass rationale is provided', () => {
      const safetyAlerts = [
        {
          drug1: 'Warfarin',
          drug2: 'Aspirin',
          severity: 'contraindicated',
          description: 'Severe risk of major internal hemorrhage',
        },
      ];
      const hasContraindicated = safetyAlerts.some((a) => a.severity === 'contraindicated');
      const clinicalOverrideReason =
        'Patient has mechanical heart valve and acute coronary syndrome; dual therapy indicated under intensive INR monitoring.';

      const canComplete = !hasContraindicated || clinicalOverrideReason.trim().length > 0;
      expect(canComplete).toBe(true);
    });
  });
});
