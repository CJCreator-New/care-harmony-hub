import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  decryptRecordFields,
  fieldEncryption,
  mergeEncryptionMetadata,
  type EncryptedData,
} from '@/utils/dataProtection';

const meta = (tag: string): EncryptedData => ({ encrypted: `ct-${tag}`, iv: `iv-${tag}`, keyVersion: 'v1' });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('decryptRecordFields (CLIN-05)', () => {
  it('decrypts with the record as the authorisation resource, so the chief complaint is readable', async () => {
    const spy = vi
      .spyOn(fieldEncryption, 'decryptFields')
      .mockResolvedValue(['Chest pain for two hours']);
    const record = {
      id: 'consult-1',
      chief_complaint: '__ENCRYPTED__v1',
      encryption_metadata: { chief_complaint: meta('cc') },
    };

    const out = await decryptRecordFields(record, { resourceType: 'consultations', resourceId: 'consult-1' });

    expect(out.chief_complaint).toBe('Chest pain for two hours');
    expect(spy).toHaveBeenCalledWith([meta('cc')], { resourceType: 'consultations', resourceId: 'consult-1' });
  });

  it('shows a clear placeholder, not the storage token, when decryption is refused', async () => {
    vi.spyOn(fieldEncryption, 'decryptFields').mockRejectedValue(new Error('Forbidden'));
    const out = await decryptRecordFields(
      { id: 'rx-item-1', medication_name: '__ENCRYPTED__v1', encryption_metadata: { medication_name: meta('m') } },
      { resourceType: 'prescription_items', resourceId: 'rx-item-1' }
    );
    expect(out.medication_name).toBe('[Encrypted]');
  });

  it('returns the record unchanged when there is no encryption metadata', async () => {
    const spy = vi.spyOn(fieldEncryption, 'decryptFields');
    const record = { id: 'c-2', chief_complaint: 'plain' };
    const out = await decryptRecordFields(record, { resourceType: 'consultations', resourceId: 'c-2' });
    expect(out).toEqual(record);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('mergeEncryptionMetadata (CLIN-05)', () => {
  it('keeps the ciphertext of other fields when an addendum writes only clinical_notes', () => {
    const existing = { chief_complaint: meta('cc'), treatment_plan: meta('tp') };
    const merged = mergeEncryptionMetadata(existing, { clinical_notes: meta('cn') });
    expect(Object.keys(merged).sort()).toEqual(['chief_complaint', 'clinical_notes', 'treatment_plan']);
    expect(merged.chief_complaint).toEqual(meta('cc'));
  });

  it('treats missing existing metadata as empty', () => {
    expect(mergeEncryptionMetadata(null, { clinical_notes: meta('cn') })).toEqual({ clinical_notes: meta('cn') });
  });
});
