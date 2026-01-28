import crypto from 'crypto';
import { config } from '../config/environment';
import { logger } from './logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export async function encryptData(plainText: string): Promise<string> {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(config.ENCRYPTION_KEY, 'hex');

    const cipher = (crypto as any).createCipherGCM(ALGORITHM, key);
    cipher.setAAD(Buffer.from('clinical-data'));

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV, encrypted data, and auth tag
    const result = iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');

    return result;
  } catch (error) {
    logger.error({ msg: 'Encryption failed', error });
    throw new Error('Failed to encrypt data');
  }
}

export async function decryptData(encryptedData: string): Promise<string> {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0]!, 'hex');
    const encrypted = parts[1]!;
    const authTag = Buffer.from(parts[2]!, 'hex');
    const key = Buffer.from(config.ENCRYPTION_KEY, 'hex');

    const decipher = (crypto as any).createDecipherGCM(ALGORITHM, key);
    decipher.setAAD(Buffer.from('clinical-data'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error({ msg: 'Decryption failed', error });
    throw new Error('Failed to decrypt data');
  }
}

// Utility function for HIPAA-compliant data handling
export async function encryptSensitiveData(data: any): Promise<any> {
  const sensitiveFields = [
    'chief_complaint', 'history_of_present_illness', 'physical_examination',
    'assessment', 'plan', 'progress_notes', 'clinical_notes'
  ];

  const encrypted = { ...data };

  for (const field of sensitiveFields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = await encryptData(encrypted[field]);
    }
  }

  return encrypted;
}

export async function decryptSensitiveData(data: any): Promise<any> {
  const sensitiveFields = [
    'chief_complaint', 'history_of_present_illness', 'physical_examination',
    'assessment', 'plan', 'progress_notes', 'clinical_notes'
  ];

  const decrypted = { ...data };

  for (const field of sensitiveFields) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      try {
        decrypted[field] = await decryptData(decrypted[field]);
      } catch (error) {
        // If decryption fails, keep the original (might already be decrypted)
        logger.warn({ msg: 'Failed to decrypt field, keeping original', field });
      }
    }
  }

  return decrypted;
}