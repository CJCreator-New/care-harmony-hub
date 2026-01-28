import { useCallback, useMemo } from 'react';
import { useICD10Service, ICD10Suggestion } from './ICD10Service';
import { cptService, CPTSuggestion } from './CPTService';

export interface ClinicalCodeMapping {
  primaryCode: ICD10Suggestion | null;
  secondaryCodes: ICD10Suggestion[];
  cptCodes: CPTSuggestion[];
  confidence: number;
  reasoning: string;
  clinicalContext: {
    symptoms: string[];
    diagnoses: string[];
    procedures: string[];
    medications: string[];
  };
}

export interface ClinicalCodingService {
  analyzeClinicalText: (text: string) => Promise<ClinicalCodeMapping>;
  suggestCodesForSymptoms: (symptoms: string[]) => ICD10Suggestion[];
  suggestCodesForDiagnosis: (diagnosis: string) => ICD10Suggestion[];
  suggestCPTForProcedures: (procedures: string[]) => CPTSuggestion[];
  validateCodeCombination: (codes: string[]) => { valid: boolean; conflicts: string[] };
}

class ClinicalCodingServiceImpl implements ClinicalCodingService {
  private icd10Service = useICD10Service();

  async analyzeClinicalText(text: string): Promise<ClinicalCodeMapping> {
    const normalizedText = text.toLowerCase();

    // Extract clinical context
    const clinicalContext = this.extractClinicalContext(normalizedText);

    // Get initial suggestions from ICD-10 service
    const allSuggestions = this.icd10Service.suggestCodes(text, 50);

    // Get CPT suggestions based on procedures and clinical context
    const cptSuggestions = this.suggestCPTForProcedures(clinicalContext.procedures);

    // Apply clinical reasoning and prioritization
    const { primaryCode, secondaryCodes, confidence, reasoning } = this.applyClinicalReasoning(
      allSuggestions,
      clinicalContext,
      normalizedText
    );

    return {
      primaryCode,
      secondaryCodes,
      cptCodes: cptSuggestions,
      confidence,
      reasoning,
      clinicalContext,
    };
  }

