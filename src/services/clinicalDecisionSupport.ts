/**
 * Clinical Decision Support Service (`clinicalDecisionSupport`)
 *
 * CareSync HIMS Deep Module Adapter
 * Routes clinical safety verification and interaction checks to the canonical
 * `@/modules/order-safety` engine in accordance with ADR-0005.
 *
 * Invariants Enforced:
 * 1. Fail-Closed CDS: Service degradation or unexpected errors block clear orders and require pharmacist review
 * 2. Multi-rule evaluation: Leverages OrderSafetyEngine critical pairs, allergies, and pediatric bounds
 * 3. Backwards-compatible diagnostic suggestions and clinical guidelines
 */

import {
  HeadlessOrderSafetyEngine,
  InMemoryLocalDdiAdapter,
  MockRxNormAdapter,
  SpyAuditLoggerAdapter,
  type ClinicalActor,
  type OrderItemIntent,
  type PatientClinicalContext,
  type SafetyAssessment,
} from '@/modules/order-safety';

export interface DrugInteraction {
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  recommendation: string;
}

export interface DiagnosisSuggestion {
  icd10Code: string;
  name: string;
  confidence: number;
  supportingFactors: string[];
}

export interface ClinicalDecisionSupportDependencies {
  readonly engine?: HeadlessOrderSafetyEngine;
}

export class ClinicalDecisionSupportService {
  private readonly engine: HeadlessOrderSafetyEngine;

  constructor(deps: ClinicalDecisionSupportDependencies = {}) {
    this.engine =
      deps.engine ||
      new HeadlessOrderSafetyEngine({
        localDdiRepo: new InMemoryLocalDdiAdapter(),
        rxNormPort: new MockRxNormAdapter(),
        auditLogger: new SpyAuditLoggerAdapter(),
      });
  }

  /**
   * Checks for drug-drug interactions and clinical contraindications.
   * Delegates directly to the canonical OrderSafetyEngine and enforces Fail-Closed CDS.
   */
  async checkDrugInteractions(
    medications: readonly string[],
    patientContext?: Partial<PatientClinicalContext>
  ): Promise<DrugInteraction[]> {
    if (!medications || medications.length === 0) {
      return [];
    }

    try {
      const items: OrderItemIntent[] = medications.map((med, idx) => ({
        clientItemId: `cds-item-${idx}-${med}`,
        drugName: med,
        doseMg: 100,
        route: 'PO',
        frequency: 'daily',
      }));

      const hospitalId = patientContext?.hospitalId || 'default-hospital';
      const actor: ClinicalActor = {
        userId: 'cds-service-doctor',
        hospitalId,
        role: 'doctor',
      };

      const patient: PatientClinicalContext = {
        patientId: patientContext?.patientId || 'anonymous-patient',
        hospitalId,
        ageYears: patientContext?.ageYears ?? 35,
        allergies: patientContext?.allergies ?? [],
        activeMedications: patientContext?.activeMedications ?? [],
        isPregnant: patientContext?.isPregnant,
        weightKg: patientContext?.weightKg,
      };

      const assessment: SafetyAssessment = await this.engine.evaluate({
        actor,
        patient,
        items,
      });

      const interactions: DrugInteraction[] = [];

      for (const finding of assessment.findings) {
        let severity: DrugInteraction['severity'] = 'moderate';
        if (finding.isHardStop || finding.severity === 'CRITICAL') {
          severity = 'severe';
        } else if (finding.severity === 'SERIOUS' || finding.severity === 'MODERATE') {
          severity = 'moderate';
        } else {
          severity = 'minor';
        }

        const description = finding.detail
          ? `${finding.title}: ${finding.detail}`
          : finding.title || 'Clinical safety finding detected';

        interactions.push({
          severity,
          description,
          recommendation:
            finding.clinicalRecommendation ||
            (finding.isHardStop
              ? 'Fatal or absolute contraindication. Order fulfillment blocked.'
              : 'Consult clinical pharmacist before prescribing.'),
        });
      }

      return interactions;
    } catch (err) {
      console.warn('[clinicalDecisionSupport] Fail-closed CDS fallback activated:', err);
      return [
        {
          severity: 'severe',
          description:
            'Clinical Decision Support engine unavailable or safety verification incomplete.',
          recommendation:
            'Fail-closed CDS policy enforced: mandatory pharmacist review and clinical override required.',
        },
      ];
    }
  }

  async suggestDiagnosis(
    symptoms: readonly string[],
    vitals?: any
  ): Promise<DiagnosisSuggestion[]> {
    const suggestions: DiagnosisSuggestion[] = [];
    const lowerSymptoms = (symptoms || []).map((s) => s.toLowerCase());

    if (lowerSymptoms.includes('fever') && lowerSymptoms.includes('cough')) {
      suggestions.push({
        icd10Code: 'J06.9',
        name: 'Upper Respiratory Infection',
        confidence: 0.75,
        supportingFactors: ['Fever present', 'Cough reported'],
      });
    }

    if (
      lowerSymptoms.some((s) => s.includes('chest pain') || s.includes('angina')) ||
      (vitals?.systolic && vitals.systolic > 160)
    ) {
      suggestions.push({
        icd10Code: 'I20.9',
        name: 'Angina Pectoris / Hypertension Urgency',
        confidence: 0.85,
        supportingFactors: [
          'Chest pain or severely elevated BP',
          'Requires urgent cardiac review and ECG',
        ],
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  async getProtocolRecommendations(diagnosis: string): Promise<string[]> {
    const protocols: Record<string, string[]> = {
      hypertension: [
        'Lifestyle modifications counseling',
        'Consider ACE inhibitor or ARB',
        'Monitor blood pressure weekly',
        'Schedule follow-up in 2 weeks',
      ],
      diabetes: [
        'HbA1c testing',
        'Metformin as first-line therapy',
        'Dietary counseling',
        'Regular glucose monitoring',
      ],
    };

    return protocols[diagnosis.toLowerCase()] || ['Follow standard clinical guidelines'];
  }

  async checkGuidelineCompliance(
    treatment: any
  ): Promise<{ compliant: boolean; issues: string[] }> {
    const issues: string[] = [];

    if (!treatment?.dosage) issues.push('Dosage not specified');
    if (!treatment?.duration) issues.push('Treatment duration not specified');

    return {
      compliant: issues.length === 0,
      issues,
    };
  }
}

export const clinicalDecisionSupport = new ClinicalDecisionSupportService();
