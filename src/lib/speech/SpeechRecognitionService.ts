import { AIDateSanitizer, AIEncryptionService, AISecurityAuditor } from '../ai/security';
/**
 * Speech Recognition Provider Configuration
 */
export interface SpeechProviderConfig {
  provider: 'azure' | 'google' | 'aws' | 'web';
  apiKey?: string;
  region?: string;
  language?: string;
  medicalMode?: boolean;
}

/**
 * Speech Recognition Result
 */
export interface SpeechResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  timestamp: Date;
  provider: string;
  medicalTerms?: string[];
  corrections?: string[];
  originalTranscript?: string;
}

/**
 * Speech Recognition Service Interface
 */
export interface SpeechRecognitionService {
  startRecognition(config: SpeechProviderConfig): Promise<void>;
  stopRecognition(): Promise<void>;
  pauseRecognition(): Promise<void>;
  resumeRecognition(): Promise<void>;
  onResult(callback: (result: SpeechResult) => void): void;
  onError(callback: (error: Error) => void): void;
  isSupported(): boolean;
  getSupportedLanguages(): string[];
}

/**
 * HIPAA-compliant Speech Recognition Service
 * Supports multiple cloud providers with medical terminology optimization
 */
export class SpeechRecognitionManager implements SpeechRecognitionService {
  private currentProvider: SpeechProviderConfig | null = null;
  private isListening = false;
  private resultCallbacks: ((result: SpeechResult) => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];
  private sanitizer: AIDateSanitizer;
  private encryptor: AIEncryptionService;
  private auditor: AISecurityAuditor;
  private medicalTerminology: any; // We'll initialize this differently
  private 
  constructor() {
    this.sanitizer = new AIDateSanitizer();
    this.encryptor = new AIEncryptionService();
    this.auditor = new AISecurityAuditor();
    this.medicalTerminology = new MedicalTerminologyServiceImpl();
  }

