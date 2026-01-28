import crypto from 'crypto';
import { config } from '../config/environment';
import { logger } from './logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export async function encryptData(plainText: string): Promise<string> {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(config.ENCRYPTION_KEY, 'hex');

    const cipher = crypto.createCipher(ALGORITHM, key);
    cipher.setAAD(Buffer.from('patient-data'));

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

export async function decryptData(encryptedText: string): Promise<string> {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');
    const key = Buffer.from(config.ENCRYPTION_KEY, 'hex');

    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAAD(Buffer.from('patient-data'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error({ msg: 'Decryption failed', error });
    throw new Error('Failed to decrypt data');
  }
}

export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Generate a secure random token
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Verify data integrity using HMAC
export function createHMAC(data: string, key?: string): string {
  const hmacKey = key || config.ENCRYPTION_KEY;
  return crypto.createHmac('sha256', hmacKey).update(data).digest('hex');
}

export function verifyHMAC(data: string, hmac: string, key?: string): boolean {
  const hmacKey = key || config.ENCRYPTION_KEY;
  const computedHMAC = crypto.createHmac('sha256', hmacKey).update(data).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(computedHMAC, 'hex'));
}