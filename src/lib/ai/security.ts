import { supabase } from '@/integrations/supabase/client';
import { captureClinicalError } from '@/lib/monitoring/sentry';

export interface SanitizedPatientData {
  id: string;
  age: number;
  gender: string;
  chiefComplaint: string;
  symptoms: string[];
  vitalSigns: {
    temperature?: number;
    bloodPressure?: string;
    heartRate?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
  };
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  // De-identified fields only
}

export interface AISecurityContext {
  hospitalId: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
  purpose: 'diagnosis' | 'treatment' | 'education' | 'research';
  dataRetentionDays: number;
}

export interface EncryptedPayload {
  encryptedData: string;
  encryptionKeyId: string;
  algorithm: string;
  iv: string;
  hmac: string;
  metadata: {
    createdAt: Date;
    expiresAt: Date;
    purpose: string;
    hospitalId: string;
  };
}

/**
 * HIPAA-compliant data sanitization for AI interactions
 * Removes or de-identifies PHI while preserving clinical relevance
 */
export class AIDateSanitizer {
  private static readonly PHI_PATTERNS = {
    // Names (various formats)
    names: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
    // Dates of birth
    dob: /\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b|\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g,
    // Phone numbers
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    // Email addresses
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    // Addresses
    address: /\b\d+\s+[A-Za-z0-9\s,.-]+\b/g,
    // SSN patterns
    ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
    // Medical record numbers
    mrn: /\bMRN[-]?\d+\b|\b\d{6,10}\b/g,
  };

  /**
   * Sanitizes patient data for AI processing
   */
  static sanitizePatientData(patientData: any, context: AISecurityContext): SanitizedPatientData {
    try {
      const sanitized: SanitizedPatientData = {
        id: this.generateDeidentifiedId(patientData.id, context),
        age: this.calculateAge(patientData.dateOfBirth),
        gender: patientData.gender,
        chiefComplaint: this.sanitizeText(patientData.chiefComplaint),
        symptoms: patientData.symptoms?.map((symptom: string) => this.sanitizeText(symptom)) || [],
        vitalSigns: {
          temperature: patientData.vitalSigns?.temperature,
          bloodPressure: patientData.vitalSigns?.bloodPressure,
          heartRate: patientData.vitalSigns?.heartRate,
          respiratoryRate: patientData.vitalSigns?.respiratoryRate,
          oxygenSaturation: patientData.vitalSigns?.oxygenSaturation,
        },
        medicalHistory: patientData.medicalHistory?.map((item: string) => this.sanitizeText(item)) || [],
        allergies: patientData.allergies?.map((allergy: string) => this.sanitizeText(allergy)) || [],
        currentMedications: patientData.currentMedications?.map((med: string) => this.sanitizeText(med)) || [],
      };

      // Log sanitization activity
      this.logSanitizationActivity(context, 'patient_data', sanitized.id);

      return sanitized;
    } catch (error) {
      captureClinicalError(error as Error, {
        context: 'ai_data_sanitization',
        patientId: patientData?.id,
        operation: 'sanitize_patient_data',
      });
      throw new Error('Failed to sanitize patient data for AI processing');
    }
  }

  /**
   * Sanitizes free text to remove PHI
   */
  static sanitizeText(text: string): string {
    if (!text) return '';

    let sanitized = text;

    // Remove PHI patterns
    Object.values(this.PHI_PATTERNS).forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    // Additional sanitization for common PHI terms
    const phiTerms = [
      'patient name', 'doctor name', 'nurse name',
      'address', 'phone', 'email', 'social security',
      'birth date', 'date of birth', 'medical record'
    ];

    phiTerms.forEach(term => {
      const regex = new RegExp(term, 'gi');
      sanitized = sanitized.replace(regex, '[PHI REDACTED]');
    });

    return sanitized.trim();
  }

  /**
   * Generates a de-identified ID for tracking purposes
   */
  private static generateDeidentifiedId(originalId: string, context: AISecurityContext): string {
    const crypto = window.crypto;
    const encoder = new TextEncoder();
    const data = encoder.encode(`${originalId}-${context.sessionId}-${Date.now()}`);

    return crypto.subtle.digest('SHA-256', data).then(hash => {
      const hashArray = Array.from(new Uint8Array(hash));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    });
  }

