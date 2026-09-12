/**
 * Clinical Medication Administration Safety Rules
 * Implements ISMP (Institute for Safe Medication Practices) and Joint Commission standards.
 */

export const HIGH_ALERT_KEYWORDS = [
  'insulin',
  'heparin',
  'enoxaparin',
  'warfarin',
  'morphine',
  'fentanyl',
  'hydromorphone',
  'oxycodone',
  'potassium chloride',
  'digoxin',
  'chemotherapy',
  'epinephrine',
  'norepinephrine',
] as const;

export function isHighAlertMedication(medicationName: string): boolean {
  if (!medicationName) return false;
  const lower = medicationName.toLowerCase().trim();
  return HIGH_ALERT_KEYWORDS.some((kw) => lower.includes(kw));
}

export interface ClinicalPreconditionRule {
  parameterId: string;
  parameterName: string;
  unit: string;
  minAllowed?: number;
  maxAllowed?: number;
  criticalThreshold?: number;
  warningMessage: string;
}

export function getPreconditionsForMedication(
  medicationName: string
): ClinicalPreconditionRule | null {
  if (!medicationName) return null;
  const lower = medicationName.toLowerCase().trim();

  // Insulin & Oral Hypoglycemics
  if (
    lower.includes('insulin') ||
    lower.includes('glargine') ||
    lower.includes('aspart') ||
    lower.includes('lispro') ||
    lower.includes('glipizide')
  ) {
    return {
      parameterId: 'glucose',
      parameterName: 'Blood Glucose',
      unit: 'mg/dL',
      minAllowed: 70,
      criticalThreshold: 50,
      warningMessage:
        'Hypoglycemia Warning: Blood Glucose is below safe administration threshold (< 70 mg/dL).',
    };
  }

  // Digoxin / Cardiac Glycosides
  if (lower.includes('digoxin')) {
    return {
      parameterId: 'heart_rate',
      parameterName: 'Apical Heart Rate',
      unit: 'bpm',
      minAllowed: 60,
      criticalThreshold: 50,
      warningMessage:
        'Bradycardia Warning: Apical Heart Rate is < 60 bpm. Dose must be withheld per protocol.',
    };
  }

  // Antihypertensives & Beta-Blockers
  if (
    lower.includes('lisinopril') ||
    lower.includes('amlodipine') ||
    lower.includes('metoprolol') ||
    lower.includes('atenolol') ||
    lower.includes('carvedilol') ||
    lower.includes('losartan') ||
    lower.includes('furosemide') ||
    lower.includes('torsemide')
  ) {
    return {
      parameterId: 'sbp',
      parameterName: 'Systolic Blood Pressure (SBP)',
      unit: 'mmHg',
      minAllowed: 90,
      criticalThreshold: 80,
      warningMessage:
        'Hypotension Warning: SBP is < 90 mmHg. Withhold dose and alert attending physician.',
    };
  }

  return null;
}

export const WITHHOLDING_REASONS = [
  { code: 'npo_procedure', label: 'Patient NPO for Surgery or Diagnostic Procedure' },
  { code: 'patient_refused', label: 'Patient Refused Dose (Informed risk counseling documented)' },
  {
    code: 'vitals_out_of_range',
    label: 'Vital Signs Parameter Out of Safe Range (e.g. SBP < 90, HR < 60)',
  },
  { code: 'nausea_vomiting', label: 'Active Vomiting / Acute Aspiration Risk' },
  {
    code: 'suspected_adverse_reaction',
    label: 'Suspected Adverse Drug Reaction / Hypersensitivity',
  },
  { code: 'patient_sleeping', label: 'Patient Sleeping (Non-Critical Maintenance Dose)' },
  {
    code: 'medication_unavailable',
    label: 'Awaiting Central Pharmacy Compounding / Batch Delivery',
  },
  { code: 'other', label: 'Other Documented Clinical Reason' },
] as const;

export interface FiveRightsChecklist {
  rightPatient: boolean;
  rightDrug: boolean;
  rightDose: boolean;
  rightRoute: boolean;
  rightTime: boolean;
}

export function areFiveRightsSatisfied(checklist: FiveRightsChecklist): boolean {
  return (
    checklist.rightPatient &&
    checklist.rightDrug &&
    checklist.rightDose &&
    checklist.rightRoute &&
    checklist.rightTime
  );
}
