/**
 * Clinical Invariants & Physiological Safety Rules
 * Enforces physiological rules, route restrictions, and teratogenicity contraindications.
 */

import {
  AdministrationRoute,
  OrderItemIntent,
  PatientClinicalContext,
  SafetyFinding,
} from '../types';

export const ROUTE_RESTRICTIONS: Record<string, AdministrationRoute[]> = {
  insulin: ['SC', 'IV'], // Never PO for systemic
  heparin: ['IV', 'SC'], // Not IM (hematoma risk)
  potassium: ['IV (slow)', 'PO'], // Rapid IV push is fatal
  nitroglycerin: ['SL', 'PO', 'Topical'],
};

export const TERATOGENIC_DRUGS = {
  // Category X: Absolute contraindication in pregnancy
  contraindicated: [
    'isotretinoin', // Accutane
    'finasteride', // Proscar
    'misoprostol', // Cytotec
    'warfarin', // High-risk teratogen in 1st/3rd trimester
    'thalidomide', // Phocomelia
    'methotrexate',
    'leflunomide',
    'statin', // Atorvastatin, Simvastatin
  ],
  // Category D / C: Major fetal risks requiring override
  cautious: [
    'lisinopril',
    'losartan',
    'valproate',
    'fluconazole',
    'nsaid', // Oligohydramnios / premature ductus arteriosus closure in 3rd trimester
  ],
};

export function evaluateClinicalInvariants(
  items: readonly OrderItemIntent[],
  patient: PatientClinicalContext
): readonly SafetyFinding[] {
  const findings: SafetyFinding[] = [];

  // 1. Biological Invariant: Gender vs Pregnancy
  if (patient.isPregnant && (patient.gender === 'M' || patient.gender === 'male')) {
    findings.push({
      code: 'CLINICAL_INVARIANT_MALE_PREGNANCY',
      kind: 'CLINICAL_INVARIANT_VIOLATION',
      severity: 'CRITICAL',
      isHardStop: true, // Cannot proceed with physiologically impossible data
      requiresPhysicianOverride: true,
      drugName: 'System Diagnostic',
      title: 'Physiological Invariant Violation: Pregnancy Flag on Male Patient',
      detail:
        'Patient record has isPregnant: true but biological gender is Male. Medical record reconciliation required.',
      clinicalRecommendation:
        'Correct patient gender or clear pregnancy status before issuing orders.',
      source: 'PHYSIOLOGICAL_RULES',
    });
  }

  for (const item of items) {
    const drugLower = item.drugName.toLowerCase().trim();

    // 2. Pregnancy Contraindications
    if (patient.isPregnant) {
      const isCategoryX = TERATOGENIC_DRUGS.contraindicated.some((d) => drugLower.includes(d));
      if (isCategoryX) {
        findings.push({
          code: `PREGNANCY_CONTRAINDICATION_X_${item.clientItemId}`,
          kind: 'PREGNANCY_CONTRAINDICATION',
          severity: 'CRITICAL',
          isHardStop: true, // FDA Category X teratogens are absolute hard stops in pregnancy
          requiresPhysicianOverride: true,
          clientItemId: item.clientItemId,
          drugName: item.drugName,
          title: `Category X Teratogen Contraindicated in Pregnancy: ${item.drugName}`,
          detail: `${item.drugName} is proven teratogenic (FDA Category X) causing severe fetal anomalies or demise. Use in pregnancy is strictly contraindicated.`,
          clinicalRecommendation:
            'Immediately cancel this order and prescribe a pregnancy-safe therapeutic alternative.',
          source: 'PHYSIOLOGICAL_RULES',
        });
      } else {
        const isCautious = TERATOGENIC_DRUGS.cautious.some((d) => drugLower.includes(d));
        if (isCautious) {
          findings.push({
            code: `PREGNANCY_CAUTION_${item.clientItemId}`,
            kind: 'PREGNANCY_CONTRAINDICATION',
            severity: 'SERIOUS',
            isHardStop: false,
            requiresPhysicianOverride: true,
            clientItemId: item.clientItemId,
            drugName: item.drugName,
            title: `Pregnancy Warning (Category D/Late Risk): ${item.drugName}`,
            detail: `${item.drugName} carries documented fetal toxicity risk. Requires maternal-fetal risk-benefit evaluation.`,
            clinicalRecommendation:
              'Document physician clinical justification detailing why benefit outweighs fetal risk.',
            source: 'PHYSIOLOGICAL_RULES',
          });
        }
      }
    }

    // 3. Breastfeeding Flags
    if (patient.isBreastfeeding) {
      if (drugLower.match(/warfarin|statin|isotretinoin|methotrexate|lithium/)) {
        findings.push({
          code: `BREASTFEEDING_HAZARD_${item.clientItemId}`,
          kind: 'PREGNANCY_CONTRAINDICATION',
          severity: 'SERIOUS',
          isHardStop: false,
          requiresPhysicianOverride: true,
          clientItemId: item.clientItemId,
          drugName: item.drugName,
          title: `Lactation Safety Warning: ${item.drugName}`,
          detail: `${item.drugName} is excreted into human breastmilk and carries significant infant toxicity risks.`,
          clinicalRecommendation:
            'Consider alternative therapy or instruct patient on express-and-discard protocol.',
          source: 'PHYSIOLOGICAL_RULES',
        });
      }
    }

    // 4. Drug-Route Compatibility
    const matchedRouteDrug = Object.keys(ROUTE_RESTRICTIONS).find((d) => drugLower.includes(d));
    if (matchedRouteDrug) {
      const allowedRoutes = ROUTE_RESTRICTIONS[matchedRouteDrug];
      if (!allowedRoutes.includes(item.route)) {
        const isPotassiumIVPush = matchedRouteDrug === 'potassium' && item.route === 'IV';
        findings.push({
          code: `ROUTE_INCOMPATIBLE_${item.clientItemId}`,
          kind: 'ROUTE_INCOMPATIBILITY',
          severity: isPotassiumIVPush ? 'CRITICAL' : 'SERIOUS',
          isHardStop: isPotassiumIVPush, // Rapid IV potassium push is lethal -> HARD STOP
          requiresPhysicianOverride: true,
          clientItemId: item.clientItemId,
          drugName: item.drugName,
          title: `Incompatible Route of Administration: ${item.drugName} via ${item.route}`,
          detail: `${item.drugName} administered via ${item.route} is not permitted. Allowed routes: ${allowedRoutes.join(', ')}.`,
          clinicalRecommendation: isPotassiumIVPush
            ? 'Potassium IV push is fatal and strictly prohibited. Must be administered via IV piggyback infusion or oral route.'
            : `Select one of the permitted routes: ${allowedRoutes.join(', ')}.`,
          source: 'PHYSIOLOGICAL_RULES',
        });
      }
    }
  }

  return findings;
}
