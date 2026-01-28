export interface ResponseTemplate {
  id: string;
  category: QueryCategory;
  intent: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  template: string;
  variables: string[];
  conditions?: ResponseCondition[];
  priority: number;
}

export interface ResponseCondition {
  field: 'entities' | 'urgency' | 'time' | 'patient_context';
  operator: 'contains' | 'equals' | 'greater_than' | 'less_than' | 'exists';
  value: any;
}

export interface PersonalizedResponse {
  text: string;
  confidence: number;
  actions: SuggestedAction[];
  followUpQuestions?: string[];
  escalationRequired: boolean;
  escalationReason?: string;
  metadata: {
    templateId: string;
    personalizationFactors: string[];
    generatedAt: Date;
  };
}

export interface PatientContext {
  patientId?: string;
  demographics?: {
    age?: number;
    gender?: string;
    language?: string;
  };
  medicalHistory?: {
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
  };
  recentInteractions?: {
    lastAppointment?: Date;
    lastQuery?: Date;
    pendingTasks?: string[];
  };
  preferences?: {
    communicationStyle?: 'formal' | 'casual' | 'empathetic';
    responseLength?: 'brief' | 'detailed' | 'comprehensive';
  };
}

import { PatientQuery, QueryCategory, SuggestedAction } from './PatientQueryService';

export class AutomatedResponseService {
  private static instance: AutomatedResponseService;
  private responseTemplates: Map<string, ResponseTemplate> = new Map();

  private constructor() {
    this.initializeResponseTemplates();
  }

  static getInstance(): AutomatedResponseService {
    if (!AutomatedResponseService.instance) {
      AutomatedResponseService.instance = new AutomatedResponseService();
    }
    return AutomatedResponseService.instance;
  }

