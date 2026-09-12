import { describe, it, expect, vi } from 'vitest';
import {
  ClinicalDecisionSupportService,
  clinicalDecisionSupport,
} from '@/services/clinicalDecisionSupport';
import {
  HeadlessOrderSafetyEngine,
  InMemoryLocalDdiAdapter,
  MockRxNormAdapter,
  SpyAuditLoggerAdapter,
  CDSUnavailableFailClosedError,
} from '@/modules/order-safety';

describe('ClinicalDecisionSupportService - Deep Module Adapter Tests', () => {
  it('detects critical drug interactions via OrderSafetyEngine (e.g., Warfarin + Aspirin)', async () => {
    const interactions = await clinicalDecisionSupport.checkDrugInteractions([
      'Warfarin',
      'Aspirin',
    ]);

    expect(interactions.length).toBeGreaterThan(0);
    const bleedingHazard = interactions.find((i) =>
      i.description.toLowerCase().includes('bleeding')
    );
    expect(bleedingHazard).toBeDefined();
    expect(['severe', 'moderate']).toContain(bleedingHazard?.severity);
    expect(bleedingHazard?.recommendation).toContain('clinical override');
  });

  it('detects absolute contraindications as severe/hard-stop (e.g., Sildenafil + Nitroglycerin)', async () => {
    const interactions = await clinicalDecisionSupport.checkDrugInteractions([
      'Sildenafil',
      'Nitroglycerin',
    ]);

    expect(interactions.length).toBeGreaterThan(0);
    const lethalHazard = interactions.find((i) =>
      i.description.toLowerCase().includes('hypotension')
    );
    expect(lethalHazard).toBeDefined();
    expect(lethalHazard?.severity).toBe('severe');
    expect(lethalHazard?.recommendation).toContain('contraindication');
  });

  it('returns empty array when no medications are provided', async () => {
    const interactions = await clinicalDecisionSupport.checkDrugInteractions([]);
    expect(interactions).toEqual([]);
  });

  it('enforces Fail-Closed CDS when the underlying engine raises an error', async () => {
    const brokenEngine = new HeadlessOrderSafetyEngine({
      localDdiRepo: new InMemoryLocalDdiAdapter(),
      rxNormPort: new MockRxNormAdapter(),
      auditLogger: new SpyAuditLoggerAdapter(),
    });

    vi.spyOn(brokenEngine, 'evaluate').mockRejectedValue(
      new CDSUnavailableFailClosedError('Database connection dropped')
    );

    const service = new ClinicalDecisionSupportService({ engine: brokenEngine });
    const interactions = await service.checkDrugInteractions(['Amoxicillin']);

    expect(interactions.length).toBe(1);
    expect(interactions[0].severity).toBe('severe');
    expect(interactions[0].description).toContain('Clinical Decision Support engine unavailable');
    expect(interactions[0].recommendation).toContain('Fail-closed CDS policy enforced');
  });

  it('suggests diagnoses based on symptoms and vitals', async () => {
    const res = await clinicalDecisionSupport.suggestDiagnosis(['fever', 'cough']);
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].icd10Code).toBe('J06.9');
    expect(res[0].name).toBe('Upper Respiratory Infection');
  });

  it('returns guideline recommendations for known conditions', async () => {
    const hypertensionProtocols =
      await clinicalDecisionSupport.getProtocolRecommendations('hypertension');
    expect(hypertensionProtocols).toContain('Lifestyle modifications counseling');

    const unknownProtocols =
      await clinicalDecisionSupport.getProtocolRecommendations('unknown_disease');
    expect(unknownProtocols).toEqual(['Follow standard clinical guidelines']);
  });

  it('checks guideline compliance properly', async () => {
    const valid = await clinicalDecisionSupport.checkGuidelineCompliance({
      dosage: '500mg',
      duration: '7 days',
    });
    expect(valid.compliant).toBe(true);
    expect(valid.issues).toHaveLength(0);

    const invalid = await clinicalDecisionSupport.checkGuidelineCompliance({});
    expect(invalid.compliant).toBe(false);
    expect(invalid.issues).toContain('Dosage not specified');
    expect(invalid.issues).toContain('Treatment duration not specified');
  });
});