  /**
   * Start speech recognition with specified provider
   */
  async startRecognition(config: SpeechProviderConfig): Promise<void> {
    if (this.isListening) {
      throw new Error('Speech recognition is already active');
    }

    this.currentProvider = config;
    this.sessionId = `speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create audit trail
    await this.auditor.logOperation({
      operation: 'speech_recognition_start',
      provider: config.provider,
      sessionId: this.sessionId,
      purpose: 'clinical_documentation',
    });

    try {
      switch (config.provider) {
        case 'azure':
          await this.startAzureRecognition(config);
          break;
        case 'google':
          await this.startGoogleRecognition(config);
          break;
        case 'aws':
          await this.startAWSRecognition(config);
          break;
        case 'web':
          await this.startWebRecognition(config);
          break;
        default:
          throw new Error(`Unsupported speech provider: ${config.provider}`);
      }

      this.isListening = true;
    } catch (error) {
      await this.auditor.logOperation({
        operation: 'speech_recognition_start',
        provider: config.provider,
        sessionId: this.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      });
      throw error;
    }
  }

  /**
   * Stop speech recognition
   */
  async stopRecognition(): Promise<void> {
    if (!this.isListening) return;

    try {
      switch (this.currentProvider?.provider) {
        case 'azure':
          await this.stopAzureRecognition();
          break;
        case 'google':
          await this.stopGoogleRecognition();
          break;
        case 'aws':
          await this.stopAWSRecognition();
          break;
        case 'web':
          await this.stopWebRecognition();
          break;
      }

      this.isListening = false;

      // Log successful stop
      await this.auditor.logOperation({
        operation: 'speech_recognition_stop',
        provider: this.currentProvider?.provider || 'unknown',
        sessionId: this.sessionId,
        success: true,
      });

    } catch (error) {
      await this.auditor.logOperation({
        operation: 'speech_recognition_stop',
        provider: this.currentProvider?.provider || 'unknown',
        sessionId: this.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      });
      throw error;
    }
  }

  /**
   * Pause speech recognition
   */
  async pauseRecognition(): Promise<void> {
    if (!this.isListening) return;

    // Implementation depends on provider
    // For now, we'll just stop and remember state
    await this.stopRecognition();
  }

  /**
   * Resume speech recognition
   */
  async resumeRecognition(): Promise<void> {
    if (this.isListening || !this.currentProvider) return;

    await this.startRecognition(this.currentProvider);
  }

  /**
   * Register result callback
   */
  onResult(callback: (result: SpeechResult) => void): void {
    this.resultCallbacks.push(callback);
  }

  /**
   * Register error callback
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Check if speech recognition is supported
   */
  isSupported(): boolean {
    if (this.currentProvider?.provider === 'web') {
      return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }
    return true; // Cloud providers are assumed supported
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    // Return common medical documentation languages
    return [
      'en-US', // English (US)
      'en-GB', // English (UK)
      'es-ES', // Spanish (Spain)
      'fr-FR', // French (France)
      'de-DE', // German (Germany)
      'it-IT', // Italian (Italy)
      'pt-BR', // Portuguese (Brazil)
      'zh-CN', // Chinese (Mandarin)
      'ja-JP', // Japanese
      'ko-KR', // Korean
    ];
  }

  /**
   * Emit result to all callbacks with medical terminology correction
   */
  private emitResult(result: SpeechResult): void {
    let processedResult = { ...result };

    // Apply medical terminology correction if medical mode is enabled
    if (this.currentProvider?.medicalMode) {
      const correction = this.medicalTerminology.correctText(result.transcript);

      processedResult = {
        ...result,
        originalTranscript: result.transcript,
        transcript: correction.corrected,
        medicalTerms: correction.corrections.map(c => c.corrected),
        corrections: correction.corrections.map(c => `${c.original} → ${c.corrected}`),
      };
    }

    this.resultCallbacks.forEach(callback => {
      try {
        callback(processedResult);
      } catch (error) {
        console.error('Error in speech result callback:', error);
      }
    });
  }

  /**
   * Simple medical terminology correction
   */
  private correctMedicalTerminology(text: string): { corrected: string; corrections: any[] } {
    const medicalTerms: Record<string, string> = {
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
    };

    const words = text.split(/\s+/);
    const corrections: any[] = [];
    const correctedWords: string[] = [];

    for (const word of words) {
      const lowerWord = word.toLowerCase().trim();
      if (medicalTerms[lowerWord]) {
        corrections.push({
          original: word,
          corrected: medicalTerms[lowerWord],
          confidence: 1.0,
        });
        correctedWords.push(medicalTerms[lowerWord]);
      } else {
        correctedWords.push(word);
      }
    }

    return {
      corrected: correctedWords.join(' '),
      corrections,
    }
  }

  /**
   * Emit error to all callbacks
   */
  private emitError(error: Error): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.error('Error in speech error callback:', err);
      }
    });
  }

  /**
   * Azure Speech Recognition Implementation
   */
  private async startAzureRecognition(config: SpeechProviderConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('Azure API key is required');
    }

    try {
      // Azure Speech SDK integration would go here
      // For now, we'll simulate the implementation
      console.log('Starting Azure speech recognition with config:', config);

      // Simulate recognition start
      setTimeout(() => {
        this.emitResult({
          transcript: 'Azure speech recognition initialized',
          confidence: 0.95,
          isFinal: false,
          timestamp: new Date(),
          provider: 'azure',
        });
      }, 1000);

    } catch (error) {
      throw new Error(`Azure speech recognition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async stopAzureRecognition(): Promise<void> {
    console.log('Stopping Azure speech recognition');
  }

  /**
   * Google Speech Recognition Implementation
   */
  private async startGoogleRecognition(config: SpeechProviderConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('Google API key is required');
    }

    try {
      // Google Speech-to-Text API integration would go here
      console.log('Starting Google speech recognition with config:', config);

      // Simulate recognition start
      setTimeout(() => {
        this.emitResult({
          transcript: 'Google speech recognition initialized',
          confidence: 0.92,
          isFinal: false,
          timestamp: new Date(),
          provider: 'google',
        });
      }, 1000);

    } catch (error) {
      throw new Error(`Google speech recognition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async stopGoogleRecognition(): Promise<void> {
    console.log('Stopping Google speech recognition');
  }

  /**
   * AWS Speech Recognition Implementation
   */
  private async startAWSRecognition(config: SpeechProviderConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('AWS credentials are required');
    }

    try {
      // AWS Transcribe integration would go here
      console.log('Starting AWS speech recognition with config:', config);

      // Simulate recognition start
      setTimeout(() => {
        this.emitResult({
          transcript: 'AWS speech recognition initialized',
          confidence: 0.88,
          isFinal: false,
          timestamp: new Date(),
          provider: 'aws',
        });
      }, 1000);

    } catch (error) {
      throw new Error(`AWS speech recognition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async stopAWSRecognition(): Promise<void> {
    console.log('Stopping AWS speech recognition');
  }

  /**
   * Web Speech API Implementation (fallback)
   */
  private async startWebRecognition(config: SpeechProviderConfig): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Web Speech API is not supported in this browser');
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = config.language || 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;

        this.emitResult({
          transcript: this.sanitizer.sanitizeText(transcript),
          confidence: result[0].confidence,
          isFinal: result.isFinal,
          timestamp: new Date(),
          provider: 'web',
          medicalTerms: this.extractMedicalTerms(transcript),
        });
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        this.emitError(new Error(`Web Speech API error: ${event.error}`));
      };

      recognition.onend = () => {
        if (this.isListening) {
          // Restart if still supposed to be listening
          setTimeout(() => recognition.start(), 100);
        }
      };

      recognition.start();

    } catch (error) {
      throw new Error(`Web Speech API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async stopWebRecognition(): Promise<void> {
    // Web Speech API stops automatically when recognition ends
    console.log('Web Speech API recognition stopped');
  }

  /**
   * Extract medical terms from transcript (basic implementation)
   */
  private extractMedicalTerms(transcript: string): string[] {
    const medicalTerms = [
      'hypertension', 'diabetes', 'myocardial', 'infarction', 'pneumonia',
      'diagnosis', 'treatment', 'medication', 'surgery', 'therapy',
      'patient', 'symptoms', 'vitals', 'blood pressure', 'heart rate'
    ];

    const foundTerms: string[] = [];
    const lowerTranscript = transcript.toLowerCase();

    for (const term of medicalTerms) {
      if (lowerTranscript.includes(term)) {
        foundTerms.push(term);
      }
    }

    return foundTerms;
  }
}

// Global speech recognition instance
export const speechRecognitionManager = new SpeechRecognitionManager();

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}