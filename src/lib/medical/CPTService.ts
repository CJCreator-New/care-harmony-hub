import { ClinicalCodeMapping } from './ClinicalCodingService';

export interface CPTSuggestion {
  code: string;
  description: string;
  category: string;
  confidence: number;
  keywords: string[];
  commonIndications?: string[];
  notes?: string;
}

export interface CPTCodeMapping extends ClinicalCodeMapping {
  procedureType: 'evaluation' | 'surgery' | 'radiology' | 'pathology' | 'medicine' | 'anesthesia';
  typicalDuration?: number; // in minutes
  requiresModifier?: boolean;
  bilateralCode?: string;
}

export class CPTService {
  private static instance: CPTService;
  private cptCodes: Map<string, CPTSuggestion> = new Map();

  private constructor() {
    this.initializeCPTCodes();
  }

  static getInstance(): CPTService {
    if (!CPTService.instance) {
      CPTService.instance = new CPTService();
    }
    return CPTService.instance;
  }

  private initializeCPTCodes(): void {
    // Evaluation and Management (E/M) Services
    this.addCPTCode({
      code: '99201',
      description: 'Office or other outpatient visit for the evaluation and management of a new patient',
      category: 'Evaluation and Management',
      confidence: 1.0,
      keywords: ['new patient', 'office visit', 'evaluation', 'outpatient'],
      commonIndications: ['Initial consultation', 'New patient assessment'],
      notes: 'Deleted effective 01/01/2021'
    });

    this.addCPTCode({
      code: '99202',
      description: 'Office or other outpatient visit for the evaluation and management of a new patient, 15-29 minutes',
      category: 'Evaluation and Management',
      confidence: 1.0,
      keywords: ['new patient', 'office visit', '15-29 minutes', 'straightforward'],
      commonIndications: ['New patient visit', 'Initial assessment'],
      notes: 'Straightforward medical decision making'
    });

    this.addCPTCode({
      code: '99203',
      description: 'Office or other outpatient visit for the evaluation and management of a new patient, 30-44 minutes',
      category: 'Evaluation and Management',
      confidence: 1.0,
      keywords: ['new patient', 'office visit', '30-44 minutes', 'low complexity'],
      commonIndications: ['New patient visit', 'Comprehensive assessment'],
      notes: 'Straightforward or low complexity medical decision making'
    });

    this.addCPTCode({
      code: '99211',
      description: 'Office or other outpatient visit for the evaluation and management of an established patient',
      category: 'Evaluation and Management',
      confidence: 1.0,
      keywords: ['established patient', 'office visit', 'minimal presenting problem'],
      commonIndications: ['Follow-up visit', 'Medication check'],
      notes: 'May not require physician presence'
    });

    this.addCPTCode({
      code: '99212',
      description: 'Office or other outpatient visit for the evaluation and management of an established patient, 10-19 minutes',
      category: 'Evaluation and Management',
      confidence: 1.0,
      keywords: ['established patient', 'office visit', '10-19 minutes', 'straightforward'],
      commonIndications: ['Routine follow-up', 'Minor complaint'],
      notes: 'Straightforward medical decision making'
    });

    this.addCPTCode({
      code: '99213',
      description: 'Office or other outpatient visit for the evaluation and management of an established patient, 20-29 minutes',
      category: 'Evaluation and Management',
      confidence: 1.0,
      keywords: ['established patient', 'office visit', '20-29 minutes', 'low complexity'],
      commonIndications: ['Follow-up visit', 'Chronic condition management'],
      notes: 'Straightforward or low complexity medical decision making'
    });

    // Surgery - Common Procedures
    this.addCPTCode({
      code: '10060',
      description: 'Incision and drainage of abscess (eg, carbuncle, suppurative hidradenitis, cutaneous or subcutaneous abscess, cyst, furuncle, or paronychia)',
      category: 'Surgery',
      confidence: 1.0,
      keywords: ['incision', 'drainage', 'abscess', 'carbuncle', 'furuncle', 'paronychia'],
      commonIndications: ['Skin abscess', 'Infected cyst', 'Boil drainage'],
      notes: 'Simple or single abscess'
    });

    this.addCPTCode({
      code: '10061',
      description: 'Incision and drainage of abscess (eg, carbuncle, suppurative hidradenitis, cutaneous or subcutaneous abscess, cyst, furuncle, or paronychia); complicated or multiple',
      category: 'Surgery',
      confidence: 1.0,
      keywords: ['incision', 'drainage', 'abscess', 'complicated', 'multiple', 'carbuncle'],
      commonIndications: ['Complex abscess', 'Multiple abscesses', 'Deep infection'],
      notes: 'Complicated or multiple abscesses'
    });

    this.addCPTCode({
      code: '11042',
      description: 'Debridement, subcutaneous tissue (includes epidermis and dermis, if performed); first 20 sq cm or less',
      category: 'Surgery',
      confidence: 1.0,
      keywords: ['debridement', 'subcutaneous', 'wound care', 'first 20 sq cm'],
      commonIndications: ['Wound debridement', 'Necrotic tissue removal'],
      notes: 'First 20 sq cm or less'
    });

    this.addCPTCode({
      code: '11043',
      description: 'Debridement, subcutaneous tissue (includes epidermis and dermis, if performed); each additional 20 sq cm',
      category: 'Surgery',
      confidence: 1.0,
      keywords: ['debridement', 'subcutaneous', 'additional 20 sq cm', 'wound care'],
      commonIndications: ['Extensive wound debridement', 'Large wound care'],
      notes: 'Each additional 20 sq cm'
    });

    // Radiology - Common Studies
    this.addCPTCode({
      code: '71045',
      description: 'Radiologic examination, chest; single view',
      category: 'Radiology',
      confidence: 1.0,
      keywords: ['chest x-ray', 'single view', 'radiologic examination'],
      commonIndications: ['Chest pain evaluation', 'Pneumonia screening', 'Pre-op assessment'],
      notes: 'PA or AP view only'
    });

    this.addCPTCode({
      code: '71046',
      description: 'Radiologic examination, chest; 2 views',
      category: 'Radiology',
      confidence: 1.0,
      keywords: ['chest x-ray', 'two views', 'radiologic examination'],
      commonIndications: ['Comprehensive chest evaluation', 'TB screening', 'Cardiac assessment'],
      notes: 'PA and lateral views'
    });

    this.addCPTCode({
      code: '73030',
      description: 'Radiologic examination, shoulder; complete, minimum of 2 views',
      category: 'Radiology',
      confidence: 1.0,
      keywords: ['shoulder x-ray', 'complete', 'minimum 2 views'],
      commonIndications: ['Shoulder pain', 'Trauma evaluation', 'Arthritis assessment'],
      notes: 'Minimum of 2 views'
    });

    this.addCPTCode({
      code: '73630',
      description: 'Radiologic examination, foot; complete, minimum of 3 views',
      category: 'Radiology',
      confidence: 1.0,
      keywords: ['foot x-ray', 'complete', 'minimum 3 views'],
      commonIndications: ['Foot pain', 'Fracture evaluation', 'Arthritis assessment'],
      notes: 'Minimum of 3 views'
    });

    // Laboratory/Pathology - Common Tests
    this.addCPTCode({
      code: '80053',
      description: 'Comprehensive metabolic panel',
      category: 'Pathology and Laboratory',
      confidence: 1.0,
      keywords: ['comprehensive metabolic panel', 'cmp', 'metabolic panel'],
      commonIndications: ['Routine screening', 'Diabetes monitoring', 'Liver/kidney function'],
      notes: 'Includes electrolytes, glucose, liver/renal function tests'
    });

    this.addCPTCode({
      code: '85025',
      description: 'Blood count; complete (CBC), automated (Hgb, Hct, RBC, WBC and platelet count) and automated differential WBC count',
      category: 'Pathology and Laboratory',
      confidence: 1.0,
      keywords: ['complete blood count', 'cbc', 'hemoglobin', 'hematocrit', 'white blood cell', 'platelet'],
      commonIndications: ['Anemia evaluation', 'Infection screening', 'Bleeding disorder assessment'],
      notes: 'Automated CBC with differential'
    });

    this.addCPTCode({
      code: '85610',
      description: 'Prothrombin time',
      category: 'Pathology and Laboratory',
      confidence: 1.0,
      keywords: ['prothrombin time', 'pt', 'coagulation test'],
      commonIndications: ['Warfarin monitoring', 'Coagulation disorder', 'Pre-operative assessment'],
      notes: 'PT test for coagulation monitoring'
    });

    // Medicine - Common Procedures
    this.addCPTCode({
      code: '90833',
      description: 'Psychotherapy, 30 minutes with patient',
      category: 'Medicine',
      confidence: 1.0,
      keywords: ['psychotherapy', '30 minutes', 'counseling', 'mental health'],
      commonIndications: ['Depression treatment', 'Anxiety therapy', 'Counseling session'],
      notes: '30-minute psychotherapy session'
    });

    this.addCPTCode({
      code: '90834',
      description: 'Psychotherapy, 45 minutes with patient',
      category: 'Medicine',
      confidence: 1.0,
      keywords: ['psychotherapy', '45 minutes', 'counseling', 'mental health'],
      commonIndications: ['Complex therapy', 'Crisis intervention', 'Intensive counseling'],
      notes: '45-minute psychotherapy session'
    });

    this.addCPTCode({
      code: '96372',
      description: 'Therapeutic, prophylactic, or diagnostic injection (specify substance or drug); subcutaneous or intramuscular',
      category: 'Medicine',
      confidence: 1.0,
      keywords: ['injection', 'subcutaneous', 'intramuscular', 'therapeutic', 'prophylactic'],
      commonIndications: ['Medication administration', 'Vaccine injection', 'Pain management'],
      notes: 'Subcutaneous or intramuscular injection'
    });

    this.addCPTCode({
      code: '99291',
      description: 'Critical care, evaluation and management of the critically ill or critically injured patient; first 30-74 minutes',
      category: 'Medicine',
      confidence: 1.0,
      keywords: ['critical care', 'first 30-74 minutes', 'critically ill', 'critically injured'],
      commonIndications: ['ICU care', 'Emergency stabilization', 'Critical patient management'],
      notes: 'First 30-74 minutes of critical care'
    });

    // Anesthesia - Common Codes
    this.addCPTCode({
      code: '00100',
      description: 'Anesthesia for procedures on salivary glands, including biopsy',
      category: 'Anesthesia',
      confidence: 1.0,
      keywords: ['anesthesia', 'salivary glands', 'biopsy'],
      commonIndications: ['Salivary gland surgery', 'Parotidectomy', 'Salivary gland biopsy'],
      notes: 'Base units: 3'
    });

    this.addCPTCode({
      code: '00104',
      description: 'Anesthesia for electroconvulsive therapy',
      category: 'Anesthesia',
      confidence: 1.0,
      keywords: ['anesthesia', 'electroconvulsive therapy', 'ect'],
      commonIndications: ['ECT procedure', 'Psychiatric treatment'],
      notes: 'Base units: 4'
    });

    this.addCPTCode({
      code: '00400',
      description: 'Anesthesia for procedures on the integumentary system on the extremities, anterior trunk and perineum; not otherwise specified',
      category: 'Anesthesia',
      confidence: 1.0,
      keywords: ['anesthesia', 'integumentary system', 'extremities', 'trunk', 'perineum'],
      commonIndications: ['Skin surgery', 'Wound repair', 'Biopsy procedures'],
      notes: 'Base units: 3'
    });
  }

