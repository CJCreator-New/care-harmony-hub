export interface PatientQuery {
  originalQuery: string;
  intent: PatientIntent;
  entities: QueryEntity[];
  confidence: number;
  suggestedActions: SuggestedAction[];
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  category: QueryCategory;
}

export interface PatientIntent {
  primary: string;
  secondary?: string;
  confidence: number;
}

export interface QueryEntity {
  type: 'symptom' | 'medication' | 'appointment' | 'test' | 'condition' | 'provider' | 'location' | 'time';
  value: string;
  confidence: number;
  position: {
    start: number;
    end: number;
  };
}

export interface SuggestedAction {
  type: 'schedule_appointment' | 'request_prescription' | 'view_results' | 'contact_provider' | 'emergency' | 'information_request';
  description: string;
  priority: number;
  requiredEntities: string[];
}

export type QueryCategory =
  | 'appointment_scheduling'
  | 'prescription_request'
  | 'test_results'
  | 'symptom_assessment'
  | 'billing_question'
  | 'general_information'
  | 'emergency'
  | 'technical_support';

export class PatientQueryService {
  private static instance: PatientQueryService;

  private constructor() {}

  static getInstance(): PatientQueryService {
    if (!PatientQueryService.instance) {
      PatientQueryService.instance = new PatientQueryService();
    }
    return PatientQueryService.instance;
  }

  /**
   * Parse a patient's natural language query
   */
  async parseQuery(query: string): Promise<PatientQuery> {
    const normalizedQuery = query.toLowerCase().trim();

    // Extract entities from the query
    const entities = this.extractEntities(normalizedQuery);

    // Determine intent
    const intent = this.determineIntent(normalizedQuery, entities);

    // Categorize the query
    const category = this.categorizeQuery(normalizedQuery, intent, entities);

    // Assess urgency
    const urgency = this.assessUrgency(normalizedQuery, entities);

    // Generate suggested actions
    const suggestedActions = this.generateSuggestedActions(intent, entities, category);

    // Calculate overall confidence
    const confidence = this.calculateConfidence(intent, entities);

    return {
      originalQuery: query,
      intent,
      entities,
      confidence,
      suggestedActions,
      urgency,
      category,
    };
  }

  private extractEntities(query: string): QueryEntity[] {
    const entities: QueryEntity[] = [];

    // Symptom patterns
    const symptomPatterns = [
      /\b(pain|ache|hurt|soreness|discomfort|headache|nausea|dizziness|fatigue|cough|fever|chills)\b/gi,
      /\b(chest pain|back pain|stomach pain|joint pain|muscle pain)\b/gi,
      /\b(shortness of breath|difficulty breathing|wheezing|coughing up blood)\b/gi,
    ];

    // Medication patterns
    const medicationPatterns = [
      /\b(aspirin|ibuprofen|acetaminophen|tylenol|advil|motrin)\b/gi,
      /\b(lisinopril|metformin|atorvastatin|omeprazole|amlodipine)\b/gi,
      /\b(antibiotic|painkiller|blood pressure medication|diabetes medication)\b/gi,
    ];

    // Appointment patterns
    const appointmentPatterns = [
      /\b(appointment|visit|see doctor|consultation|check-up|follow-up)\b/gi,
      /\b(schedule|book|make|set up|reschedule|cancel)\b/gi,
      /\b(today|tomorrow|next week|next month|as soon as possible|urgent)\b/gi,
    ];

    // Test patterns
    const testPatterns = [
      /\b(blood test|lab test|x-ray|mri|ct scan|ultrasound|ekg|ecg)\b/gi,
      /\b(results|report|findings|normal|abnormal)\b/gi,
    ];

    // Provider patterns
    const providerPatterns = [
      /\b(dr\.|doctor|physician|nurse|specialist|cardiologist|dermatologist)\b/gi,
      /\b(primary care|family doctor|gp|internist)\b/gi,
    ];

    // Time patterns
    const timePatterns = [
      /\b(today|tomorrow|this week|next week|this month|next month)\b/gi,
      /\b(morning|afternoon|evening|night|weekend)\b/gi,
      /\b(asap|urgent|emergency|immediately)\b/gi,
    ];

    // Extract symptoms
    symptomPatterns.forEach(pattern => {
      const matches = Array.from(query.matchAll(pattern));
      matches.forEach(match => {
        entities.push({
          type: 'symptom',
          value: match[0].toLowerCase(),
          confidence: 0.9,
          position: { start: match.index!, end: match.index! + match[0].length }
        });
      });
    });

    // Extract medications
    medicationPatterns.forEach(pattern => {
      const matches = Array.from(query.matchAll(pattern));
      matches.forEach(match => {
        entities.push({
          type: 'medication',
          value: match[0].toLowerCase(),
          confidence: 0.95,
          position: { start: match.index!, end: match.index! + match[0].length }
        });
      });
    });

    // Extract appointments
    appointmentPatterns.forEach(pattern => {
      const matches = Array.from(query.matchAll(pattern));
      matches.forEach(match => {
        entities.push({
          type: 'appointment',
          value: match[0].toLowerCase(),
          confidence: 0.85,
          position: { start: match.index!, end: match.index! + match[0].length }
        });
      });
    });

    // Extract tests
    testPatterns.forEach(pattern => {
      const matches = Array.from(query.matchAll(pattern));
      matches.forEach(match => {
        entities.push({
          type: 'test',
          value: match[0].toLowerCase(),
          confidence: 0.9,
          position: { start: match.index!, end: match.index! + match[0].length }
        });
      });
    });

    // Extract providers
    providerPatterns.forEach(pattern => {
      const matches = Array.from(query.matchAll(pattern));
      matches.forEach(match => {
        entities.push({
          type: 'provider',
          value: match[0].toLowerCase(),
          confidence: 0.8,
          position: { start: match.index!, end: match.index! + match[0].length }
        });
      });
    });

    // Extract time references
    timePatterns.forEach(pattern => {
      const matches = Array.from(query.matchAll(pattern));
      matches.forEach(match => {
        entities.push({
          type: 'time',
          value: match[0].toLowerCase(),
          confidence: 0.9,
          position: { start: match.index!, end: match.index! + match[0].length }
        });
      });
    });

    // Remove duplicates based on position
    const uniqueEntities = entities.filter((entity, index, self) =>
      index === self.findIndex(e => e.position.start === entity.position.start)
    );

    return uniqueEntities;
  }

