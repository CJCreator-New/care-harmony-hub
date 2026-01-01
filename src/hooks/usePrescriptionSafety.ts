import { useMemo } from 'react';

export interface AllergyAlert {
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  allergen: string;
  medication: string;
  message: string;
}

export interface DrugInteraction {
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  drug1: string;
  drug2: string;
  message: string;
}

// Common drug-allergy mappings (simplified for demo)
const ALLERGY_DRUG_MAPPINGS: Record<string, string[]> = {
  'penicillin': ['amoxicillin', 'ampicillin', 'penicillin', 'augmentin', 'piperacillin'],
  'sulfa': ['sulfamethoxazole', 'bactrim', 'septra', 'sulfasalazine'],
  'aspirin': ['aspirin', 'acetylsalicylic acid'],
  'nsaids': ['ibuprofen', 'naproxen', 'advil', 'motrin', 'aleve', 'diclofenac', 'celecoxib'],
  'codeine': ['codeine', 'morphine', 'oxycodone', 'hydrocodone', 'fentanyl'],
  'latex': [], // Environmental, but may affect certain medical products
  'eggs': [], // May affect some vaccines
  'shellfish': [], // May affect iodine-based contrast
  'iodine': ['iodine', 'betadine', 'contrast dye'],
  'cephalosporins': ['cephalexin', 'ceftriaxone', 'cefuroxime', 'cefdinir'],
  'fluoroquinolones': ['ciprofloxacin', 'levofloxacin', 'moxifloxacin'],
  'macrolides': ['azithromycin', 'erythromycin', 'clarithromycin'],
  'tetracyclines': ['tetracycline', 'doxycycline', 'minocycline'],
  'statins': ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin'],
  'ace inhibitors': ['lisinopril', 'enalapril', 'ramipril', 'captopril'],
  'beta blockers': ['metoprolol', 'atenolol', 'propranolol', 'carvedilol'],
};

// Cross-reactivity mappings
const CROSS_REACTIVITY: Record<string, string[]> = {
  'penicillin': ['cephalosporins'], // ~10% cross-reactivity
  'sulfa': ['thiazides'], // Potential cross-reactivity
};

// Common drug-drug interaction pairs (simplified)
const DRUG_INTERACTIONS: Array<{
  drugs: [string, string];
  severity: DrugInteraction['severity'];
  message: string;
}> = [
  {
    drugs: ['warfarin', 'aspirin'],
    severity: 'major',
    message: 'Increased bleeding risk when combined',
  },
  {
    drugs: ['metformin', 'contrast dye'],
    severity: 'major',
    message: 'Risk of lactic acidosis. Hold metformin before and after contrast procedures',
  },
  {
    drugs: ['ssri', 'maoi'],
    severity: 'contraindicated',
    message: 'Risk of serotonin syndrome. Do not use together',
  },
  {
    drugs: ['simvastatin', 'amiodarone'],
    severity: 'major',
    message: 'Increased risk of myopathy. Limit simvastatin dose',
  },
  {
    drugs: ['lisinopril', 'potassium'],
    severity: 'moderate',
    message: 'Risk of hyperkalemia. Monitor potassium levels',
  },
  {
    drugs: ['warfarin', 'nsaids'],
    severity: 'major',
    message: 'Increased bleeding risk. Avoid combination if possible',
  },
  {
    drugs: ['methotrexate', 'nsaids'],
    severity: 'major',
    message: 'Increased methotrexate toxicity. Monitor closely',
  },
  {
    drugs: ['digoxin', 'amiodarone'],
    severity: 'major',
    message: 'Increased digoxin levels. Reduce digoxin dose by 50%',
  },
  {
    drugs: ['theophylline', 'ciprofloxacin'],
    severity: 'major',
    message: 'Increased theophylline levels. Monitor and reduce dose',
  },
  {
    drugs: ['clopidogrel', 'omeprazole'],
    severity: 'moderate',
    message: 'Reduced antiplatelet effect. Consider alternative PPI',
  },
];

// SSRI medications list
const SSRI_DRUGS = ['fluoxetine', 'sertraline', 'paroxetine', 'citalopram', 'escitalopram', 'fluvoxamine'];
const MAOI_DRUGS = ['phenelzine', 'tranylcypromine', 'isocarboxazid', 'selegiline'];

function normalizeString(str: string): string {
  return str.toLowerCase().trim();
}

function checkAllergyMatch(allergy: string, medication: string): boolean {
  const normalizedAllergy = normalizeString(allergy);
  const normalizedMedication = normalizeString(medication);

  // Direct match
  if (normalizedMedication.includes(normalizedAllergy) || normalizedAllergy.includes(normalizedMedication)) {
    return true;
  }

  // Check mapped drugs
  const mappedDrugs = ALLERGY_DRUG_MAPPINGS[normalizedAllergy] || [];
  for (const drug of mappedDrugs) {
    if (normalizedMedication.includes(drug)) {
      return true;
    }
  }

  // Check cross-reactivity
  const crossReactive = CROSS_REACTIVITY[normalizedAllergy] || [];
  for (const allergyClass of crossReactive) {
    const relatedDrugs = ALLERGY_DRUG_MAPPINGS[allergyClass] || [];
    for (const drug of relatedDrugs) {
      if (normalizedMedication.includes(drug)) {
        return true;
      }
    }
  }

  return false;
}

