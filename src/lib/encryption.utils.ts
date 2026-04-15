/**
 * End-to-End Encryption for Telehealth
 * Uses AES-256-GCM for message & recording encryption
 */

export interface EncryptedData {
  cipher: string;
  iv: string;
  authTag: string;
  algorithm: string;
}

/**
 * Generate encryption key
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt message with AES-256-GCM
 */
export async function encryptMessage(
  plaintext: string,
  key: CryptoKey
): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  // Extract authentication tag (last 16 bytes)
  const result = new Uint8Array(encrypted);
  const ciphertext = result.slice(0, result.length - 16);
  const authTag = result.slice(result.length - 16);

  return {
    cipher: btoa(String.fromCharCode(...ciphertext)),
    iv: btoa(String.fromCharCode(...iv)),
    authTag: btoa(String.fromCharCode(...authTag)),
    algorithm: "AES-256-GCM",
  };
}

/**
 * Decrypt message with AES-256-GCM
 */
export async function decryptMessage(
  encrypted: EncryptedData,
  key: CryptoKey
): Promise<string> {
  const ciphertext = Uint8Array.from(atob(encrypted.cipher), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));
  const authTag = Uint8Array.from(atob(encrypted.authTag), c => c.charCodeAt(0));

  // Combine ciphertext and auth tag
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    combined
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt file for storage
 */
export async function encryptFile(
  fileData: ArrayBuffer,
  key: CryptoKey
): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    fileData
  );

  const result = new Uint8Array(encrypted);
  const ciphertext = result.slice(0, result.length - 16);
  const authTag = result.slice(result.length - 16);

  return {
    cipher: btoa(String.fromCharCode(...ciphertext)),
    iv: btoa(String.fromCharCode(...iv)),
    authTag: btoa(String.fromCharCode(...authTag)),
    algorithm: "AES-256-GCM",
  };
}

/**
 * Decrypt file from storage
 */
export async function decryptFile(
  encrypted: EncryptedData,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const ciphertext = Uint8Array.from(atob(encrypted.cipher), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));
  const authTag = Uint8Array.from(atob(encrypted.authTag), c => c.charCodeAt(0));

  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  return await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    combined
  );
}

/**
 * Derive key from password for recovery
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, hash: "SHA-256", iterations: 100000 },
    baseKey,
    256
  );

  return await crypto.subtle.importKey(
    "raw",
    derivedBits,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}

export default {
  generateEncryptionKey,
  encryptMessage,
  decryptMessage,
  encryptFile,
  decryptFile,
  deriveKeyFromPassword,
};