  private initializeResponseTemplates(): void {
    // Emergency Response Templates
    this.addTemplate({
      id: 'emergency_chest_pain',
      category: 'emergency',
      intent: 'emergency',
      urgency: 'urgent',
      template: '🚨 EMERGENCY ALERT: This appears to be a medical emergency involving chest pain. Please call 911 immediately or go to the nearest emergency room. Do not wait - seek immediate medical attention.',
      variables: [],
      conditions: [
        { field: 'entities', operator: 'contains', value: 'chest pain' }
      ],
      priority: 10
    });

    this.addTemplate({
      id: 'emergency_difficulty_breathing',
      category: 'emergency',
      intent: 'emergency',
      urgency: 'urgent',
      template: '🚨 EMERGENCY ALERT: Difficulty breathing requires immediate medical attention. Please call 911 or go to the nearest emergency room right away.',
      variables: [],
      conditions: [
        { field: 'entities', operator: 'contains', value: 'difficulty breathing' }
      ],
      priority: 10
    });

    this.addTemplate({
      id: 'emergency_general',
      category: 'emergency',
      intent: 'emergency',
      urgency: 'urgent',
      template: '🚨 MEDICAL EMERGENCY: Your symptoms suggest you need immediate medical care. Please call emergency services (911) or proceed to the nearest emergency department immediately. Do not delay seeking help.',
      variables: [],
      priority: 9
    });

    // Appointment Scheduling Templates
    this.addTemplate({
      id: 'appointment_new_patient',
      category: 'appointment_scheduling',
      intent: 'schedule_appointment',
      urgency: 'medium',
      template: 'I\'d be happy to help you schedule an appointment. As a new patient, we\'ll need to gather some basic information first. What type of care are you looking for?',
      variables: ['care_type'],
      conditions: [
        { field: 'entities', operator: 'contains', value: 'new patient' }
      ],
      priority: 5
    });

    this.addTemplate({
      id: 'appointment_established',
      category: 'appointment_scheduling',
      intent: 'schedule_appointment',
      urgency: 'medium',
      template: 'I can help you schedule a follow-up appointment. What dates and times work best for you? We have availability with your primary care provider.',
      variables: ['provider_name', 'available_times'],
      priority: 5
    });

    this.addTemplate({
      id: 'appointment_urgent',
      category: 'appointment_scheduling',
      intent: 'schedule_appointment',
      urgency: 'high',
      template: 'I understand you need to see a doctor urgently. Let me check for the earliest available appointment. In the meantime, if this is a medical emergency, please call 911.',
      variables: ['earliest_time'],
      conditions: [
        { field: 'urgency', operator: 'equals', value: 'high' }
      ],
      priority: 7
    });

    // Prescription Request Templates
    this.addTemplate({
      id: 'prescription_refill',
      category: 'prescription_request',
      intent: 'request_prescription',
      urgency: 'medium',
      template: 'I can help you request a prescription refill. For your safety, I\'ll need to verify your current prescription and check with your provider. Which medication do you need refilled?',
      variables: ['medication_name', 'remaining_quantity'],
      priority: 5
    });

    this.addTemplate({
      id: 'prescription_new',
      category: 'prescription_request',
      intent: 'request_prescription',
      urgency: 'low',
      template: 'To request a new prescription, your healthcare provider needs to evaluate your condition first. Would you like to schedule an appointment to discuss this?',
      variables: ['medication_name'],
      priority: 4
    });

    // Test Results Templates
    this.addTemplate({
      id: 'test_results_available',
      category: 'test_results',
      intent: 'view_test_results',
      urgency: 'low',
      template: 'Your test results are now available in your patient portal. You can view them securely online. Would you like me to help you access them or explain any of the results?',
      variables: ['test_types', 'result_date'],
      priority: 5
    });

    this.addTemplate({
      id: 'test_results_pending',
      category: 'test_results',
      intent: 'view_test_results',
      urgency: 'low',
      template: 'Your test results are still being processed. They should be available within 24-48 hours. I\'ll send you a notification when they\'re ready.',
      variables: ['expected_time'],
      priority: 4
    });

    // Symptom Assessment Templates
    this.addTemplate({
      id: 'symptoms_mild',
      category: 'symptom_assessment',
      intent: 'report_symptoms',
      urgency: 'low',
      template: 'I\'m sorry you\'re not feeling well. Based on your symptoms, this doesn\'t appear to be an emergency. However, I recommend monitoring your symptoms and contacting your healthcare provider if they worsen. Would you like to schedule a virtual consultation?',
      variables: ['symptoms_list'],
      conditions: [
        { field: 'urgency', operator: 'equals', value: 'low' }
      ],
      priority: 4
    });

    this.addTemplate({
      id: 'symptoms_concerning',
      category: 'symptom_assessment',
      intent: 'report_symptoms',
      urgency: 'high',
      template: 'Your symptoms are concerning and should be evaluated by a healthcare professional. I recommend scheduling an appointment as soon as possible. In the meantime, please monitor your symptoms closely.',
      variables: ['symptoms_list', 'recommended_action'],
      conditions: [
        { field: 'urgency', operator: 'equals', value: 'high' }
      ],
      priority: 6
    });

    // Billing Question Templates
    this.addTemplate({
      id: 'billing_explanation',
      category: 'billing_question',
      intent: 'billing_inquiry',
      urgency: 'low',
      template: 'I can help explain your billing statement. Your charges include provider visits, tests, and procedures. You can view a detailed breakdown in your patient portal or contact our billing department at (555) 123-4567.',
      variables: ['billing_period', 'total_amount'],
      priority: 4
    });

    // Technical Support Templates
    this.addTemplate({
      id: 'technical_login',
      category: 'technical_support',
      intent: 'technical_support',
      urgency: 'low',
      template: 'Having trouble logging in? You can reset your password using the "Forgot Password" link on the login page. If you continue having issues, please contact our technical support team.',
      variables: [],
      priority: 3
    });

    // General Information Templates
    this.addTemplate({
      id: 'general_greeting',
      category: 'general_information',
      intent: 'ask_question',
      urgency: 'low',
      template: 'Hello! I\'m here to help with your healthcare questions and needs. How can I assist you today?',
      variables: [],
      priority: 1
    });

    this.addTemplate({
      id: 'general_fallback',
      category: 'general_information',
      intent: 'ask_question',
      urgency: 'low',
      template: 'I\'m here to help with appointments, prescriptions, test results, and general healthcare information. Could you please provide more details about what you need assistance with?',
      variables: [],
      priority: 1
    });
  }

