/**
 * Drug-Drug Interaction (DDI) & Contraindication Engine
 * Evaluates dangerous medication combinations using local rules,
 * local tenant database, and external RxNorm terminology.
 *
 * Invariants Enforced:
 * 1. Hard-Stop Contraindications (e.g., Sildenafil + Nitrates, SSRI + MAOI) cannot be overridden
 * 2. Serious Interactions require Physician Override
 * 3. Fail-Closed CDS: External API degradation triggers INCOMPLETE_CDS
 */

import { OrderItemIntent, PatientClinicalContext, SafetyFinding } from '../types';
import { LocalDdiRepositoryPort, RxNormTerminologyPort } from '../ports';

export interface CriticalPairDefinition {
  readonly pattern1: RegExp;
  readonly pattern2: RegExp;
  readonly severity: 'contraindicated' | 'serious';
  readonly isHardStop: boolean;
  readonly title: string;
  readonly recommendation: string;
}

export const CRITICAL_PAIRS: readonly CriticalPairDefinition[] = [
  {
    pattern1: /sildenafil|tadalafil|vardenafil/i,
    pattern2: /nitroglycerin|isosorbide|nitrate/i,
    severity: 'contraindicated',
    isHardStop: true, // Fatal refractory hypotension
    title: 'Lethal Hypotension: PDE-5 Inhibitor + Nitrate',
    recommendation:
      'Severe refractory hypotension and cardiovascular collapse risk. Absolute contraindication.',
  },
  {
    pattern1: /fluoxetine|sertraline|paroxetine|citalopram|escitalopram|venlafaxine|ssri|snri/i,
    pattern2: /phenelzine|tranylcypromine|selegiline|linezolid|isocarboxazid|maoi/i,
    severity: 'contraindicated',
    isHardStop: true, // Fatal serotonin syndrome
    title: 'Fatal Serotonin Syndrome: Serotonergic Agent + MAOI',
    recommendation:
      'High risk of hyperthermia, seizures, and fatal serotonin toxicity. Absolute contraindication.',
  },
  {
    pattern1: /warfarin/i,
    pattern2: /ibuprofen|aspirin|ketorolac|naproxen|nsaid|meloxicam|indomethacin/i,
    severity: 'serious',
    isHardStop: false,
    title: 'Major Bleeding Hazard: Warfarin + NSAID',
    recommendation:
      'Marked increase in anticoagulant effect and catastrophic GI hemorrhage risk. Requires clinical override.',
  },
  {
    pattern1: /metformin/i,
    pattern2: /contrast|iodinated/i,
    severity: 'serious',
    isHardStop: false,
    title: 'Lactic Acidosis Risk: Metformin + Contrast Media',
    recommendation:
      'Risk of contrast-induced acute kidney injury and fatal lactic acidosis. Withhold metformin 48h prior.',
  },
  {
    pattern1: /methotrexate/i,
    pattern2: /ibuprofen|aspirin|naproxen|nsaid|ketorolac/i,
    severity: 'serious',
    isHardStop: false,
    title: 'Severe Bone Marrow Suppression: Methotrexate + NSAID',
    recommendation:
      'NSAIDs significantly decrease renal clearance of methotrexate, causing life-threatening myelosuppression.',
  },
  {
    pattern1: /digoxin/i,
    pattern2: /amiodarone|clarithromycin|verapamil/i,
    severity: 'serious',
    isHardStop: false,
    title: 'Fatal Digoxin Toxicity: Digoxin + P-gp/CYP3A4 Inhibitor',
    recommendation:
      'Marked elevation in digoxin serum concentration resulting in lethal cardiac arrhythmias.',
  },
  {
    pattern1: /spironolactone|eplerenone|triamterene/i,
    pattern2: /potassium|kcl|potassium chloride/i,
    severity: 'serious',
    isHardStop: false,
    title: 'Severe Hyperkalemia: Potassium-Sparing Diuretic + Potassium Supplement',
    recommendation:
      'Dangerous elevation in serum potassium resulting in cardiac conduction abnormalities or cardiac arrest.',
  },
];

