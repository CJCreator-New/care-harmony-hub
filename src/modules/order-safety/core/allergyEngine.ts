/**
 * Clinical Allergen Taxonomy and Cross-Reactivity Engine
 * Deepened domain logic for patient drug allergy verification.
 */

import { OrderItemIntent, SafetyFinding } from '../types';

export const ALLERGEN_CLASS_MAP: Record<string, string[]> = {
  penicillin: [
    'amoxicillin',
    'ampicillin',
    'piperacillin',
    'penicillin',
    'augmentin',
    'cloxacillin',
  ],
  sulfa: ['sulfamethoxazole', 'sulfadiazine', 'bactrim', 'septra', 'sulfasalazine'],
  nsaid: [
    'ibuprofen',
    'naproxen',
    'indomethacin',
    'ketorolac',
    'meloxicam',
    'celecoxib',
    'aspirin',
    'advil',
    'motrin',
  ],
  cephalosporin: ['cephalexin', 'cefazolin', 'ceftriaxone', 'cefuroxime', 'cefepime'],
  opioid: [
    'morphine',
    'codeine',
    'oxycodone',
    'hydrocodone',
    'fentanyl',
    'tramadol',
    'hydromorphone',
  ],
  aspirin: ['aspirin', 'acetylsalicylic acid', 'bayer'],
};

/**
 * Normalizes raw patient allergy terms by stripping common non-diagnostic qualifiers
 * and standardizing abbreviations to canonical root classes.
 */
export function normalizeAllergyTerm(allergy: string): string {
  let cleaned = allergy.toLowerCase().trim();
  // Strip common qualifiers & suffixes
  cleaned = cleaned
    .replace(/\b(allergy|allergies|hypersensitivity|adverse reaction|intolerance)\b/g, '')
    .trim();

  // Standardize abbreviations and plurals
  if (cleaned === 'pcn' || cleaned === 'penicillins') return 'penicillin';
  if (cleaned === 'sulfas' || cleaned === 'sulfonamide' || cleaned === 'sulfonamides')
    return 'sulfa';
  if (cleaned === 'nsaids') return 'nsaid';
  if (cleaned === 'cephalosporins') return 'cephalosporin';
  if (cleaned === 'opioids' || cleaned === 'opiates') return 'opioid';
  if (cleaned === 'aspirin') return 'aspirin';

  return cleaned;
}

/**
 * Evaluates a list of order items against patient documented allergies.
 */
export function evaluateAllergyConflicts(
  items: readonly OrderItemIntent[],
  patientAllergies: readonly string[] = []
): readonly SafetyFinding[] {
  const findings: SafetyFinding[] = [];

  for (const item of items) {
    const normalizedDrug = item.drugName.toLowerCase().trim();

    for (const rawAllergy of patientAllergies) {
      const allergyTrimmed = rawAllergy.toLowerCase().trim();
      if (!allergyTrimmed) continue;

      const cleanedAllergy = normalizeAllergyTerm(rawAllergy);
      let isMatch = false;
      let matchType: 'direct' | 'class' = 'direct';

      // 1. Direct name match (e.g. allergy is "amoxicillin" and prescribed drug contains "amoxicillin")
      if (
        cleanedAllergy.length > 2 &&
        (normalizedDrug.includes(cleanedAllergy) || cleanedAllergy.includes(normalizedDrug))
      ) {
        isMatch = true;
        matchType = 'direct';
      }

      // 2. Class cross-reactivity match
      if (!isMatch) {
        const classKey = Object.keys(ALLERGEN_CLASS_MAP).find(
          (key) => key === cleanedAllergy || cleanedAllergy.includes(key)
        );

        if (classKey) {
          const contraDrugs = ALLERGEN_CLASS_MAP[classKey] || [];
          if (contraDrugs.some((d) => normalizedDrug.includes(d))) {
            isMatch = true;
            matchType = 'class';
          }
        }
      }

      if (isMatch) {
        findings.push({
          code: `ALLERGY_${item.clientItemId}_${cleanedAllergy.toUpperCase()}`,
          kind: 'ALLERGY_CROSS_REACTIVITY',
          severity: 'CRITICAL',
          isHardStop: false, // Physician can override with documented clinical justification
          requiresPhysicianOverride: true,
          clientItemId: item.clientItemId,
          drugName: item.drugName,
          interactingSubject: rawAllergy,
          title: `Allergy Conflict: ${item.drugName} vs Documented ${rawAllergy}`,
          detail:
            matchType === 'direct'
              ? `Prescribed medication "${item.drugName}" directly matches patient's documented allergy "${rawAllergy}".`
              : `Prescribed medication "${item.drugName}" cross-reacts with patient's documented ${cleanedAllergy} class allergy ("${rawAllergy}").`,
          clinicalRecommendation:
            'Select an alternative therapeutic class or document an emergency physician clinical override rationale.',
          source: 'LOCAL_FORMULARY',
        });
      }
    }
  }

  return findings;
}
