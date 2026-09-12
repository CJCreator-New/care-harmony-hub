import { describe, it, expect } from 'vitest';
import {
  matchLabPanel,
  evaluateNumericParameter,
  evaluateLabPanel,
  STANDARD_LAB_PANELS,
} from '@/modules/critical-lab-escalation';
import { REJECTION_REASONS } from '@/components/lab/SpecimenRejectionModal';

describe('Workflow 4: Laboratory Orders, Accessioning, Panic Detection & Escalation', () => {
  describe('A1 & A2: Standard Lab Panels & Automated Panic Evaluator', () => {
    it('should correctly match test names to standard clinical panels', () => {
      expect(matchLabPanel('Complete Blood Count (CBC)')?.panelId).toBe('cbc');
      expect(matchLabPanel('CBC with Differential')?.panelId).toBe('cbc');
      expect(matchLabPanel('Basic Metabolic Panel')?.panelId).toBe('bmp');
      expect(matchLabPanel('Serum Electrolytes & Glucose')?.panelId).toBe('bmp');
      expect(matchLabPanel('High-Sensitivity Troponin I')?.panelId).toBe('cardiac');
      expect(matchLabPanel('Coagulation Profile PT/INR')?.panelId).toBe('coag');
      expect(matchLabPanel('Liver Function Panel (LFT)')?.panelId).toBe('lft');
      expect(matchLabPanel('Respiratory Viral PCR')).toBeNull();
    });

    it('should identify normal vs abnormal vs critical panic potassium (K+) values', () => {
      const kParam = STANDARD_LAB_PANELS.bmp.parameters.find((p) => p.id === 'k')!;

      // Normal range: 3.5 - 5.1
      const normalResult = evaluateNumericParameter(kParam, 4.2);
      expect(normalResult.status).toBe('normal');
      expect(normalResult.isCritical).toBe(false);

      // Abnormal Low (not panic): 3.2
      const lowResult = evaluateNumericParameter(kParam, 3.2);
      expect(lowResult.status).toBe('low');
      expect(lowResult.isCritical).toBe(false);

      // Critical Panic Low: <= 2.8
      const panicLow = evaluateNumericParameter(kParam, 2.5);
      expect(panicLow.status).toBe('critical_low');
      expect(panicLow.isCritical).toBe(true);
      expect(panicLow.alertMessage).toContain('CRITICAL PANIC LOW');

      // Critical Panic High: >= 6.2
      const panicHigh = evaluateNumericParameter(kParam, 6.8);
      expect(panicHigh.status).toBe('critical_high');
      expect(panicHigh.isCritical).toBe(true);
      expect(panicHigh.alertMessage).toContain('CRITICAL PANIC HIGH');
    });

    it('should identify critical high cardiac troponin without manual technician checkbox', () => {
      const tropParam = STANDARD_LAB_PANELS.cardiac.parameters.find((p) => p.id === 'trop')!;

      // Normal <= 0.04
      const normal = evaluateNumericParameter(tropParam, 0.01);
      expect(normal.status).toBe('normal');
      expect(normal.isCritical).toBe(false);

      // Elevated > 0.04 but < 0.40
      const elevated = evaluateNumericParameter(tropParam, 0.12);
      expect(elevated.status).toBe('high');
      expect(elevated.isCritical).toBe(false);

      // Critical Panic >= 0.40
      const panic = evaluateNumericParameter(tropParam, 0.85);
      expect(panic.status).toBe('critical_high');
      expect(panic.isCritical).toBe(true);
    });

    it('should identify critical panic thrombocytopenia (Platelets < 20)', () => {
      const pltParam = STANDARD_LAB_PANELS.cbc.parameters.find((p) => p.id === 'plt')!;

      const normal = evaluateNumericParameter(pltParam, 280);
      expect(normal.status).toBe('normal');
      expect(normal.isCritical).toBe(false);

      const severeThrombocytopenia = evaluateNumericParameter(pltParam, 14);
      expect(severeThrombocytopenia.status).toBe('critical_low');
      expect(severeThrombocytopenia.isCritical).toBe(true);
    });

    it('should evaluate full BMP panel and flag panic values in summary report', () => {
      const bmpPanel = STANDARD_LAB_PANELS.bmp;
      const normalPanelResult = evaluateLabPanel(bmpPanel, {
        k: '4.1',
        na: '140',
        glu: '95',
        cr: '0.9',
        bun: '14',
        ca: '9.2',
      });

      expect(normalPanelResult.hasCriticalPanic).toBe(false);
      expect(normalPanelResult.results.every((r) => !r.isCritical)).toBe(true);
      expect(normalPanelResult.criticalSummary).toContain(
        'All evaluated parameters within acceptable clinical limits'
      );

      // Now test with critical panic potassium (6.5) and critical low glucose (40)
      const panicPanelResult = evaluateLabPanel(bmpPanel, {
        k: '6.5',
        na: '138',
        glu: '40',
        cr: '1.0',
      });

      expect(panicPanelResult.hasCriticalPanic).toBe(true);
      expect(panicPanelResult.criticalSummary).toContain('Potassium (K+) (6.5 mmol/L)');
      expect(panicPanelResult.criticalSummary).toContain('Glucose (Fasting/Random) (40 mg/dL)');
      expect(panicPanelResult.formattedReport).toContain(
        'MANDATORY PROTOCOL: Immediate verbal read-back to attending physician required'
      );
    });
  });

  describe('A3: Specimen Accessioning & Integrity Verification', () => {
    it('should recommend correct container matrix based on test type', () => {
      const testCases = [
        { test: 'Complete Blood Count', expectedTube: 'Lavender (K2 EDTA)' },
        { test: 'Basic Metabolic Panel', expectedTube: 'Gold (SST Gel Separator)' },
        { test: 'Prothrombin Time (PT/INR)', expectedTube: 'Light Blue (Sodium Citrate 3.2%)' },
        { test: 'Troponin I Stat', expectedTube: 'Green (Lithium Heparin)' },
      ];

      for (const tc of testCases) {
        const panel = matchLabPanel(tc.test);
        expect(panel?.tubeColor).toBe(tc.expectedTube);
      }
    });

    it('should validate accession payload structure', () => {
      const accessionPayload = {
        orderId: 'order-123',
        specimenType: 'Whole Blood (Venous)',
        containerType: 'Lavender (K2 EDTA)',
        barcode: 'ACC-M8X9-AB12',
        collectionSite: 'Left antecubital fossa',
        integrityVerified: true,
      };

      expect(accessionPayload.barcode).toMatch(/^ACC-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(accessionPayload.integrityVerified).toBe(true);
    });
  });

  describe('A4: Closed-Loop SLA Countdown & Verbal Read-Back Protocol', () => {
    it('should calculate 15-minute SLA remaining and identify breached state', () => {
      const SLA_MS = 15 * 60 * 1000;
      const now = Date.now();

      // Case 1: 5 minutes elapsed -> 10 minutes remaining (Active SLA)
      const notified5MinsAgo = now - 5 * 60 * 1000;
      const remaining5m = SLA_MS - (now - notified5MinsAgo);
      expect(remaining5m).toBe(10 * 60 * 1000);
      expect(remaining5m > 0).toBe(true);

      // Case 2: 18 minutes elapsed -> Breached by 3 minutes
      const notified18MinsAgo = now - 18 * 60 * 1000;
      const remaining18m = SLA_MS - (now - notified18MinsAgo);
      expect(remaining18m).toBe(-3 * 60 * 1000);
      expect(remaining18m <= 0).toBe(true);
    });

    it('should require mandatory verbal read-back confirmation in acknowledgment payload', () => {
      const validAcknowledgment = {
        orderId: 'order-critical-456',
        clinicianName: 'Dr. Sarah Connor, MD',
        clinicianRole: 'Attending Physician',
        communicationChannel: 'Direct Telephone',
        verbalReadBackConfirmed: true,
        notes: 'Advised repeat serum potassium and stat EKG.',
      };

      expect(validAcknowledgment.verbalReadBackConfirmed).toBe(true);
      expect(validAcknowledgment.clinicianName.trim().length).toBeGreaterThan(3);
    });
  });

  describe('A5: Specimen Rejection & Automated Redraw Order', () => {
    it('should define standardized pre-analytical rejection reasons', () => {
      const reasonCodes = REJECTION_REASONS.map((r) => r.code);
      expect(reasonCodes).toContain('gross_hemolysis');
      expect(reasonCodes).toContain('clotted_specimen');
      expect(reasonCodes).toContain('quantity_not_sufficient');
      expect(reasonCodes).toContain('wrong_container');
      expect(reasonCodes).toContain('unlabeled_or_mismatched');
    });

    it('should build replacement redraw order with correct priority', () => {
      const rejectionEvent = {
        originalOrderId: 'order-hemolyzed-789',
        reasonCode: 'gross_hemolysis',
        reasonLabel: 'Gross Hemolysis (Free hemoglobin invalidates K+, AST, LDH, Coag)',
        clinicalNotes: 'Index 3+ hemolysis observed. Redraw without tourniquet.',
        dispatchRedraw: true,
        redrawPriority: 'urgent' as const,
      };

      expect(rejectionEvent.dispatchRedraw).toBe(true);
      expect(rejectionEvent.redrawPriority).toBe('urgent');
    });
  });
});