export async function evaluateDrugInteractions(
  items: readonly OrderItemIntent[],
  patient: PatientClinicalContext,
  localDdiRepo?: LocalDdiRepositoryPort,
  rxNormPort?: RxNormTerminologyPort,
  signal?: AbortSignal
): Promise<readonly SafetyFinding[]> {
  const findings: SafetyFinding[] = [];

  // Pool of all active medications: existing active prescriptions + items being ordered
  const existingMeds = patient.activeMedications || [];
  const allMedNames = [...existingMeds.map((m) => m.drugName), ...items.map((i) => i.drugName)];

  // 1. In-Process Critical Pairs Check (Static Rules)
  // Check newly ordered items against existing meds AND against other items in the same draft order
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const name1 = item.drugName;

    // Check against existing patient meds
    for (const existing of existingMeds) {
      const name2 = existing.drugName;
      if (name1.toLowerCase() === name2.toLowerCase()) continue;

      for (const rule of CRITICAL_PAIRS) {
        const match =
          (rule.pattern1.test(name1) && rule.pattern2.test(name2)) ||
          (rule.pattern1.test(name2) && rule.pattern2.test(name1));

        if (match) {
          findings.push({
            code: `DDI_CRITICAL_${item.clientItemId}_${rule.severity.toUpperCase()}`,
            kind: 'DRUG_DRUG_INTERACTION',
            severity: rule.severity === 'contraindicated' ? 'CRITICAL' : 'SERIOUS',
            isHardStop: rule.isHardStop,
            requiresPhysicianOverride: true,
            clientItemId: item.clientItemId,
            drugName: item.drugName,
            interactingSubject: name2,
            title: rule.title,
            detail: `Combination of "${name1}" and active medication "${name2}" violates safety protocol.`,
            clinicalRecommendation: rule.recommendation,
            source: 'PHYSIOLOGICAL_RULES',
          });
        }
      }
    }

    // Check against other items in the same order
    for (let j = i + 1; j < items.length; j++) {
      const otherItem = items[j];
      const name2 = otherItem.drugName;

      for (const rule of CRITICAL_PAIRS) {
        const match =
          (rule.pattern1.test(name1) && rule.pattern2.test(name2)) ||
          (rule.pattern1.test(name2) && rule.pattern2.test(name1));

        if (match) {
          findings.push({
            code: `DDI_CO_ORDER_${item.clientItemId}_${otherItem.clientItemId}`,
            kind: 'DRUG_DRUG_INTERACTION',
            severity: rule.severity === 'contraindicated' ? 'CRITICAL' : 'SERIOUS',
            isHardStop: rule.isHardStop,
            requiresPhysicianOverride: true,
            clientItemId: item.clientItemId,
            drugName: item.drugName,
            interactingSubject: name2,
            title: rule.title,
            detail: `Simultaneously ordering "${name1}" and "${name2}" is clinically dangerous.`,
            clinicalRecommendation: rule.recommendation,
            source: 'PHYSIOLOGICAL_RULES',
          });
        }
      }
    }
  }

  // 2. Duplicate Therapy Check (e.g. multiple NSAIDs)
  const nsaidRegex = /ibuprofen|naproxen|ketorolac|meloxicam|indomethacin|celecoxib|advil|motrin/i;
  const prescribedNsaids = items.filter((i) => nsaidRegex.test(i.drugName));
  const existingNsaids = existingMeds.filter((m) => nsaidRegex.test(m.drugName));

  if (prescribedNsaids.length > 1 || (prescribedNsaids.length > 0 && existingNsaids.length > 0)) {
    const primary = prescribedNsaids[0];
    const duplicate = prescribedNsaids[1]?.drugName || existingNsaids[0]?.drugName;
    findings.push({
      code: `DUPLICATE_THERAPY_NSAID_${primary.clientItemId}`,
      kind: 'DRUG_DRUG_INTERACTION',
      severity: 'SERIOUS',
      isHardStop: false,
      requiresPhysicianOverride: true,
      clientItemId: primary.clientItemId,
      drugName: primary.drugName,
      interactingSubject: duplicate,
      title: `Duplicate Therapy Detected: Concurrent NSAIDs`,
      detail: `Prescribing multiple concurrent NSAIDs ("${primary.drugName}" and "${duplicate}") provides no added efficacy but exponentially increases gastrointestinal bleeding and acute renal failure risk.`,
      clinicalRecommendation:
        'Select a single NSAID agent at an optimal therapeutic dose or document justification.',
      source: 'LOCAL_FORMULARY',
    });
  }

  // 3. Local Tenant Database Contraindication Checks (if repo provided)
  if (localDdiRepo) {
    for (const item of items) {
      try {
        const localRules = await localDdiRepo.findLocalContraindications(
          item.drugRxcui || item.drugName,
          patient.hospitalId
        );

        for (const rule of localRules) {
          const hasConflict = allMedNames.some((m) =>
            m.toLowerCase().includes(rule.interactingDrug.toLowerCase())
          );

          if (hasConflict) {
            findings.push({
              code: `LOCAL_DDI_${item.clientItemId}_${rule.severity.toUpperCase()}`,
              kind: 'DRUG_DRUG_INTERACTION',
              severity: rule.severity === 'contraindicated' ? 'CRITICAL' : 'SERIOUS',
              isHardStop: rule.severity === 'contraindicated',
              requiresPhysicianOverride: true,
              clientItemId: item.clientItemId,
              drugName: item.drugName,
              interactingSubject: rule.interactingDrug,
              title: `Institutional Contraindication: ${item.drugName} + ${rule.interactingDrug}`,
              detail: `Hospital clinical policy restricts concurrent administration of ${item.drugName} and ${rule.interactingDrug}.`,
              clinicalRecommendation: rule.clinicalRecommendation,
              source: 'LOCAL_FORMULARY',
            });
          }
        }
      } catch (err) {
        console.warn('Local DDI repository lookup error (non-fatal, continuing):', err);
      }
    }
  }

  // 4. RxNorm External Terminology Query with Fail-Closed CDS Invariant
  if (rxNormPort) {
    const rxcuis = [
      ...items.map((i) => i.drugRxcui).filter((c): c is string => Boolean(c)),
      ...existingMeds.map((m) => m.drugRxcui).filter((c): c is string => Boolean(c)),
    ];

    if (rxcuis.length >= 2) {
      try {
        const result = await rxNormPort.checkInteractions(rxcuis, signal);

        if (result.isDegraded) {
          // Fail-Closed CDS invariant: service degradation triggers manual verification required
          findings.push({
            code: 'CDS_UPSTREAM_TIMEOUT_OR_UNAVAILABLE',
            kind: 'UPSTREAM_CDS_DEGRADATION',
            severity: 'SERIOUS',
            isHardStop: false,
            requiresPhysicianOverride: true,
            drugName: 'RxNorm Decision Support Service',
            title: 'Fail-Closed CDS: External Interaction Service Degraded',
            detail:
              result.error ||
              'RxNorm terminology service timed out or was unreachable. Verification incomplete.',
            clinicalRecommendation:
              'Automated clearance blocked per Fail-Closed CDS. Document manual clinical review to proceed.',
            source: 'ENGINE',
          });
        } else {
          for (const inter of result.interactions) {
            findings.push({
              code: `RXNORM_INTERACTION_${inter.drug1}_${inter.drug2}`,
              kind: 'DRUG_DRUG_INTERACTION',
              severity: inter.severity === 'high' ? 'CRITICAL' : 'SERIOUS',
              isHardStop: inter.severity === 'high',
              requiresPhysicianOverride: true,
              drugName: inter.drug1,
              interactingSubject: inter.drug2,
              title: `RxNorm Verified Interaction: ${inter.drug1} + ${inter.drug2}`,
              detail: inter.description,
              clinicalRecommendation:
                'Evaluate alternative therapeutic agents or document explicit clinical override.',
              source: 'RXNORM',
            });
          }
        }
      } catch (err: any) {
        // Fail-Closed CDS: If unexpected error throws during RxNorm call, synthesize degradation finding
        findings.push({
          code: 'CDS_UPSTREAM_NETWORK_ERROR',
          kind: 'UPSTREAM_CDS_DEGRADATION',
          severity: 'SERIOUS',
          isHardStop: false,
          requiresPhysicianOverride: true,
          drugName: 'RxNorm API',
          title: 'Fail-Closed CDS: Clinical Decision Support Network Error',
          detail: `Upstream error: ${err?.message || 'Network failure'}. Safe verification could not be completed.`,
          clinicalRecommendation:
            'Manual clinical pharmacist review required before dispensing or signing.',
          source: 'ENGINE',
        });
      }
    }
  }

  return findings;
}