  private determineIntent(query: string, entities: QueryEntity[]): PatientIntent {
    // Intent classification based on keywords and entities
    const intentScores: Record<string, number> = {
      'schedule_appointment': 0,
      'request_prescription': 0,
      'view_test_results': 0,
      'report_symptoms': 0,
      'ask_question': 0,
      'emergency': 0,
      'billing_inquiry': 0,
      'technical_support': 0,
    };

    // Keyword-based scoring
    const keywords = {
      schedule_appointment: ['schedule', 'book', 'make', 'appointment', 'see doctor', 'visit'],
      request_prescription: ['prescription', 'refill', 'medication', 'medicine', 'rx'],
      view_test_results: ['results', 'lab', 'test', 'blood work', 'x-ray', 'scan'],
      report_symptoms: ['pain', 'sick', 'feeling', 'symptoms', 'hurt', 'ache'],
      emergency: ['emergency', 'urgent', 'help', 'chest pain', 'difficulty breathing', 'bleeding'],
      billing_inquiry: ['bill', 'billing', 'insurance', 'payment', 'cost', 'charge'],
      technical_support: ['login', 'password', 'website', 'app', 'technical', 'problem'],
    };

    Object.entries(keywords).forEach(([intent, words]) => {
      words.forEach(word => {
        if (query.includes(word)) {
          intentScores[intent] += 0.3;
        }
      });
    });

    // Entity-based scoring
    entities.forEach(entity => {
      switch (entity.type) {
        case 'appointment':
          intentScores.schedule_appointment += 0.4;
          break;
        case 'medication':
          intentScores.request_prescription += 0.4;
          break;
        case 'test':
          intentScores.view_test_results += 0.4;
          break;
        case 'symptom':
          intentScores.report_symptoms += 0.3;
          if (['chest pain', 'difficulty breathing', 'severe pain'].some(urgent =>
            entity.value.includes(urgent))) {
            intentScores.emergency += 0.5;
          }
          break;
      }
    });

    // Find primary intent
    const primaryIntent = Object.entries(intentScores)
      .sort(([,a], [,b]) => b - a)[0];

    // Find secondary intent (if significantly high)
    const secondaryIntent = Object.entries(intentScores)
      .sort(([,a], [,b]) => b - a)
      .find(([intent], index) => index > 0 && intentScores[intent] > 0.3);

    return {
      primary: primaryIntent[0],
      secondary: secondaryIntent ? secondaryIntent[0] : undefined,
      confidence: primaryIntent[1],
    };
  }

  private categorizeQuery(query: string, intent: PatientIntent, entities: QueryEntity[]): QueryCategory {
    // Emergency detection
    if (intent.primary === 'emergency' || intent.confidence > 0.7) {
      return 'emergency';
    }

    // Categorize based on primary intent
    switch (intent.primary) {
      case 'schedule_appointment':
        return 'appointment_scheduling';
      case 'request_prescription':
        return 'prescription_request';
      case 'view_test_results':
        return 'test_results';
      case 'report_symptoms':
        return 'symptom_assessment';
      case 'billing_inquiry':
        return 'billing_question';
      case 'technical_support':
        return 'technical_support';
      default:
        return 'general_information';
    }
  }

