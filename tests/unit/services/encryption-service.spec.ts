import { describe, it, expect } from 'vitest'
import { encryptField, decryptField } from '@/services/encryption-service'

describe('encryption-service facade', () => {
  it('encrypts and decrypts a value', async () => {
    const original = 'sensitive-value-123'
    const encrypted = await encryptField(original)
    expect(encrypted).toHaveProperty('encrypted')
    expect(encrypted).toHaveProperty('iv')
    expect(encrypted).toHaveProperty('keyVersion')

    const decrypted = await decryptField(encrypted)
    expect(decrypted).toBe(original)
  })
})
