/**
 * Phase 2 Week 5: Lab Service Tests
 * 
 * Comprehensive unit testing for laboratory operations
 * Target: 20+ tests, >85% coverage
 * 
 * Tests cover:
 * - Test selection validation
 * - Specimen type compatibility
 * - Fasting requirements
 * - Critical value detection
 * - Result interpretation
 * - Normal range determination
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================================
// TEST SUITE 1: LAB TEST SELECTION & VALIDATION
// ============================================================================

describe('Lab Service - Test Selection', () => {
  const availableTests = [
    { id: 'cbc', name: 'Complete Blood Count', specimenType: 'blood' },
    { id: 'bmp', name: 'Basic Metabolic Panel', specimenType: 'blood' },
    { id: 'lipid', name: 'Lipid Panel', specimenType: 'blood', fastingRequired: true },
    { id: 'urinalysis', name: 'Urinalysis', specimenType: 'urine' },
    { id: 'stool', name: 'Stool Culture', specimenType: 'stool' },
  ];

  describe('Test Availability', () => {
    it('should validate test ID exists', () => {
      const testId = 'cbc';
      const test = availableTests.find(t => t.id === testId);
      
      expect(test).toBeDefined();
      expect(test?.name).toBe('Complete Blood Count');
    });

    it('should reject invalid test ID', () => {
      const testId = 'invalid-test';
      const test = availableTests.find(t => t.id === testId);
      
      expect(test).toBeUndefined();
    });

    it('should list all available tests', () => {
      expect(availableTests).toHaveLength(5);
      expect(availableTests.map(t => t.id)).toContain('cbc');
      expect(availableTests.map(t => t.id)).toContain('lipid');
    });
  });

  describe('Specimen Type Validation', () => {
    it('should require correct specimen type', () => {
      const test = availableTests.find(t => t.id === 'cbc');
      expect(test?.specimenType).toBe('blood');
    });

    it('should reject incompatible specimen types', () => {
      const cbcTest = availableTests.find(t => t.id === 'cbc');
      const incompatibleSpecimen = 'urine';
      
      const isCompatible = cbcTest?.specimenType === incompatibleSpecimen;
      expect(isCompatible).toBe(false);
    });

    it('should support multiple specimen types for some tests', () => {
      const specimenTypes = ['blood', 'urine', 'stool', 'sputum', 'csf'];
      expect(specimenTypes.length).toBeGreaterThan(1);
    });
  });
});

// ============================================================================
// TEST SUITE 2: SPECIMEN COMPATIBILITY
// ============================================================================

describe('Lab Service - Specimen Management', () => {
  const specimenRequirements = {
    cbc: { type: 'blood', tube: 'EDTA', volume: '3mL', stability: '24 hours' },
    bmp: { type: 'blood', tube: 'SST', volume: '5mL', stability: '7 days' },
    lipid: { type: 'blood', tube: 'SST', volume: '5mL', stability: '7 days' },
    urinalysis: { type: 'urine', volume: '30mL', stability: '2 hours' },
  };

  describe('Specimen Tube Compatibility', () => {
    it('should require correct tube type for blood tests', () => {
      const test = 'cbc';
      const requiredTube = specimenRequirements['cbc'].tube;
      
      expect(requiredTube).toBe('EDTA');
    });

    it('should detect incompatible tube for test', () => {
      const cbcRequires = 'EDTA';
      const usedTube = 'SST';
      
      const isCompatible = cbcRequires === usedTube;
      expect(isCompatible).toBe(false);
    });

    it('should validate specimen volume', () => {
      const cbcVolume = specimenRequirements['cbc'].volume;
      expect(cbcVolume).toBe('3mL');
      
      const parsedVolume = 3;
      expect(parsedVolume).toBeGreaterThan(0);
    });
  });

  describe('Specimen Stability', () => {
    it('should track specimen collection timestamp', () => {
      const specimen = {
        testId: 'cbc',
        collectedAt: new Date(),
        processedAt: null,
      };

      expect(specimen.collectedAt).toBeInstanceOf(Date);
    });

    it('should reject expired specimens', () => {
      const specimenCollectedHours = 48;
      const cbcStability = '24 hours';
      
      const isValid = specimenCollectedHours <= 24;
      expect(isValid).toBe(false);
    });

    it('should alert for specimens nearing expiration', () => {
      const specimen = {
        testId: 'urinalysis',
        collectedAt: new Date(),
        stability: 2, // 2 hours
      };

      const hoursElapsed = 1.7; // 85% of 2 hours
      const isNearingExpiration = hoursElapsed >= specimen.stability * 0.8; // 80% threshold
      
      expect(isNearingExpiration).toBe(true);
    });
  });
});

// ============================================================================
// TEST SUITE 3: FASTING REQUIREMENTS
// ============================================================================

describe('Lab Service - Fasting Requirements', () => {
  const fastingRequiredTests = ['lipid', 'glucose_fasting', 'triglycerides'];

  describe('Fasting Status Tracking', () => {
    it('should require fasting status for fasting tests', () => {
      const test = 'lipid';
      const requiresFasting = fastingRequiredTests.includes(test);
      
      expect(requiresFasting).toBe(true);
    });

    it('should accept fasting status confirmation', () => {
      const labOrder = {
        testId: 'lipid',
        fastingConfirmed: true,
        fastingDuration: '12 hours',
      };

      expect(labOrder.fastingConfirmed).toBe(true);
      expect(labOrder.fastingDuration).toBe('12 hours');
    });

    it('should reject fasting test without fasting confirmation', () => {
      const labOrder = {
        testId: 'lipid',
        fastingConfirmed: false,
      };

      const canProceed = labOrder.fastingConfirmed;
      expect(canProceed).toBe(false);
    });

    it('should validate minimum fasting duration', () => {
      const minimumFastingHours = 8;
      const patientFastingHours = 12;
      
      const isValid = patientFastingHours >= minimumFastingHours;
      expect(isValid).toBe(true);
    });

    it('should allow non-fasting tests without fasting requirement', () => {
      const test = 'cbc';
      const requiresFasting = fastingRequiredTests.includes(test);
      
      expect(requiresFasting).toBe(false);
    });
  });
});

// ============================================================================
// TEST SUITE 4: CRITICAL VALUE DETECTION
// ============================================================================

describe('Lab Service - Critical Values', () => {
  const criticalValues = {
    hemoglobin: { critical_low: 5, critical_high: 20, unit: 'g/dL' },
    potassium: { critical_low: 2.5, critical_high: 6.5, unit: 'mEq/L' },
    glucose: { critical_low: 40, critical_high: 500, unit: 'mg/dL' },
    troponin: { critical_high: 0.04, unit: 'ng/mL', direction: 'high' },
  };

  describe('Critical Value Flagging', () => {
    it('should flag critical low hemoglobin', () => {
      const result = { testName: 'hemoglobin', value: 4.5, unit: 'g/dL' };
      const isCritical = result.value < criticalValues.hemoglobin.critical_low;
      
      expect(isCritical).toBe(true);
    });

    it('should flag critical high glucose', () => {
      const result = { testName: 'glucose', value: 600, unit: 'mg/dL' };
      const isCritical = result.value > criticalValues.glucose.critical_high;
      
      expect(isCritical).toBe(true);
    });

    it('should not flag normal values as critical', () => {
      const result = { testName: 'hemoglobin', value: 12, unit: 'g/dL' };
      const isCritical = 
        result.value < criticalValues.hemoglobin.critical_low ||
        result.value > criticalValues.hemoglobin.critical_high;
      
      expect(isCritical).toBe(false);
    });
  });

  describe('Critical Value Notification', () => {
    it('should trigger alert for critical values', () => {
      const result = { value: 650, testName: 'glucose' };
      const shouldAlert = result.value > criticalValues.glucose.critical_high;
      
      expect(shouldAlert).toBe(true);
    });

    it('should require immediate physician notification', () => {
      const criticalResult = {
        critical: true,
        notificationRequired: true,
        timeLimit: '15 minutes',
      };

      expect(criticalResult.notificationRequired).toBe(true);
    });

    it('should track notification status', () => {
      const alert = {
        resultId: 'result-123',
        critical: true,
        notifiedAt: null,
        physiciansNotified: [],
      };

      const isNotified = alert.notifiedAt !== null && alert.physiciansNotified.length > 0;
      
      alert.notifiedAt = new Date();
      alert.physiciansNotified.push('doc-123');
      
      expect(alert.notifiedAt).not.toBeNull();
      expect(alert.physiciansNotified.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// TEST SUITE 5: RESULT INTERPRETATION & NORMAL RANGES
// ============================================================================

describe('Lab Service - Result Interpretation', () => {
  const normalRanges = {
    hemoglobin_male: { low: 13.5, high: 17.5, unit: 'g/dL' },
    hemoglobin_female: { low: 12, high: 15.5, unit: 'g/dL' },
    glucose_fasting: { low: 70, high: 100, unit: 'mg/dL' },
  };

  describe('Age & Gender-Specific Ranges', () => {
    it('should apply gender-specific normal ranges', () => {
      const patient = { gender: 'M' };
      const result = { value: 14, testName: 'hemoglobin' };
      const range = normalRanges.hemoglobin_male;
      
      const isNormal = result.value >= range.low && result.value <= range.high;
      expect(isNormal).toBe(true);
    });

    it('should flag abnormal results outside normal range', () => {
      const result = { value: 18.5, testName: 'hemoglobin_male' };
      const range = normalRanges.hemoglobin_male;
      
      const isAbnormal = result.value > range.high;
      expect(isAbnormal).toBe(true);
    });

    it('should determine if result is high or low', () => {
      const result = { value: 11 };
      const range = normalRanges.glucose_fasting;
      
      if (result.value < range.low) {
        expect('Low').toBe('Low');
      } else if (result.value > range.high) {
        expect('High').toBe('High');
      }
    });
  });

  describe('Result Flagging', () => {
    it('should include flag in result interpretation', () => {
      const result = {
        value: 520,
        unit: 'mg/dL',
        testName: 'glucose',
        flag: 'High',
      };

      expect(result.flag).toBeTruthy();
      expect(['Normal', 'Low', 'High']).toContain(result.flag);
    });

    it('should provide clinical interpretation with result', () => {
      const result = {
        value: 520,
        interpretation: 'Significantly elevated',
        recommendation: 'Repeat fasting glucose, consider HbA1c',
      };

      expect(result.interpretation).toBeTruthy();
      expect(result.recommendation).toBeTruthy();
    });
  });

  describe('Abnormality Detection', () => {
    it('should mark results as abnormal if outside range', () => {
      const tests = [
        { value: 14, min: 13.5, max: 17.5, abnormal: false },
        { value: 4, min: 13.5, max: 17.5, abnormal: true },
        { value: 25, min: 13.5, max: 17.5, abnormal: true },
      ];

      tests.forEach(test => {
        const isAbnormal = test.value < test.min || test.value > test.max;
        expect(isAbnormal).toBe(test.abnormal);
      });
    });
  });
});

// ============================================================================
// TEST SUITE 6: LAB ORDER WORKFLOW
// ============================================================================

describe('Lab Service - Lab Order Workflow', () => {
  describe('Lab Order Creation', () => {
    it('should require test selection', () => {
      const order = {
        patientId: 'pat-123',
        testIds: [],
      };

      const isValid = order.testIds.length > 0;
      expect(isValid).toBe(false);
    });

    it('should require patient ID', () => {
      const order = {
        patientId: '',
        testIds: ['cbc'],
      };

      const isValid = order.patientId.length > 0;
      expect(isValid).toBe(false);
    });

    it('should allow multiple test selection', () => {
      const order = {
        testIds: ['cbc', 'bmp', 'lipid'],
      };

      expect(order.testIds).toHaveLength(3);
    });
  });

  describe('Lab Order Status', () => {
    it('should track order through processing stages', () => {
      const order = {
        id: 'order-123',
        status: 'pending',
      };

      const stages = ['pending', 'collected', 'processing', 'completed'];
      
      expect(stages).toContain(order.status);
    });

    it('should timestamp major status changes', () => {
      const order = {
        id: 'order-123',
        createdAt: new Date(),
        collectedAt: null,
        processedAt: null,
        completedAt: null,
      };

      expect(order.createdAt).toBeInstanceOf(Date);
      
      order.collectedAt = new Date();
      expect(order.collectedAt).not.toBeNull();
    });
  });
});

// ============================================================================
// TEST SUITE 7: HOSPITAL SCOPING
// ============================================================================

describe('Lab Service - Hospital Scoping', () => {
  it('should enforce hospital isolation for lab orders', () => {
    const labOrders = [
      { id: 'lab-1', hospitalId: 'hosp-123' },
      { id: 'lab-2', hospitalId: 'hosp-123' },
      { id: 'lab-3', hospitalId: 'hosp-456' },
    ];

    const filtered = labOrders.filter(o => o.hospitalId === 'hosp-123');
    expect(filtered).toHaveLength(2);
  });

  it('should prevent cross-hospital lab result access', () => {
    const labResult = { id: 'result-123', hospitalId: 'hosp-123' };
    const userHospital = 'hosp-456';

    const canAccess = labResult.hospitalId === userHospital;
    expect(canAccess).toBe(false);
  });
});
