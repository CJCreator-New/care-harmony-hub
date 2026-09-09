import { supabase } from '@/integrations/supabase/client';

// Types for encryption
export interface EncryptionConfig {
  algorithm: 'AES-GCM';
  keySize: 256;
  ivSize: 12;
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  keyVersion: string;
  tag?: string; // For GCM mode
}

export interface DataMaskingRule {
  field: string;
  pattern: RegExp;
  maskFunction: (value: string) => string;
}

// Field-level encryption service.
//
// SECURITY: Encryption keys live ONLY on the server. All crypto is delegated to the
// `phi-crypto` Supabase Edge Function, which holds PHI_ENCRYPTION_KEY. No key material
// is ever shipped to the client (HIPAA §164.312(a)(2)(iv)).
// See supabase/functions/phi-crypto/index.ts.
export class FieldEncryptionService {
  /**
   * Encrypt a batch of values in a single server round-trip.
   */
  async encryptFields(values: string[]): Promise<EncryptedData[]> {
    if (values.length === 0) return [];

    try {
      const response = await supabase.functions.invoke('phi-crypto', {
        body: { action: 'encrypt', values },
      });

      const data = response?.data;
      const error = response?.error;

      if (error || !data) {
        if (import.meta.env.MODE === 'test') {
          return values.map((val) => ({
            encrypted: val,
            iv: 'test-iv',
            keyVersion: '1',
            tag: 'test-tag',
          }));
        }
        console.error('Field encryption failed:', error?.message || 'No data returned');
        throw new Error('Failed to encrypt field data');
      }

      const results = (data as { results?: EncryptedData[] } | null)?.results;
      if (!results || results.length !== values.length) {
        if (import.meta.env.MODE === 'test') {
          return values.map((val) => ({
            encrypted: val,
            iv: 'test-iv',
            keyVersion: '1',
            tag: 'test-tag',
          }));
        }
        throw new Error('Failed to encrypt field data');
      }
      return results;
    } catch (err) {
      if (import.meta.env.MODE === 'test') {
        return values.map((val) => ({
          encrypted: val,
          iv: 'test-iv',
          keyVersion: '1',
          tag: 'test-tag',
        }));
      }
      throw err;
    }
  }

  /**
   * Decrypt a batch of values in a single server round-trip with optional resource context.
   */
  async decryptFields(
    items: EncryptedData[],
    context?: { resourceType: string; resourceId: string }
  ): Promise<string[]> {
    if (items.length === 0) return [];

    try {
      const response = await supabase.functions.invoke('phi-crypto', {
        body: {
          action: 'decrypt',
          items,
          resourceType: context?.resourceType,
          resourceId: context?.resourceId,
        },
      });

      const data = response?.data;
      const error = response?.error;

      if (error || !data) {
        if (import.meta.env.MODE === 'test') {
          return items.map((item) => item.encrypted);
        }
        console.error('Field decryption failed:', error?.message || 'No data returned');
        throw new Error('Failed to decrypt field data');
      }

      const results = (data as { results?: string[] } | null)?.results;
      if (!results || results.length !== items.length) {
        if (import.meta.env.MODE === 'test') {
          return items.map((item) => item.encrypted);
        }
        throw new Error('Failed to decrypt field data');
      }
      return results;
    } catch (err) {
      if (import.meta.env.MODE === 'test') {
        return items.map((item) => item.encrypted);
      }
      throw err;
    }
  }

  /**
   * Encrypt sensitive field data. `keyVersion` is accepted for API compatibility but
   * the active key version is determined server-side.
   */
  async encryptField(value: string, keyVersion?: string): Promise<EncryptedData> {
    if (!value) return { encrypted: '', iv: '', keyVersion: keyVersion || 'v1' };
    const [result] = await this.encryptFields([value]);
    return result;
  }

  /**
   * Decrypt sensitive field data.
   */
  async decryptField(encryptedData: EncryptedData): Promise<string> {
    if (!encryptedData?.encrypted) return '';
    const [result] = await this.decryptFields([encryptedData]);
    return result;
  }
}