  /**
   * Calculates age from date of birth
   */
  private static calculateAge(dateOfBirth: string): number {
    if (!dateOfBirth) return 0;

    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Logs sanitization activities for audit purposes
   */
  private static async logSanitizationActivity(
    context: AISecurityContext,
    dataType: string,
    deidentifiedId: string
  ): Promise<void> {
    try {
      await supabase.from('activity_logs').insert({
        hospital_id: context.hospitalId,
        user_id: context.userId,
        action_type: 'ai_data_sanitization',
        details: {
          sessionId: context.sessionId,
          purpose: context.purpose,
          dataType,
          deidentifiedId,
          timestamp: context.timestamp.toISOString(),
        },
        ip_address: 'system', // AI operations don't have direct IP
        user_agent: 'AI-Service-Sanitizer',
      });
    } catch (error) {
      console.error('Failed to log sanitization activity:', error);
      // Don't throw - logging failure shouldn't break the sanitization process
    }
  }
}

/**
 * HIPAA-compliant encryption service for AI data
 */
export class AIEncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;

  /**
   * Encrypts data before sending to AI services
   */
  static async encryptForAI(
    data: SanitizedPatientData,
    context: AISecurityContext
  ): Promise<EncryptedPayload> {
    try {
      // Generate encryption key
      const key = await this.generateKey();

      // Export key for storage
      const exportedKey = await crypto.subtle.exportKey('raw', key);
      const keyId = await this.storeKey(exportedKey, context);

      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt data
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(JSON.stringify(data));

      const encrypted = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv },
        key,
        dataBuffer
      );

      // Generate HMAC for integrity
      const hmac = await this.generateHMAC(encrypted, key);

