import type { StoredRecord } from '../types';

const AAD_PREFIX = 'caresync-offline:v1:';
const IV_BYTES = 12;

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) {
    throw new Error('WebCrypto (crypto.subtle) is unavailable; offline storage is disabled');
  }
  return s;
}

export function randomId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** A fresh, NON-extractable AES-GCM-256 key for one signed-in session. */
export function generateSessionKey(): Promise<CryptoKey> {
  return subtle().generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]) as Promise<CryptoKey>;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await subtle().digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypts a JSON-serialisable value. The record id is bound as AES-GCM
 * additional data, so a ciphertext cannot be swapped into another slot.
 */
export async function encryptRecord(key: CryptoKey, id: string, value: unknown): Promise<StoredRecord> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await subtle().encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(AAD_PREFIX + id) },
    key,
    plaintext,
  );
  return { id, iv, ciphertext };
}

/** Decrypts a record; throws if the key is wrong or the record was tampered with. */
export async function decryptRecord<T>(key: CryptoKey, record: StoredRecord): Promise<T> {
  const plaintext = await subtle().decrypt(
    {
      name: 'AES-GCM',
      iv: record.iv,
      additionalData: new TextEncoder().encode(AAD_PREFIX + record.id),
    },
    key,
    record.ciphertext,
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
