import { useCallback, useMemo } from 'react';

// Medical terminology dictionary with common medical terms, abbreviations, and corrections
const MEDICAL_TERMS = {
  // Common medical abbreviations
  'bp': 'blood pressure',
  'hr': 'heart rate',
  'rr': 'respiratory rate',
  'temp': 'temperature',
  'wbc': 'white blood cell',
  'rbc': 'red blood cell',
  'hgb': 'hemoglobin',
  'hct': 'hematocrit',
  'plt': 'platelet',
  'bun': 'blood urea nitrogen',
  'cre': 'creatinine',
  'na': 'sodium',
  'k': 'potassium',
  'cl': 'chloride',
  'co2': 'carbon dioxide',
  'glu': 'glucose',
  'ca': 'calcium',
  'mg': 'magnesium',
  'phos': 'phosphate',
  'alb': 'albumin',
  'tp': 'total protein',
  'alt': 'alanine aminotransferase',
  'ast': 'aspartate aminotransferase',
  'tbili': 'total bilirubin',
  'dbili': 'direct bilirubin',
  'alk': 'alkaline phosphatase',
  'ck': 'creatine kinase',
  'troponin': 'troponin',
  'd dimer': 'd-dimer',
  'pt': 'prothrombin time',
  'ptt': 'partial thromboplastin time',
  'inr': 'international normalized ratio',
  'cbc': 'complete blood count',
  'cmp': 'comprehensive metabolic panel',
  'lft': 'liver function test',
  'ua': 'urinalysis',
  'ekg': 'electrocardiogram',
  'ecg': 'electrocardiogram',
  'echo': 'echocardiogram',
  'ct': 'computed tomography',
  'mri': 'magnetic resonance imaging',
  'x ray': 'x-ray',
  'xr': 'x-ray',
  'us': 'ultrasound',
  'iv': 'intravenous',
  'po': 'by mouth',
  'pr': 'per rectum',
  'im': 'intramuscular',
  'sc': 'subcutaneous',
  'bid': 'twice daily',
  'tid': 'three times daily',
  'qid': 'four times daily',
  'qd': 'once daily',
  'qod': 'every other day',
  'prn': 'as needed',
  'ac': 'before meals',
  'pc': 'after meals',
  'hs': 'at bedtime',

  // Common medical conditions and symptoms
  'mi': 'myocardial infarction',
  'chf': 'congestive heart failure',
  'copd': 'chronic obstructive pulmonary disease',
  'dm': 'diabetes mellitus',
  'htn': 'hypertension',
  'cad': 'coronary artery disease',
  'cva': 'cerebrovascular accident',
  'tia': 'transient ischemic attack',
  'pe': 'pulmonary embolism',
  'dvt': 'deep vein thrombosis',
  'uti': 'urinary tract infection',
  'pna': 'pneumonia',
  'sob': 'shortness of breath',
  'cp': 'chest pain',
  'n/v': 'nausea and vomiting',
  'abd': 'abdominal',
  'c/o': 'complains of',
  'w/': 'with',
  'w/o': 'without',
  's/p': 'status post',
  'r/o': 'rule out',

  // Anatomical terms
  'ant': 'anterior',
  'post': 'posterior',
  'lat': 'lateral',
  'med': 'medial',
  'sup': 'superior',
  'inf': 'inferior',
  'prox': 'proximal',
  'dist': 'distal',
  'bilat': 'bilateral',
  'unilat': 'unilateral',

  // Common medications (abbreviated)
  'asa': 'aspirin',
  'ntg': 'nitroglycerin',
  'lasix': 'furosemide',
  'lisinopril': 'lisinopril',
  'metoprolol': 'metoprolol',
  'atorvastatin': 'atorvastatin',
  'omeprazole': 'omeprazole',
  'albuterol': 'albuterol',
  'prednisone': 'prednisone',
  'amoxicillin': 'amoxicillin',
  'azithromycin': 'azithromycin',
  'levaquin': 'levofloxacin',
  'vancomycin': 'vancomycin',
  'heparin': 'heparin',
  'warfarin': 'warfarin',
  'insulin': 'insulin',
  'metformin': 'metformin',
  'glyburide': 'glyburide',
  'lantus': 'insulin glargine',
  'humalog': 'insulin lispro',
  'novolog': 'insulin aspart',
};

export interface MedicalTermCorrection {
  original: string;
  corrected: string;
  confidence: number;
  alternatives?: string[];
}

export interface MedicalTerminologyService {
  correctTerm: (term: string) => MedicalTermCorrection | null;
  correctText: (text: string) => { corrected: string; corrections: MedicalTermCorrection[] };
  getSuggestions: (partial: string) => string[];
  isMedicalTerm: (term: string) => boolean;
}