  private addTemplate(template: ResponseTemplate): void {
    this.responseTemplates.set(template.id, template);
  }

  /**
   * Generate a personalized response for a patient query
   */
  async generateResponse(
    query: PatientQuery,
    patientContext?: PatientContext
  ): Promise<PersonalizedResponse> {
    // Find the best matching template
    const bestTemplate = this.findBestTemplate(query);

    if (!bestTemplate) {
      // Fallback response
      return this.generateFallbackResponse(query);
    }

    // Personalize the response
    const personalizedText = this.personalizeResponse(bestTemplate, query, patientContext);

    // Generate follow-up questions
    const followUpQuestions = this.generateFollowUpQuestions(query, bestTemplate);

    // Determine if escalation is required
    const { escalationRequired, escalationReason } = this.assessEscalation(query);

    // Calculate confidence
    const confidence = this.calculateResponseConfidence(query, bestTemplate, patientContext);

    return {
      text: personalizedText,
      confidence,
      actions: query.suggestedActions,
      followUpQuestions,
      escalationRequired,
      escalationReason,
      metadata: {
        templateId: bestTemplate.id,
        personalizationFactors: this.getPersonalizationFactors(patientContext),
        generatedAt: new Date(),
      },
    };
  }

  private findBestTemplate(query: PatientQuery): ResponseTemplate | null {
    const candidates: Array<ResponseTemplate & { score: number }> = [];

    for (const template of this.responseTemplates.values()) {
      let score = 0;

      // Category match
      if (template.category === query.category) {
        score += 3;
      }

      // Intent match
      if (template.intent === query.intent.primary) {
        score += 2;
      }

      // Urgency match
      if (template.urgency === query.urgency) {
        score += 2;
      }

      // Condition matches
      if (template.conditions) {
        for (const condition of template.conditions) {
          if (this.evaluateCondition(condition, query)) {
            score += 1;
          }
        }
      }

      // Priority bonus
      score += template.priority * 0.1;

      if (score > 0) {
        candidates.push({ ...template, score });
      }
    }

    // Return the highest scoring template
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0] || null;
  }

  private evaluateCondition(condition: ResponseCondition, query: PatientQuery): boolean {
    switch (condition.field) {
      case 'entities':
        return query.entities.some(entity =>
          entity.value.toLowerCase().includes(condition.value.toLowerCase())
        );
      case 'urgency':
        return query.urgency === condition.value;
      case 'time':
        // Could implement time-based conditions
        return false;
      case 'patient_context':
        // Could implement patient context conditions
        return false;
      default:
        return false;
    }
  }

  private personalizeResponse(
    template: ResponseTemplate,
    query: PatientQuery,
    patientContext?: PatientContext
  ): string {
    let response = template.template;

    // Replace variables with actual values
    if (patientContext?.demographics?.language) {
      // Could implement language-specific responses
    }

    if (patientContext?.preferences?.communicationStyle === 'empathetic') {
      // Add more empathetic language
      response = response.replace('I can help', 'I\'m here to help');
      response = response.replace('Please', 'I kindly ask that you please');
    }

    if (patientContext?.preferences?.responseLength === 'brief') {
      // Shorten response
      response = response.split('.')[0] + '.';
    }

    // Add patient-specific context
    if (patientContext?.recentInteractions?.lastAppointment) {
      const daysSince = Math.floor(
        (Date.now() - patientContext.recentInteractions.lastAppointment.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince < 30) {
        response += ` I see you had an appointment ${daysSince} days ago.`;
      }
    }

    return response;
  }

  private generateFollowUpQuestions(query: PatientQuery, template: ResponseTemplate): string[] {
    const questions: string[] = [];

    switch (query.category) {
      case 'appointment_scheduling':
        questions.push(
          'What type of appointment are you looking for?',
          'What dates work best for you?',
          'Do you have a preferred time of day?'
        );
        break;

      case 'prescription_request':
        questions.push(
          'Which medication do you need?',
          'How many refills do you need?',
          'When did you last fill this prescription?'
        );
        break;

      case 'symptom_assessment':
        questions.push(
          'How long have you had these symptoms?',
          'Have you noticed any other symptoms?',
          'Are you taking any medications for this?'
        );
        break;

      case 'test_results':
        questions.push(
          'What type of test results are you looking for?',
          'When were the tests performed?',
          'Have you experienced any symptoms related to these tests?'
        );
        break;
    }

    return questions.slice(0, 3); // Limit to 3 questions
  }

  private assessEscalation(query: PatientQuery): { escalationRequired: boolean; escalationReason?: string } {
    if (query.category === 'emergency') {
      return {
        escalationRequired: true,
        escalationReason: 'Medical emergency detected - immediate response required'
      };
    }

    if (query.urgency === 'urgent') {
      return {
        escalationRequired: true,
        escalationReason: 'Urgent medical situation requiring immediate attention'
      };
    }

    if (query.intent.primary === 'emergency') {
      return {
        escalationRequired: true,
        escalationReason: 'Emergency intent detected in patient query'
      };
    }

    return { escalationRequired: false };
  }

  private calculateResponseConfidence(
    query: PatientQuery,
    template: ResponseTemplate,
    patientContext?: PatientContext
  ): number {
    let confidence = 0.7; // Base confidence

    // Boost confidence for exact category/intent matches
    if (template.category === query.category) {
      confidence += 0.1;
    }

    if (template.intent === query.intent.primary) {
      confidence += 0.1;
    }

    // Boost for patient context
    if (patientContext) {
      confidence += 0.05;
    }

    // Reduce confidence for general templates
    if (template.priority <= 2) {
      confidence -= 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private getPersonalizationFactors(patientContext?: PatientContext): string[] {
    const factors: string[] = [];

    if (patientContext?.demographics?.age) {
      factors.push('age_appropriate');
    }

    if (patientContext?.demographics?.language) {
      factors.push('language_specific');
    }

    if (patientContext?.preferences?.communicationStyle) {
      factors.push('communication_style');
    }

    if (patientContext?.recentInteractions?.lastAppointment) {
      factors.push('recent_interaction');
    }

    return factors;
  }

  private generateFallbackResponse(query: PatientQuery): PersonalizedResponse {
    const fallbackText = 'I\'m here to help with your healthcare needs. Could you please provide more details about what you\'re looking for? I can assist with appointments, prescriptions, test results, and general health information.';

    return {
      text: fallbackText,
      confidence: 0.5,
      actions: query.suggestedActions,
      followUpQuestions: [
        'What specific healthcare service do you need?',
        'Are you looking to schedule an appointment?',
        'Do you need help with a prescription or test results?'
      ],
      escalationRequired: false,
      metadata: {
        templateId: 'fallback',
        personalizationFactors: [],
        generatedAt: new Date(),
      },
    };
  }

  /**
   * Get all available response templates
   */
  getAllTemplates(): ResponseTemplate[] {
    return Array.from(this.responseTemplates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: QueryCategory): ResponseTemplate[] {
    return Array.from(this.responseTemplates.values())
      .filter(template => template.category === category);
  }

  /**
   * Add a custom response template
   */
  addCustomTemplate(template: ResponseTemplate): void {
    this.responseTemplates.set(template.id, template);
  }

  /**
   * Update an existing template
   */
  updateTemplate(templateId: string, updates: Partial<ResponseTemplate>): void {
    const existing = this.responseTemplates.get(templateId);
    if (existing) {
      this.responseTemplates.set(templateId, { ...existing, ...updates });
    }
  }
}

// Export singleton instance
export const automatedResponseService = AutomatedResponseService.getInstance();