  private extractClinicalContext(text: string): ClinicalCodeMapping['clinicalContext'] {
    const symptoms: string[] = [];
    const diagnoses: string[] = [];
    const procedures: string[] = [];
    const medications: string[] = [];

    // Symptom patterns
    const symptomPatterns = [
      /\b(pain|ache|discomfort|soreness|tenderness)\b/gi,
      /\b(fever|chills|sweating|fatigue|weakness)\b/gi,
      /\b(cough|coughing|wheezing|shortness of breath|dyspnea)\b/gi,
      /\b(nausea|vomiting|diarrhea|constipation|abdominal pain)\b/gi,
      /\b(headache|dizziness|confusion|seizure)\b/gi,
      /\b(chest pain|palpitations|edema|swelling)\b/gi,
    ];

    // Diagnosis patterns
    const diagnosisPatterns = [
      /\b(diabetes|hypertension|asthma|copd|depression|anxiety)\b/gi,
      /\b(pneumonia|bronchitis|uti|infection|sepsis)\b/gi,
      /\b(fracture|sprain|strain|dislocation)\b/gi,
      /\b(cancer|tumor|carcinoma|neoplasm)\b/gi,
      /\b(heart attack|myocardial infarction|stroke|cva)\b/gi,
    ];

    // Procedure patterns
    const procedurePatterns = [
      /\b(surgery|operation|procedure|biopsy|catheterization)\b/gi,
      /\b(appendectomy|cholecystectomy|hysterectomy)\b/gi,
      /\b(endoscopy|colonoscopy|bronchoscopy)\b/gi,
      /\b(angioplasty|bypass|stent|pacemaker)\b/gi,
    ];

    // Medication patterns
    const medicationPatterns = [
      /\b(aspirin|ibuprofen|acetaminophen|tylenol)\b/gi,
      /\b(lisinopril|metformin|atorvastatin|omeprazole)\b/gi,
      /\b(amoxicillin|azithromycin|ciprofloxacin)\b/gi,
      /\b(insul|metform|glipizide|glyburide)\b/gi,
    ];

    // Extract symptoms
    symptomPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        symptoms.push(...matches.map(m => m.toLowerCase()));
      }
    });

    // Extract diagnoses
    diagnosisPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        diagnoses.push(...matches.map(m => m.toLowerCase()));
      }
    });

    // Extract procedures
    procedurePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        procedures.push(...matches.map(m => m.toLowerCase()));
      }
    });

    // Extract medications
    medicationPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        medications.push(...matches.map(m => m.toLowerCase()));
      }
    });

    return {
      symptoms: Array.from(new Set(symptoms)),
      diagnoses: Array.from(new Set(diagnoses)),
      procedures: Array.from(new Set(procedures)),
      medications: Array.from(new Set(medications)),
    };
  }

  private applyClinicalReasoning(
    suggestions: ICD10Suggestion[],
    context: ClinicalCodeMapping['clinicalContext'],
    originalText: string
  ): {
    primaryCode: ICD10Suggestion | null;
    secondaryCodes: ICD10Suggestion[];
    confidence: number;
    reasoning: string;
  } {
    if (suggestions.length === 0) {
      return {
        primaryCode: null,
        secondaryCodes: [],
        confidence: 0,
        reasoning: 'No matching ICD-10 codes found for the provided clinical text.',
      };
    }

    // Prioritize codes based on clinical context
    const prioritizedSuggestions = suggestions.map(suggestion => {
      let adjustedConfidence = suggestion.confidence;

      // Boost confidence for codes that match clinical context
      if (context.diagnoses.length > 0) {
        // If we have explicit diagnoses, prioritize matching codes
        const diagnosisMatch = context.diagnoses.some(diagnosis =>
          suggestion.description.toLowerCase().includes(diagnosis) ||
          suggestion.matchedKeywords.some(keyword =>
            keyword.toLowerCase().includes(diagnosis)
          )
        );
        if (diagnosisMatch) {
          adjustedConfidence *= 1.3;
        }
      }

      // Boost for symptom-based matches when no clear diagnosis
      if (context.symptoms.length > 0 && context.diagnoses.length === 0) {
        const symptomMatch = context.symptoms.some(symptom =>
          suggestion.description.toLowerCase().includes(symptom) ||
          suggestion.matchedKeywords.some(keyword =>
            keyword.toLowerCase().includes(symptom)
          )
        );
        if (symptomMatch) {
          adjustedConfidence *= 1.2;
        }
      }

      // Penalize codes that are too general
      if (suggestion.code.endsWith('9') || suggestion.code.includes('9')) {
        adjustedConfidence *= 0.8;
      }

      return {
        ...suggestion,
        confidence: Math.min(adjustedConfidence, 1.0),
      };
    });

    // Sort by adjusted confidence
    prioritizedSuggestions.sort((a, b) => b.confidence - a.confidence);

    const primaryCode = prioritizedSuggestions[0];
    const secondaryCodes = prioritizedSuggestions.slice(1, 5); // Top 5 secondary codes

    // Generate reasoning
    let reasoning = `Primary code ${primaryCode.code} (${primaryCode.description}) selected based on `;

    if (primaryCode.matchedKeywords.length > 0) {
      reasoning += `keyword matches: ${primaryCode.matchedKeywords.join(', ')}. `;
    }

    if (context.diagnoses.length > 0) {
      reasoning += `Clinical context includes diagnoses: ${context.diagnoses.join(', ')}. `;
    }

    if (context.symptoms.length > 0) {
      reasoning += `Presenting symptoms: ${context.symptoms.join(', ')}. `;
    }

    if (secondaryCodes.length > 0) {
      reasoning += `Secondary codes considered: ${secondaryCodes.slice(0, 3).map(c => c.code).join(', ')}.`;
    }

    return {
      primaryCode,
      secondaryCodes,
      confidence: primaryCode.confidence,
      reasoning,
    };
  }

  suggestCodesForSymptoms(symptoms: string[]): ICD10Suggestion[] {
    const symptomText = symptoms.join(' ');
    return this.icd10Service.suggestCodes(symptomText, 10);
  }

  suggestCodesForDiagnosis(diagnosis: string): ICD10Suggestion[] {
    return this.icd10Service.suggestCodes(diagnosis, 5);
  }

  suggestCPTForProcedures(procedures: string[]): CPTSuggestion[] {
    if (procedures.length === 0) {
      return [];
    }

    const procedureText = procedures.join(' ');
    return cptService.suggestCodes(procedureText, 8);
  }

  validateCodeCombination(codes: string[]): { valid: boolean; conflicts: string[] } {
    const conflicts: string[] = [];
    const codeDetails = codes.map(code => this.icd10Service.getCodeDetails(code)).filter(Boolean);

    // Check for incompatible categories (simplified validation)
    const categories = codeDetails.map(detail => detail?.category);
    const uniqueCategories = Array.from(new Set(categories));

    // Basic validation rules
    if (categories.includes('neoplasms') && categories.includes('injury')) {
      conflicts.push('Cannot combine neoplasm and injury codes for the same condition');
    }

    if (codes.length !== uniqueCategories.length) {
      conflicts.push('Duplicate categories detected - consider if codes are appropriate');
    }

    // Check for mutually exclusive codes (simplified)
    const mutuallyExclusive = [
      ['I10', 'I11'], // Essential vs secondary hypertension
      ['E10', 'E11'], // Type 1 vs Type 2 diabetes
      ['J44', 'J45'], // COPD vs Asthma
    ];

    for (const [code1, code2] of mutuallyExclusive) {
      if (codes.includes(code1) && codes.includes(code2)) {
        conflicts.push(`Codes ${code1} and ${code2} are typically mutually exclusive`);
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
    };
  }
}

// Singleton instance
const clinicalCodingService = new ClinicalCodingServiceImpl();

export const useClinicalCodingService = (): ClinicalCodingService => {
  return useMemo(() => clinicalCodingService, []);
};