  private assessUrgency(query: string, entities: QueryEntity[]): 'low' | 'medium' | 'high' | 'urgent' {
    // Urgent keywords
    const urgentKeywords = ['emergency', 'urgent', 'asap', 'immediately', 'severe', 'critical'];
    const urgentSymptoms = ['chest pain', 'difficulty breathing', 'unconscious', 'severe bleeding', 'heart attack', 'stroke'];

    // Check for urgent keywords
    if (urgentKeywords.some(keyword => query.includes(keyword))) {
      return 'urgent';
    }

    // Check for urgent symptoms
    if (entities.some(entity =>
      entity.type === 'symptom' &&
      urgentSymptoms.some(symptom => entity.value.includes(symptom))
    )) {
      return 'urgent';
    }

    // High urgency indicators
    const highUrgencyKeywords = ['pain', 'bleeding', 'fever', 'infection', 'broken'];
    if (highUrgencyKeywords.some(keyword => query.includes(keyword))) {
      return 'high';
    }

    // Medium urgency for appointments and prescriptions
    if (query.includes('appointment') || query.includes('prescription')) {
      return 'medium';
    }

    return 'low';
  }

  private generateSuggestedActions(
    intent: PatientIntent,
    entities: QueryEntity[],
    category: QueryCategory
  ): SuggestedAction[] {
    const actions: SuggestedAction[] = [];

    switch (intent.primary) {
      case 'schedule_appointment':
        actions.push({
          type: 'schedule_appointment',
          description: 'Schedule an appointment with your healthcare provider',
          priority: 1,
          requiredEntities: ['time'],
        });
        break;

      case 'request_prescription':
        actions.push({
          type: 'request_prescription',
          description: 'Request a prescription refill or new prescription',
          priority: 1,
          requiredEntities: ['medication'],
        });
        break;

      case 'view_test_results':
        actions.push({
          type: 'view_results',
          description: 'View your recent test results and lab reports',
          priority: 1,
          requiredEntities: ['test'],
        });
        break;

      case 'report_symptoms':
        actions.push({
          type: 'schedule_appointment',
          description: 'Schedule an appointment to discuss your symptoms',
          priority: 1,
          requiredEntities: ['symptom'],
        });
        if (intent.secondary === 'emergency') {
          actions.push({
            type: 'emergency',
            description: 'Call emergency services immediately',
            priority: 2,
            requiredEntities: [],
          });
        }
        break;

      case 'emergency':
        actions.push({
          type: 'emergency',
          description: 'Call emergency services or go to the nearest emergency room',
          priority: 1,
          requiredEntities: [],
        });
        break;

      default:
        actions.push({
          type: 'information_request',
          description: 'Get more information about your healthcare questions',
          priority: 1,
          requiredEntities: [],
        });
    }

    return actions.sort((a, b) => b.priority - a.priority);
  }

  private calculateConfidence(intent: PatientIntent, entities: QueryEntity[]): number {
    // Base confidence from intent
    let confidence = intent.confidence;

    // Boost confidence with entities
    if (entities.length > 0) {
      confidence += 0.1;
    }

    // Boost for clear, specific queries
    if (entities.length >= 2) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Get suggested responses for a parsed query
   */
  getSuggestedResponses(query: PatientQuery): string[] {
    const responses: string[] = [];

    switch (query.category) {
      case 'appointment_scheduling':
        responses.push(
          "I can help you schedule an appointment. What type of appointment are you looking for?",
          "Would you like to see your primary care physician or a specialist?",
          "What dates and times work best for you?"
        );
        break;

      case 'prescription_request':
        responses.push(
          "I can help you request a prescription refill. Which medication do you need?",
          "Please provide the name of the medication and your pharmacy information.",
          "Your prescription request has been submitted and will be reviewed by your provider."
        );
        break;

      case 'test_results':
        responses.push(
          "I can help you view your test results. What type of test results are you looking for?",
          "Your recent lab results are now available in your patient portal.",
          "Would you like me to explain any of these results?"
        );
        break;

      case 'emergency':
        responses.push(
          "This sounds like a medical emergency. Please call 911 or go to the nearest emergency room immediately.",
          "If you're experiencing chest pain, difficulty breathing, or severe symptoms, seek immediate medical attention."
        );
        break;

      case 'symptom_assessment':
        responses.push(
          "I'm sorry you're not feeling well. Can you tell me more about your symptoms?",
          "How long have you been experiencing these symptoms?",
          "Have you noticed any other symptoms or changes?"
        );
        break;

      default:
        responses.push(
          "How can I help you with your healthcare questions today?",
          "I'm here to assist you with appointments, prescriptions, test results, and general health information.",
          "Please let me know what specific information or assistance you need."
        );
    }

    return responses;
  }
}

// Export singleton instance
export const patientQueryService = PatientQueryService.getInstance();