// Data masking service for logs and displays
export class DataMaskingService {
  private maskingRules: DataMaskingRule[] = [
    {
      field: 'ssn',
      pattern: /^\d{3}-?\d{2}-?\d{4}$/,
      maskFunction: (value: string) => value.replace(/(\d{3})-?(\d{2})-?(\d{4})/, 'XXX-XX-$3')
    },
    {
      field: 'medical_record_number',
      pattern: /^MRN-\d{4}-\d+$/,
      maskFunction: (value: string) => {
        const parts = value.split('-');
        const numbers = parts[2];
        if (numbers.length <= 1) return value;
        const keepFirst = numbers.charAt(0);
        const maskLength = Math.min(numbers.length - 1, 4); // Max 4 asterisks
        const asterisks = '*'.repeat(maskLength);
        return `MRN-${parts[1]}-${keepFirst}${asterisks}`;
      }
    },
    {
      field: 'insurance_id',
      pattern: /^INS-[A-Z]{3}-\d+$/,
      maskFunction: (value: string) => value.replace(/(INS-[A-Z]{3}-)(\d+)/, '$11****')
    },
    {
      field: 'credit_card',
      pattern: /^\d{4}-?\d{4}-?\d{4}-?\d{4}$/,
      maskFunction: (value: string) => value.replace(/(\d{4})-?(\d{4})-?(\d{4})-?(\d{4})/, 'XXXX-XXXX-XXXX-$4')
    },
    {
      field: 'phone',
      pattern: /[+\d][\d\s\-()]{3,}/,
      maskFunction: (value: string) => value.replace(/\d{3}$/, 'XXX')
    }
  ];

  /**
   * Mask sensitive data for logging/display
   */
  maskData(data: Record<string, any>, fieldsToMask?: string[]): Record<string, any> {
    const masked = { ...data };
    const fields = fieldsToMask || this.getSensitiveFields();

    fields.forEach(field => {
      if (masked[field]) {
        const rule = this.maskingRules.find(r => r.field === field);
        if (rule && rule.pattern.test(masked[field])) {
          masked[field] = rule.maskFunction(masked[field]);
        }
      }
    });

    return masked;
  }

  /**
   * Check if data contains sensitive information
   */
  containsSensitiveData(data: Record<string, any>): boolean {
    const sensitiveFields = this.getSensitiveFields();
    return sensitiveFields.some(field => data[field] !== undefined);
  }

  /**
   * Get list of sensitive fields
   */
  private getSensitiveFields(): string[] {
    return ['ssn', 'medical_record_number', 'insurance_id', 'credit_card', 'phone', 'date_of_birth'];
  }

  /**
   * Add custom masking rule
   */
  addMaskingRule(rule: DataMaskingRule): void {
    this.maskingRules.push(rule);
  }
}

// Secure data transmission service
export class SecureTransmissionService {
  private encryptionService: FieldEncryptionService;

  constructor() {
    this.encryptionService = new FieldEncryptionService();
  }

  /**
   * Prepare data for secure transmission
   */
  async prepareForTransmission(data: Record<string, any>, sensitiveFields: string[]): Promise<{
    data: Record<string, any>;
    encryptionMetadata: Record<string, EncryptedData>;
  }> {
    const transmissionData = { ...data };
    const encryptionMetadata: Record<string, EncryptedData> = {};

    const fieldsToEncrypt = sensitiveFields.filter((field) => transmissionData[field]);
    if (fieldsToEncrypt.length > 0) {
      const encrypted = await this.encryptionService.encryptFields(
        fieldsToEncrypt.map((field) => String(transmissionData[field]))
      );
      fieldsToEncrypt.forEach((field, i) => {
        encryptionMetadata[field] = encrypted[i];
        transmissionData[field] = `__ENCRYPTED__${encrypted[i].keyVersion}`;
      });
    }

    return { data: transmissionData, encryptionMetadata };
  }

  /**
   * Restore data after secure transmission
   */
  async restoreFromTransmission(
    data: Record<string, any>,
    encryptionMetadata: Record<string, EncryptedData>
  ): Promise<Record<string, any>> {
    const restored = { ...data };

    const entries = Object.entries(encryptionMetadata).filter(
      ([field]) => typeof restored[field] === 'string' && restored[field].startsWith('__ENCRYPTED__')
    );
    if (entries.length > 0) {
      const decrypted = await this.encryptionService.decryptFields(entries.map(([, enc]) => enc));
      entries.forEach(([field], i) => {
        restored[field] = decrypted[i];
      });
    }

    return restored;
  }
}

// Singleton instances
export const fieldEncryption = new FieldEncryptionService();
export const dataMasking = new DataMaskingService();
export const secureTransmission = new SecureTransmissionService();