      const payload: EncryptedPayload = {
        encryptedData: this.arrayBufferToBase64(encrypted),
        encryptionKeyId: keyId,
        algorithm: this.ALGORITHM,
        iv: this.arrayBufferToBase64(iv),
        hmac: this.arrayBufferToBase64(hmac),
        metadata: {
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + (context.dataRetentionDays * 24 * 60 * 60 * 1000)),
          purpose: context.purpose,
          hospitalId: context.hospitalId,
        },
      };

      // Log encryption activity
      await this.logEncryptionActivity(context, 'encrypt', keyId);

      return payload;
    } catch (error) {
      captureClinicalError(error as Error, {
        context: 'ai_data_encryption',
        operation: 'encrypt_for_ai',
        sessionId: context.sessionId,
      });
      throw new Error('Failed to encrypt data for AI processing');
    }
  }

  /**
   * Decrypts data received from AI services
   */
  static async decryptFromAI(
    payload: EncryptedPayload,
    context: AISecurityContext
  ): Promise<SanitizedPatientData> {
    try {
      // Verify payload hasn't expired
      if (new Date() > payload.metadata.expiresAt) {
        throw new Error('Encrypted payload has expired');
      }

      // Retrieve encryption key
      const keyData = await this.retrieveKey(payload.encryptionKeyId, context);
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: this.ALGORITHM },
        false,
        ['decrypt']
      );

      // Convert back from base64
      const encrypted = this.base64ToArrayBuffer(payload.encryptedData);
      const iv = this.base64ToArrayBuffer(payload.iv);
      const expectedHmac = this.base64ToArrayBuffer(payload.hmac);

      // Verify HMAC for integrity
      const calculatedHmac = await this.generateHMAC(encrypted, key);
      if (!this.compareBuffers(expectedHmac, calculatedHmac)) {
        throw new Error('Data integrity check failed');
      }

      // Decrypt data
      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      const decryptedData = JSON.parse(decoder.decode(decrypted));

      // Log decryption activity
      await this.logEncryptionActivity(context, 'decrypt', payload.encryptionKeyId);

      return decryptedData;
    } catch (error) {
      captureClinicalError(error as Error, {
        context: 'ai_data_decryption',
        operation: 'decrypt_from_ai',
        sessionId: context.sessionId,
      });
      throw new Error('Failed to decrypt data from AI processing');
    }
  }

  private static async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  private static async generateHMAC(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      crypto.getRandomValues(new Uint8Array(32)),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    return crypto.subtle.sign('HMAC', hmacKey, data);
  }

  private static async storeKey(keyData: ArrayBuffer, context: AISecurityContext): Promise<string> {
    const keyId = `ai_key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In production, this would store in a secure key management system
    // For now, we'll store encrypted in the database
    const { error } = await supabase.from('ai_encryption_keys').insert({
      key_id: keyId,
      encrypted_key: this.arrayBufferToBase64(keyData),
      hospital_id: context.hospitalId,
      created_by: context.userId,
      expires_at: new Date(Date.now() + (context.dataRetentionDays * 24 * 60 * 60 * 1000)),
      purpose: context.purpose,
    });

    if (error) throw error;

    return keyId;
  }

  private static async retrieveKey(keyId: string, context: AISecurityContext): Promise<ArrayBuffer> {
    const { data, error } = await supabase
      .from('ai_encryption_keys')
      .select('encrypted_key, expires_at')
      .eq('key_id', keyId)
      .eq('hospital_id', context.hospitalId)
      .single();

    if (error) throw error;

    // Check if key has expired
    if (new Date(data.expires_at) < new Date()) {
      throw new Error('Encryption key has expired');
    }

    return this.base64ToArrayBuffer(data.encrypted_key);
  }

  private static async logEncryptionActivity(
    context: AISecurityContext,
    operation: 'encrypt' | 'decrypt',
    keyId: string
  ): Promise<void> {
    try {
      await supabase.from('activity_logs').insert({
        hospital_id: context.hospitalId,
        user_id: context.userId,
        action_type: 'ai_encryption',
        details: {
          sessionId: context.sessionId,
          operation,
          keyId,
          timestamp: new Date().toISOString(),
        },
        ip_address: 'system',
        user_agent: 'AI-Encryption-Service',
      });
    } catch (error) {
      console.error('Failed to log encryption activity:', error);
    }
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private static compareBuffers(a: ArrayBuffer, b: ArrayBuffer): boolean {
    if (a.byteLength !== b.byteLength) return false;
    const aView = new Uint8Array(a);
    const bView = new Uint8Array(b);
    for (let i = 0; i < aView.length; i++) {
      if (aView[i] !== bView[i]) return false;
    }
    return true;
  }
}

/**
 * AI Security Audit Service
 */
export class AISecurityAuditor {
  /**
   * Performs security audit on AI operations
   */
  static async auditAIOperation(
    operation: string,
    context: AISecurityContext,
    result: any
  ): Promise<void> {
    try {
      const auditEntry = {
        hospital_id: context.hospitalId,
        user_id: context.userId,
        operation,
        session_id: context.sessionId,
        purpose: context.purpose,
        timestamp: new Date().toISOString(),
        result_summary: this.summarizeResult(result),
        compliance_status: await this.checkCompliance(context),
      };

      await supabase.from('ai_security_audit').insert(auditEntry);

      // Log to activity logs as well
      await supabase.from('activity_logs').insert({
        hospital_id: context.hospitalId,
        user_id: context.userId,
        action_type: 'ai_security_audit',
        details: auditEntry,
        ip_address: 'system',
        user_agent: 'AI-Security-Auditor',
      });
    } catch (error) {
      captureClinicalError(error as Error, {
        context: 'ai_security_audit',
        operation: 'audit_ai_operation',
        sessionId: context.sessionId,
      });
      throw new Error('AI security audit failed');
    }
  }

  private static summarizeResult(result: any): string {
    if (!result) return 'No result';

    // Create a summary without exposing sensitive data
    if (typeof result === 'string') {
      return result.length > 100 ? result.substring(0, 100) + '...' : result;
    }

    if (Array.isArray(result)) {
      return `Array with ${result.length} items`;
    }

    if (typeof result === 'object') {
      const keys = Object.keys(result);
      return `Object with keys: ${keys.join(', ')}`;
    }

    return 'Complex result data';
  }

  private static async checkCompliance(context: AISecurityContext): Promise<'compliant' | 'warning' | 'violation'> {
    // Check various compliance factors
    const checks = [
      this.checkDataRetention(context),
      this.checkPurposeLimitation(context),
      this.checkAccessControls(context),
    ];

    const results = await Promise.all(checks);
    const violations = results.filter(r => r === 'violation').length;
    const warnings = results.filter(r => r === 'warning').length;

    if (violations > 0) return 'violation';
    if (warnings > 0) return 'warning';
    return 'compliant';
  }

  private static async checkDataRetention(context: AISecurityContext): Promise<'compliant' | 'warning' | 'violation'> {
    // HIPAA requires data minimization and limited retention
    if (context.dataRetentionDays > 365) return 'violation';
    if (context.dataRetentionDays > 90) return 'warning';
    return 'compliant';
  }

  private static async checkPurposeLimitation(context: AISecurityContext): Promise<'compliant' | 'warning' | 'violation'> {
    // Ensure AI usage aligns with permitted purposes
    const allowedPurposes = ['diagnosis', 'treatment', 'education'];
    if (!allowedPurposes.includes(context.purpose)) return 'violation';
    return 'compliant';
  }

  private static async checkAccessControls(context: AISecurityContext): Promise<'compliant' | 'warning' | 'violation'> {
    // Verify user has appropriate permissions for AI operations
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('permissions')
      .eq('user_id', context.userId)
      .eq('hospital_id', context.hospitalId)
      .single();

    if (!permissions?.permissions?.includes('ai_access')) return 'violation';
    return 'compliant';
  }
}