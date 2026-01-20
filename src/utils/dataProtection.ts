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

// Encryption key management
class EncryptionKeyManager {
  private static instance: EncryptionKeyManager;
  private keys: Map<string, CryptoKey> = new Map();
  private initialized = false;

  private constructor() {
    // Initialize asynchronously
    this.initializeDefaultKey();
  }

  static getInstance(): EncryptionKeyManager {
    if (!EncryptionKeyManager.instance) {
      EncryptionKeyManager.instance = new EncryptionKeyManager();
    }
    return EncryptionKeyManager.instance;
  }

  async getKey(version: string = 'v1'): Promise<CryptoKey> {
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initializeDefaultKey();
    }

    const key = this.keys.get(version);
    if (!key) {
      throw new Error(`Encryption key version ${version} not found`);
    }
    return key;
  }

  async rotateKey(): Promise<string> {
    const newVersion = `v${Date.now()}`;
    const newKey = await this.generateKey();
    this.keys.set(newVersion, newKey);
    return newVersion;
  }

  private async initializeDefaultKey(): Promise<void> {
    if (this.initialized) return;

    try {
      const encryptionKey = import.meta.env.VITE_ENCRYPTION_KEY || 'default-dev-key-change-in-production';
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(encryptionKey),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode('care-sync-salt'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      this.keys.set('v1', key);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize encryption key:', error);
      throw error;
    }
  }

  private async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }
}

// Field-level encryption service
export class FieldEncryptionService {
  private keyManager: EncryptionKeyManager;

  constructor() {
    this.keyManager = EncryptionKeyManager.getInstance();
  }

  /**
   * Encrypt sensitive field data
   */
  async encryptField(value: string, keyVersion?: string): Promise<EncryptedData> {
    if (!value) return { encrypted: '', iv: '', keyVersion: keyVersion || 'v1' };

    try {
      const key = await this.keyManager.getKey(keyVersion);
      const iv = this.generateIV();

      const encodedValue = new TextEncoder().encode(value);
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedValue
      );

      return {
        encrypted: this.arrayBufferToBase64(encrypted),
        iv: this.arrayBufferToBase64(iv),
        keyVersion: keyVersion || 'v1'
      };
    } catch (error) {
      console.error('Field encryption failed:', error);
      throw new Error('Failed to encrypt field data');
    }
  }

  /**
   * Decrypt sensitive field data
   */
  async decryptField(encryptedData: EncryptedData): Promise<string> {
    if (!encryptedData.encrypted) return '';

    try {
      const key = await this.keyManager.getKey(encryptedData.keyVersion);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      const encrypted = this.base64ToArrayBuffer(encryptedData.encrypted);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Field decryption failed:', error);
      throw new Error('Failed to decrypt field data');
    }
  }

  /**
   * Generate initialization vector
   */
  private generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(12)); // 96 bits for GCM
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
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
      pattern: /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
      maskFunction: (value: string) => value.replace(/(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3})[-.\s]?([0-9]{4})/, '$1-XXXX')
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

    for (const field of sensitiveFields) {
      if (transmissionData[field]) {
        const encrypted = await this.encryptionService.encryptField(String(transmissionData[field]));
        encryptionMetadata[field] = encrypted;
        transmissionData[field] = `__ENCRYPTED__${encrypted.keyVersion}`;
      }
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

    for (const [field, encrypted] of Object.entries(encryptionMetadata)) {
      if (restored[field]?.startsWith('__ENCRYPTED__')) {
        restored[field] = await this.encryptionService.decryptField(encrypted);
      }
    }

    return restored;
  }
}

// Singleton instances
export const fieldEncryption = new FieldEncryptionService();
export const dataMasking = new DataMaskingService();
export const secureTransmission = new SecureTransmissionService();
export const keyManager = EncryptionKeyManager.getInstance();