export class MedicalTerminologyServiceImpl implements MedicalTerminologyService {
  private terms: Map<string, string>;
  private reverseMap: Map<string, string>;

  constructor() {
    this.terms = new Map(Object.entries(MEDICAL_TERMS));
    this.reverseMap = new Map();

    // Build reverse mapping for full terms to abbreviations
    for (const [abbr, full] of this.terms.entries()) {
      if (!this.reverseMap.has(full)) {
        this.reverseMap.set(full, abbr);
      }
    }
  }

  correctTerm(term: string): MedicalTermCorrection | null {
    const lowerTerm = term.toLowerCase().trim();

    // Exact match
    if (this.terms.has(lowerTerm)) {
      return {
        original: term,
        corrected: this.terms.get(lowerTerm)!,
        confidence: 1.0,
      };
    }

    // Check if it's already a full term that should be abbreviated
    if (this.reverseMap.has(lowerTerm)) {
      return {
        original: term,
        corrected: this.reverseMap.get(lowerTerm)!,
        confidence: 0.9,
        alternatives: [lowerTerm], // Keep full term as alternative
      };
    }

    // Fuzzy matching for common misspellings
    const corrections = this.findCorrections(lowerTerm);
    if (corrections.length > 0) {
      const bestMatch = corrections[0];
      return {
        original: term,
        corrected: bestMatch.term,
        confidence: bestMatch.confidence,
        alternatives: corrections.slice(1, 4).map(c => c.term),
      };
    }

    return null;
  }

  correctText(text: string): { corrected: string; corrections: MedicalTermCorrection[] } {
    const words = text.split(/\s+/);
    const corrections: MedicalTermCorrection[] = [];
    const correctedWords: string[] = [];

    for (const word of words) {
      const correction = this.correctTerm(word);
      if (correction && correction.confidence > 0.7) {
        corrections.push(correction);
        correctedWords.push(correction.corrected);
      } else {
        correctedWords.push(word);
      }
    }

    return {
      corrected: correctedWords.join(' '),
      corrections,
    };
  }

  getSuggestions(partial: string): string[] {
    const lowerPartial = partial.toLowerCase();
    const suggestions: string[] = [];

    // Find terms that start with the partial
    for (const [abbr, full] of this.terms.entries()) {
      if (abbr.startsWith(lowerPartial) || full.toLowerCase().startsWith(lowerPartial)) {
        suggestions.push(full);
        if (suggestions.length >= 5) break;
      }
    }

    return suggestions;
  }

  isMedicalTerm(term: string): boolean {
    const lowerTerm = term.toLowerCase().trim();
    return this.terms.has(lowerTerm) || this.reverseMap.has(lowerTerm);
  }

  private findCorrections(term: string): Array<{ term: string; confidence: number }> {
    const corrections: Array<{ term: string; confidence: number }> = [];

    for (const [abbr, full] of this.terms.entries()) {
      // Levenshtein distance for fuzzy matching
      const distance = this.levenshteinDistance(term, abbr);
      const maxLength = Math.max(term.length, abbr.length);
      const confidence = 1 - (distance / maxLength);

      if (confidence > 0.7) {
        corrections.push({ term: full, confidence });
      }

      // Also check full term
      const fullDistance = this.levenshteinDistance(term, full);
      const fullConfidence = 1 - (fullDistance / Math.max(term.length, full.length));

      if (fullConfidence > 0.7) {
        corrections.push({ term: abbr, confidence: fullConfidence });
      }
    }

    // Sort by confidence
    corrections.sort((a, b) => b.confidence - a.confidence);
    return corrections.slice(0, 5);
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator, // substitution
        );
      }
    }

    return matrix[b.length][a.length];
  }
}

// Singleton instance
const medicalTerminologyService = new MedicalTerminologyServiceImpl();

export const useMedicalTerminology = (): MedicalTerminologyService => {
  return medicalTerminologyService;
};

export const useMedicalTermCorrection = () => {
  const service = useMedicalTerminology();

  const correctTranscript = useCallback((transcript: string) => {
    return service.correctText(transcript);
  }, [service]);

  const getTermSuggestions = useCallback((partial: string) => {
    return service.getSuggestions(partial);
  }, [service]);

  const validateMedicalTerm = useCallback((term: string) => {
    return service.isMedicalTerm(term);
  }, [service]);

  return {
    correctTranscript,
    getTermSuggestions,
    validateMedicalTerm,
  };
};

// Export the class
export { MedicalTerminologyServiceImpl };