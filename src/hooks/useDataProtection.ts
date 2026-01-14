import { useState, useCallback } from 'react';
import { fieldEncryption, dataMasking, secureTransmission, type EncryptedData } from '@/utils/dataProtection';

// Hook for field-level encryption
export function useFieldEncryption() {
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const encryptField = useCallback(async (value: string, keyVersion?: string): Promise<EncryptedData> => {
    setIsEncrypting(true);
    try {
      return await fieldEncryption.encryptField(value, keyVersion);
    } finally {
      setIsEncrypting(false);
    }
  }, []);

  const decryptField = useCallback(async (encryptedData: EncryptedData): Promise<string> => {
    setIsDecrypting(true);
    try {
      return await fieldEncryption.decryptField(encryptedData);
    } finally {
      setIsDecrypting(false);
    }
  }, []);

  return {
    encryptField,
    decryptField,
    isEncrypting,
    isDecrypting
  };
}

// Hook for data masking
export function useDataMasking() {
  const maskData = useCallback((data: Record<string, any>, fieldsToMask?: string[]) => {
    return dataMasking.maskData(data, fieldsToMask);
  }, []);

  const containsSensitiveData = useCallback((data: Record<string, any>) => {
    return dataMasking.containsSensitiveData(data);
  }, []);

  return {
    maskData,
    containsSensitiveData
  };
}

// Hook for secure transmission
export function useSecureTransmission() {
  const prepareForTransmission = useCallback((data: Record<string, any>, sensitiveFields: string[]) => {
    return secureTransmission.prepareForTransmission(data, sensitiveFields);
  }, []);

  const restoreFromTransmission = useCallback((data: Record<string, any>, encryptionMetadata: Record<string, EncryptedData>) => {
    return secureTransmission.restoreFromTransmission(data, encryptionMetadata);
  }, []);

  return {
    prepareForTransmission,
    restoreFromTransmission
  };
}

// Hook for HIPAA-compliant data handling
export function useHIPAACompliance() {
  const { encryptField, decryptField, isEncrypting, isDecrypting } = useFieldEncryption();
  const { maskData, containsSensitiveData } = useDataMasking();
  const { prepareForTransmission, restoreFromTransmission } = useSecureTransmission();

  // PHI fields that require encryption
  const phiFields = [
    'ssn',
    'medical_record_number',
    'insurance_id',
    'date_of_birth',
    'address',
    'phone',
    'email',
    'emergency_contact',
    'medical_history',
    'medications',
    'allergies',
    'diagnosis_codes',
    'treatment_notes'
  ];

  // Fields to mask in logs/displays
  const maskFields = [
    'ssn',
    'medical_record_number',
    'insurance_id',
    'phone',
    'email'
  ];

  const encryptPHI = useCallback(async (data: Record<string, any>) => {
    const encryptedData = { ...data };
    const encryptionMetadata: Record<string, EncryptedData> = {};

    for (const field of phiFields) {
      if (encryptedData[field]) {
        const encrypted = await encryptField(String(encryptedData[field]));
        encryptionMetadata[field] = encrypted;
        encryptedData[field] = `__ENCRYPTED__${encrypted.keyVersion}`;
      }
    }

    return { data: encryptedData, metadata: encryptionMetadata };
  }, [encryptField]);

  const decryptPHI = useCallback(async (
    data: Record<string, any>,
    encryptionMetadata: Record<string, EncryptedData>
  ) => {
    const decryptedData = { ...data };

    for (const [field, encrypted] of Object.entries(encryptionMetadata)) {
      if (decryptedData[field]?.startsWith('__ENCRYPTED__')) {
        decryptedData[field] = await decryptField(encrypted);
      }
    }

    return decryptedData;
  }, [decryptField]);

  const prepareSecureLog = useCallback((data: Record<string, any>) => {
    return maskData(data, maskFields);
  }, [maskData]);

  const validateCompliance = useCallback((data: Record<string, any>) => {
    const issues: string[] = [];

    // Check if sensitive data is properly encrypted
    if (containsSensitiveData(data)) {
      issues.push('Sensitive data detected in unencrypted form');
    }

    // Check for required encryption markers
    phiFields.forEach(field => {
      if (data[field] && !String(data[field]).startsWith('__ENCRYPTED__')) {
        issues.push(`PHI field '${field}' is not encrypted`);
      }
    });

    return {
      isCompliant: issues.length === 0,
      issues
    };
  }, [containsSensitiveData]);

  return {
    // Encryption operations
    encryptPHI,
    decryptPHI,
    isEncrypting,
    isDecrypting,

    // Data masking
    prepareSecureLog,

    // Transmission security
    prepareForTransmission,
    restoreFromTransmission,

    // Compliance validation
    validateCompliance,

    // Field definitions
    phiFields,
    maskFields
  };
}