export function checkPrescriptionSafety(
  medicationName: string,
  patientAllergies: string[],
  currentMedications: string[]
): {
  allergyAlerts: AllergyAlert[];
  drugInteractions: DrugInteraction[];
  isSafe: boolean;
  requiresVerification: boolean;
} {
  const allergyAlerts: AllergyAlert[] = [];
  const drugInteractions: DrugInteraction[] = [];
  const normalizedMedication = normalizeString(medicationName);

  // Check allergies
  for (const allergy of patientAllergies) {
    if (checkAllergyMatch(allergy, medicationName)) {
      const normalizedAllergy = normalizeString(allergy);
      const mappedDrugs = ALLERGY_DRUG_MAPPINGS[normalizedAllergy] || [];
      const isCrossReactive = !mappedDrugs.some(d => normalizedMedication.includes(d)) 
        && !normalizedMedication.includes(normalizedAllergy);

      allergyAlerts.push({
        severity: isCrossReactive ? 'moderate' : 'severe',
        allergen: allergy,
        medication: medicationName,
        message: isCrossReactive
          ? `Potential cross-reactivity: Patient is allergic to ${allergy}, which may cross-react with ${medicationName}`
          : `ALLERGY ALERT: Patient has documented allergy to ${allergy}. ${medicationName} may cause allergic reaction.`,
      });
    }
  }

  // Check drug interactions
  for (const currentMed of currentMedications) {
    const normalizedCurrentMed = normalizeString(currentMed);

    // Check direct interactions
    for (const interaction of DRUG_INTERACTIONS) {
      const [drug1, drug2] = interaction.drugs.map(d => normalizeString(d));
      
      const matchesDrug1 = normalizedMedication.includes(drug1) || normalizedCurrentMed.includes(drug1);
      const matchesDrug2 = normalizedMedication.includes(drug2) || normalizedCurrentMed.includes(drug2);

      if (matchesDrug1 && matchesDrug2 && normalizedMedication !== normalizedCurrentMed) {
        drugInteractions.push({
          severity: interaction.severity,
          drug1: medicationName,
          drug2: currentMed,
          message: interaction.message,
        });
      }
    }

    // Special check for SSRI/MAOI interaction
    const isNewSSRI = SSRI_DRUGS.some(s => normalizedMedication.includes(s));
    const isCurrentMAOI = MAOI_DRUGS.some(m => normalizedCurrentMed.includes(m));
    const isNewMAOI = MAOI_DRUGS.some(m => normalizedMedication.includes(m));
    const isCurrentSSRI = SSRI_DRUGS.some(s => normalizedCurrentMed.includes(s));

    if ((isNewSSRI && isCurrentMAOI) || (isNewMAOI && isCurrentSSRI)) {
      drugInteractions.push({
        severity: 'contraindicated',
        drug1: medicationName,
        drug2: currentMed,
        message: 'CONTRAINDICATED: SSRI and MAOI combination can cause serotonin syndrome, which can be fatal.',
      });
    }

    // Check NSAID interactions
    const nsaidDrugs = ALLERGY_DRUG_MAPPINGS['nsaids'] || [];
    const isNewNSAID = nsaidDrugs.some(n => normalizedMedication.includes(n));
    const isCurrentAnticoagulant = ['warfarin', 'heparin', 'rivaroxaban', 'apixaban', 'dabigatran']
      .some(a => normalizedCurrentMed.includes(a));

    if (isNewNSAID && isCurrentAnticoagulant) {
      if (!drugInteractions.some(d => d.drug1 === medicationName && d.drug2 === currentMed)) {
        drugInteractions.push({
          severity: 'major',
          drug1: medicationName,
          drug2: currentMed,
          message: 'Increased bleeding risk when NSAIDs are used with anticoagulants.',
        });
      }
    }
  }

  // Determine safety status
  const hasSevereAllergy = allergyAlerts.some(a => a.severity === 'severe' || a.severity === 'critical');
  const hasContraindication = drugInteractions.some(d => d.severity === 'contraindicated');
  const hasMajorInteraction = drugInteractions.some(d => d.severity === 'major');

  return {
    allergyAlerts,
    drugInteractions,
    isSafe: allergyAlerts.length === 0 && drugInteractions.length === 0,
    requiresVerification: hasSevereAllergy || hasContraindication || hasMajorInteraction,
  };
}

// Hook for prescription safety checking
export function usePrescriptionSafety(
  medications: string[],
  patientAllergies: string[],
  currentMedications: string[]
) {
  return useMemo(() => {
    const results = medications.map(med => ({
      medication: med,
      ...checkPrescriptionSafety(med, patientAllergies, currentMedications),
    }));

    const allAllergyAlerts = results.flatMap(r => r.allergyAlerts);
    const allDrugInteractions = results.flatMap(r => r.drugInteractions);

    return {
      results,
      allAllergyAlerts,
      allDrugInteractions,
      hasWarnings: allAllergyAlerts.length > 0 || allDrugInteractions.length > 0,
      requiresVerification: results.some(r => r.requiresVerification),
    };
  }, [medications, patientAllergies, currentMedications]);
}