  private addCPTCode(code: CPTSuggestion): void {
    this.cptCodes.set(code.code, code);
  }

  /**
   * Suggest CPT codes based on clinical text
   */
  suggestCodes(clinicalText: string, maxSuggestions: number = 5): CPTSuggestion[] {
    const text = clinicalText.toLowerCase();
    const suggestions: Array<CPTSuggestion & { relevanceScore: number }> = [];

    for (const [code, cptCode] of this.cptCodes) {
      let relevanceScore = 0;

      // Check keywords
      for (const keyword of cptCode.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          relevanceScore += 0.3;
        }
      }

      // Check common indications
      if (cptCode.commonIndications) {
        for (const indication of cptCode.commonIndications) {
          if (text.includes(indication.toLowerCase())) {
            relevanceScore += 0.4;
          }
        }
      }

      // Check description
      if (text.includes(cptCode.description.toLowerCase())) {
        relevanceScore += 0.5;
      }

      // Boost score for exact matches
      if (relevanceScore > 0) {
        suggestions.push({
          ...cptCode,
          relevanceScore
        });
      }
    }

    // Sort by relevance and return top suggestions
    return suggestions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxSuggestions)
      .map(({ relevanceScore, ...code }) => ({
        ...code,
        confidence: Math.min(relevanceScore, 1.0)
      }));
  }

  /**
   * Search CPT codes by query
   */
  searchCodes(query: string, maxResults: number = 10): CPTSuggestion[] {
    const searchTerm = query.toLowerCase();
    const results: CPTSuggestion[] = [];

    for (const [code, cptCode] of this.cptCodes) {
      const searchableText = `${code} ${cptCode.description} ${cptCode.keywords.join(' ')} ${cptCode.category}`.toLowerCase();

      if (searchableText.includes(searchTerm)) {
        results.push(cptCode);
      }
    }

    return results.slice(0, maxResults);
  }

  /**
   * Get CPT code by code number
   */
  getCode(code: string): CPTSuggestion | undefined {
    return this.cptCodes.get(code);
  }

  /**
   * Get all CPT codes
   */
  getAllCodes(): CPTSuggestion[] {
    return Array.from(this.cptCodes.values());
  }

  /**
   * Get codes by category
   */
  getCodesByCategory(category: string): CPTSuggestion[] {
    return Array.from(this.cptCodes.values()).filter(code =>
      code.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Validate CPT code format
   */
  isValidCode(code: string): boolean {
    return /^\d{5}$/.test(code) && this.cptCodes.has(code);
  }
}

// Export singleton instance
export const cptService = CPTService.getInstance();