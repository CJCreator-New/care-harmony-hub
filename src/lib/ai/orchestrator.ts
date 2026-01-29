import { supabase } from '@/integrations/supabase/client';
import { captureClinicalError, trackAIOperation } from '@/lib/monitoring/sentry';
import {
  AIDateSanitizer,
  AIEncryptionService,
  AISecurityAuditor,
  SanitizedPatientData,
  AISecurityContext,
  EncryptedPayload
} from '@/lib/ai/security';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { ClaudeProvider } from './providers/ClaudeProvider';
import { AIProvider, AIRequest, AIResponse, AIProviderConfig } from './types';

/**
 * HIPAA-compliant AI Service Orchestrator
 * Coordinates AI operations with comprehensive security and compliance
 */
export class AIServiceOrchestrator {
  private static instance: AIServiceOrchestrator;
  private activeProviders: Map<string, AIProvider> = new Map();

  private constructor() {
    this.initializeProviders();
  }

  static getInstance(): AIServiceOrchestrator {
    if (!AIServiceOrchestrator.instance) {
      AIServiceOrchestrator.instance = new AIServiceOrchestrator();
    }
    return AIServiceOrchestrator.instance;
  }

  /**
   * Processes an AI request with full security compliance
   */
  async processAIRequest(
    request: AIRequest,
    securityContext: AISecurityContext
  ): Promise<AIResponse> {
    const startTime = Date.now();
    let selectedProvider: AIProvider;

    try {
      // Step 1: Validate compliance and permissions
      await this.validateCompliance(securityContext, request);

      // Step 2: Select appropriate AI provider
      selectedProvider = this.selectProvider(request.options?.provider);

      // Step 3: Sanitize and encrypt data
      const sanitizedData = AIDateSanitizer.sanitizePatientData(request.patientData, securityContext);
      const encryptedPayload = await AIEncryptionService.encryptForAI(sanitizedData, securityContext);

      // Step 4: Track data flow
      await this.trackDataFlow(securityContext, 'data_ingestion', sanitizedData.id);
      await this.trackDataFlow(securityContext, 'sanitization', sanitizedData.id);
      await this.trackDataFlow(securityContext, 'encryption', sanitizedData.id);

      // Step 5: Execute AI operation
      await this.trackDataFlow(securityContext, 'ai_processing', sanitizedData.id);
      const aiResponse = await this.executeAIRequest(request, encryptedPayload, selectedProvider);

      // Step 6: Process and validate response
      const processedResponse = await this.processAIResponse(aiResponse, securityContext);

      // Step 7: Audit the operation
      await AISecurityAuditor.auditAIOperation(
        request.type,
        securityContext,
        processedResponse
      );

      // Step 8: Track completion
      await this.trackDataFlow(securityContext, 'response_processing', sanitizedData.id);
      await this.trackDataFlow(securityContext, 'cleanup', sanitizedData.id);

      // Step 9: Monitor performance
      const processingTime = Date.now() - startTime;
      trackAIOperation({
        operation: request.type,
        provider: selectedProvider.name,
        model: selectedProvider.model,
        tokensUsed: processedResponse.metadata.tokensUsed,
        processingTime,
        cost: processedResponse.metadata.cost,
        success: processedResponse.success,
      });

      return processedResponse;

    } catch (error) {
      // Comprehensive error handling
      const processingTime = Date.now() - startTime;

      captureClinicalError(error as Error, {
        context: 'ai_service_orchestrator',
        operation: request.type,
        sessionId: securityContext.sessionId,
        provider: selectedProvider?.name,
        processingTime,
      });

      // Track failed operation
      await this.trackDataFlow(securityContext, 'failed', request.patientData.id);

      return {
        success: false,
        response: 'AI processing failed due to security or compliance requirements',
        confidence: 0,
        metadata: {
          provider: selectedProvider?.name || 'unknown',
          model: selectedProvider?.model || 'unknown',
          tokensUsed: 0,
          processingTime,
          cost: 0,
        },
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Validates compliance requirements before AI processing
   */
  private async validateCompliance(
    context: AISecurityContext,
    request: AIRequest
  ): Promise<void> {
    // Check user permissions
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('permissions')
      .eq('user_id', context.userId)
      .eq('hospital_id', context.hospitalId)
      .single();

    if (!permissions?.permissions?.includes('ai_access')) {
      throw new Error('User does not have AI access permissions');
    }

    // Check compliance policies
    const { data: policies } = await supabase
      .from('ai_compliance_policies')
      .select('policy_config')
      .eq('hospital_id', context.hospitalId)
      .eq('policy_type', 'usage_limitation')
      .eq('is_active', true)
      .single();

    if (policies?.policy_config) {
      const config = policies.policy_config as any;

      // Check allowed purposes
      if (!config.allowedPurposes?.includes(context.purpose)) {
        throw new Error(`AI usage for purpose '${context.purpose}' is not permitted`);
      }

      // Check rate limits (simplified - in production, use Redis or similar)
      const recentRequests = await supabase
        .from('ai_security_audit')
        .select('id')
        .eq('user_id', context.userId)
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .limit(config.maxRequestsPerHour || 100);

      if (recentRequests.length >= (config.maxRequestsPerHour || 100)) {
        throw new Error('AI request rate limit exceeded');
      }
    }
  }

  /**
   * Selects the appropriate AI provider based on request and availability
   */
  private selectProvider(requestedProvider?: AIProvider): AIProvider {
    if (requestedProvider && this.activeProviders.has(requestedProvider.name)) {
      return requestedProvider;
    }

    // Default provider selection logic
    // Priority: OpenAI GPT-4 > Anthropic Claude > Google Vertex
    const priority = ['openai', 'anthropic', 'google'];

    for (const providerName of priority) {
      const provider = this.activeProviders.get(providerName);
      if (provider) return provider;
    }

    throw new Error('No AI providers available');
  }

  /**
   * Executes the actual AI request using real providers
   */
  private async executeAIRequest(
    request: AIRequest,
    encryptedPayload: EncryptedPayload,
    provider: AIProvider
  ): Promise<any> {
    const providerInstance = this.activeProviders.get(provider.name);

    if (!providerInstance) {
      throw new Error(`Provider ${provider.name} not available`);
    }

    // Decrypt the payload for the AI provider
    const decryptedData = await AIEncryptionService.decryptFromAI(encryptedPayload);

    // Execute the appropriate AI operation
    switch (request.type) {
      case 'diagnosis':
        return await providerInstance.diagnosePatient(
          decryptedData,
          request.context,
          request.patientData.id
        );

      case 'treatment_plan':
        return await providerInstance.createTreatmentPlan(
          decryptedData,
          request.context, // This should be the diagnosis
          undefined, // Additional context
          request.patientData.id
        );

      case 'treatment_recommendations':
        // Extract diagnoses from context
        const diagnoses = this.extractDiagnosesFromContext(request.context);
        return await providerInstance.generateTreatmentRecommendations(
          decryptedData,
          diagnoses,
          undefined, // Additional context
          request.patientData.id
        );

      case 'treatment_plan_optimization':
        // Extract optimization parameters from context
        const optimizationParams = this.extractOptimizationParamsFromContext(request.context);
        return await providerInstance.optimizeTreatmentPlan(
          decryptedData,
          optimizationParams.currentPlan,
          optimizationParams.diagnoses,
          optimizationParams.criteria,
          undefined, // Additional context
          request.patientData.id
        );

      case 'predict_readmission_risk':
        return await providerInstance.predictReadmissionRisk(
          decryptedData,
          request.context,
          request.patientData.id
        );

      case 'predict_length_of_stay':
        return await providerInstance.predictLengthOfStay(
          decryptedData,
          request.context,
          request.patientData.id
        );

      case 'resource_utilization_optimization':
        // Extract operational data from request
        const operationalData = this.extractOperationalDataFromContext(request.context);
        return await providerInstance.optimizeResourceUtilization(
          operationalData,
          request.context,
          request.patientData.id
        );

      case 'medication_review':
        // Extract medications from context or use default
        const medications = this.extractMedicationsFromContext(request.context);
        return await providerInstance.reviewMedications(
          decryptedData,
          medications,
          request.patientData.id
        );

      case 'clinical_summary':
        // For clinical summary, we can use the diagnosis method with summary context
        return await providerInstance.diagnosePatient(
          decryptedData,
          `Please provide a clinical summary of this patient's presentation and current status. ${request.context}`,
          request.patientData.id
        );

      default:
        throw new Error(`Unsupported AI request type: ${request.type}`);
    }
  }

  /**
   * Extracts medication list from request context
   */
  private extractMedicationsFromContext(context: string): string[] {
    // Simple extraction - in production, use more sophisticated parsing
    // Look for medication patterns in the context
    const medicationPatterns = [
      /medications?:?\s*([^.]+)/i,
      /current medications?:?\s*([^.]+)/i,
      /taking:?\s*([^.]+)/i,
    ];

    for (const pattern of medicationPatterns) {
      const match = context.match(pattern);
      if (match) {
        return match[1].split(',').map(med => med.trim()).filter(med => med.length > 0);
      }
    }

    // Fallback: try to extract from patient data if available
    return [];
  }

  /**
   * Extracts diagnosis list from request context
   */
  private extractDiagnosesFromContext(context: string): string[] {
    // Simple extraction - in production, use more sophisticated parsing
    // Look for diagnosis patterns in the context
    const diagnosisPatterns = [
      /diagnos(?:is|es)?:?\s*([^.]+)/i,
      /condition(?:s)?:?\s*([^.]+)/i,
      /differential:?\s*([^.]+)/i,
    ];

    for (const pattern of diagnosisPatterns) {
      const match = context.match(pattern);
      if (match) {
        return match[1].split(',').map(diag => diag.trim()).filter(diag => diag.length > 0);
      }
    }

    // If no patterns match, treat the entire context as diagnoses
    if (context.trim()) {
      return context.split('\n').map(diag => diag.trim()).filter(diag => diag.length > 0);
    }

    return [];
  }

  /**
   * Extracts optimization parameters from request context
   */
  private extractOptimizationParamsFromContext(context: string): {
    currentPlan: string;
    diagnoses: string[];
    criteria: any;
  } {
    // Default values
    let currentPlan = '';
    let diagnoses: string[] = [];
    let criteria: any = {
      prioritizeEfficacy: true,
      prioritizeSafety: true,
      prioritizeCost: false,
      prioritizeAdherence: true,
      considerSocioeconomic: true
    };

    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(context);
      if (parsed.currentPlan) currentPlan = parsed.currentPlan;
      if (parsed.diagnoses) diagnoses = parsed.diagnoses;
      if (parsed.criteria) criteria = { ...criteria, ...parsed.criteria };
    } catch {
      // Fallback to text parsing
      // Extract current plan
      const planMatch = context.match(/current.*plan:?\s*([^]+?)(?=diagnos|criteria|$)/i);
      if (planMatch) {
        currentPlan = planMatch[1].trim();
      }

      // Extract diagnoses
      const diagnosisMatch = context.match(/diagnos(?:is|es)?:?\s*([^]+?)(?=criteria|$)/i);
      if (diagnosisMatch) {
        diagnoses = diagnosisMatch[1].split('\n').map(d => d.trim()).filter(d => d.length > 0);
      }

      // Extract criteria
      const criteriaMatch = context.match(/criteria:?\s*([^]+?)$/i);
      if (criteriaMatch) {
        const criteriaText = criteriaMatch[1];
        // Simple boolean extraction
        criteria.prioritizeEfficacy = /efficac/i.test(criteriaText);
        criteria.prioritizeSafety = /saf/i.test(criteriaText);
        criteria.prioritizeCost = /cost/i.test(criteriaText);
        criteria.prioritizeAdherence = /adher/i.test(criteriaText);
        criteria.considerSocioeconomic = /socio/i.test(criteriaText);
      }
    }

    return { currentPlan, diagnoses, criteria };
  }

  /**
   * Extracts operational data from request context for resource utilization optimization
   */
  private extractOperationalDataFromContext(context: string): any {
    // Default operational data structure
    let operationalData: any = {
      department: 'General',
      timeframe: '24 hours',
      currentPatients: 0,
      currentAppointments: 0,
      currentBedOccupancy: 0,
      availableBeds: 0,
      currentStaff: {},
      equipmentStatus: {}
    };

    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(context);
      operationalData = { ...operationalData, ...parsed };
    } catch {
      // Fallback to text parsing
      // Extract department
      const deptMatch = context.match(/department:?\s*([^,\n]+)/i);
      if (deptMatch) {
        operationalData.department = deptMatch[1].trim();
      }

      // Extract timeframe
      const timeMatch = context.match(/timeframe:?\s*([^,\n]+)/i);
      if (timeMatch) {
        operationalData.timeframe = timeMatch[1].trim();
      }

      // Extract patient load
      const patientMatch = context.match(/patients?:?\s*(\d+)/i);
      if (patientMatch) {
        operationalData.currentPatients = parseInt(patientMatch[1]);
      }

      // Extract appointments
      const apptMatch = context.match(/appointments?:?\s*(\d+)/i);
      if (apptMatch) {
        operationalData.currentAppointments = parseInt(apptMatch[1]);
      }

      // Extract bed occupancy
      const bedMatch = context.match(/bed.*occupancy:?\s*(\d+)%?/i);
      if (bedMatch) {
        operationalData.currentBedOccupancy = parseInt(bedMatch[1]);
      }

      // Extract available beds
      const availMatch = context.match(/available.*beds?:?\s*(\d+)/i);
      if (availMatch) {
        operationalData.availableBeds = parseInt(availMatch[1]);
      }

      // Extract staff information
      const staffMatch = context.match(/staff:?\s*([^]+?)(?=equipment|$)/i);
      if (staffMatch) {
        const staffText = staffMatch[1];
        const staffData: any = {};
        const nurseMatch = staffText.match(/nurses?:?\s*(\d+)/i);
        if (nurseMatch) staffData.nurses = parseInt(nurseMatch[1]);
        const physicianMatch = staffText.match(/physicians?:?\s*(\d+)/i);
        if (physicianMatch) staffData.physicians = parseInt(physicianMatch[1]);
        const supportMatch = staffText.match(/support:?\s*(\d+)/i);
        if (supportMatch) staffData.support = parseInt(supportMatch[1]);
        operationalData.currentStaff = staffData;
      }

      // Extract equipment status
      const equipMatch = context.match(/equipment:?\s*([^]+?)$/i);
      if (equipMatch) {
        const equipText = equipMatch[1];
        const equipData: any = {};
        const ventMatch = equipText.match(/ventilators?:?\s*(\d+)/i);
        if (ventMatch) equipData.ventilators = parseInt(ventMatch[1]);
        const monitorMatch = equipText.match(/monitors?:?\s*(\d+)/i);
        if (monitorMatch) equipData.monitors = parseInt(monitorMatch[1]);
        const pumpMatch = equipText.match(/pumps?:?\s*(\d+)/i);
        if (pumpMatch) equipData.infusion_pumps = parseInt(pumpMatch[1]);
        operationalData.equipmentStatus = equipData;
      }
    }

    return operationalData;
  }

  /**
   * Processes and validates AI response
   */
  private async processAIResponse(
    aiResult: AIResponse,
    context: AISecurityContext
  ): Promise<AIResponse> {
    // Validate response doesn't contain PHI (additional check)
    const sanitizedResponse = AIDateSanitizer.sanitizeText(aiResult.response);

    // The response is already properly formatted from the provider
    return {
      success: aiResult.success !== false, // Default to true if not specified
      response: sanitizedResponse,
      confidence: aiResult.confidence,
      metadata: aiResult.metadata,
      warnings: aiResult.warnings,
      errors: aiResult.errors,
    };
  }

  /**
   * Tracks data flow through the AI processing pipeline
   */
  private async trackDataFlow(
    context: AISecurityContext,
    stage: string,
    deidentifiedId: string
  ): Promise<void> {
    try {
      await supabase.from('ai_data_flow').insert({
        hospital_id: context.hospitalId,
        session_id: context.sessionId,
        data_flow_id: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        deidentified_patient_id: deidentifiedId,
        stage,
        stage_status: 'completed',
        created_by: context.userId,
      });
    } catch (error) {
      console.error('Failed to track data flow:', error);
      // Don't throw - data flow tracking failure shouldn't break AI processing
    }
  }

  /**
   * Initializes available AI providers
   */
  private initializeProviders(): void {
    try {
      // Initialize OpenAI provider
      const openaiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
      if (openaiKey) {
        const openaiConfig: AIProviderConfig = {
          apiKey: openaiKey,
          model: 'gpt-4-turbo-preview',
          maxTokens: 4096,
        };
        this.activeProviders.set('openai', new OpenAIProvider(openaiConfig));
      }

      // Initialize Anthropic Claude provider
      const claudeKey = import.meta.env.VITE_ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY;
      if (claudeKey) {
        const claudeConfig: AIProviderConfig = {
          apiKey: claudeKey,
          model: 'claude-3-sonnet-20240229',
          maxTokens: 4096,
        };
        this.activeProviders.set('anthropic', new ClaudeProvider(claudeConfig));
      }

      // Note: Google Vertex AI provider would be added here in the future

      console.log(`Initialized ${this.activeProviders.size} AI providers`);
    } catch (error) {
      console.error('Failed to initialize AI providers:', error);
      // Continue with available providers, don't throw
    }
  }

  /**
   * Gets available providers for a hospital
   */
  async getAvailableProviders(hospitalId: string): Promise<{ name: string; model: string; status: string }[]> {
    // Return provider info without exposing API keys
    const providers: { name: string; model: string; status: string }[] = [];

    for (const [name, provider] of this.activeProviders) {
      providers.push({
        name: provider.name,
        model: provider.model,
        status: 'available',
      });
    }

    return providers;
  }

  /**
   * Gets compliance status for AI operations
   */
  async getComplianceStatus(hospitalId: string): Promise<{
    status: 'compliant' | 'warning' | 'violation';
    issues: string[];
    lastAudit: Date | null;
  }> {
    try {
      const { data: audit } = await supabase
        .from('ai_security_audit')
        .select('compliance_status, timestamp')
        .eq('hospital_id', hospitalId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      const issues: string[] = [];

      if (!audit) {
        return {
          status: 'warning',
          issues: ['No AI operations audited yet'],
          lastAudit: null,
        };
      }

      const status = audit.compliance_status as 'compliant' | 'warning' | 'violation';

      if (status === 'violation') {
        issues.push('Compliance violations detected in recent AI operations');
      }

      return {
        status,
        issues,
        lastAudit: new Date(audit.timestamp),
      };
    } catch (error) {
      return {
        status: 'warning',
        issues: ['Unable to retrieve compliance status'],
        lastAudit: null,
      };
    }
  }
}

// Export singleton instance
export const aiOrchestrator = AIServiceOrchestrator.getInstance();