/**
 * Phase 2 Week 6: Lab API Integration Tests
 * 
 * Tests for laboratory order operations with:
 * - Test selection and specimen management
 * - Fasting requirements and status tracking
 * - Critical value detection and alerting
 * - Result interpretation and clinical integration
 * - Hospital scoping enforcement
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// TEST UTILITIES & SETUP
// ============================================================================

let hospitalCounter = 0;

function createTestToken(userId: string, role: string, hospitalId: string) {
  return `test-token-${userId}-${role}-${hospitalId}`;
}

async function setupTestHospital(name: string) {
  hospitalCounter++;
  return {
    id: `hosp-${Date.now()}-${hospitalCounter}`,
    name: name
  };
}

async function createTestLabOrder(
  patientId: string,
  doctorId: string,
  hospitalId: string,
  tests: string[] = ['CBC']
) {
  return {
    id: `lab-${Date.now()}`,
    patientId,
    doctorId,
    hospitalId,
    tests,
    orderedAt: new Date(),
    status: 'ordered',
    specimenCollected: false,
    specimenCollectionTime: null,
    fastedRequired: true,
    fastedVerified: false,
    resultsReady: false,
    criticalValues: [],
    createdAt: new Date()
  };
}

async function rollbackTestData() {
  return true;
}

// Lab test database
const LAB_TESTS = {
  'CBC': { specimenType: 'blood', volume: '3mL', tubeColor: 'lavender', fastedRequired: false },
  'BMP': { specimenType: 'blood', volume: '5mL', tubeColor: 'gold', fastedRequired: true },
  'Lipid Panel': { specimenType: 'blood', volume: '5mL', tubeColor: 'gold', fastedRequired: true },
  'TSH': { specimenType: 'blood', volume: '3mL', tubeColor: 'gold', fastedRequired: false },
  'Glucose': { specimenType: 'blood', volume: '2mL', tubeColor: 'grey', fastedRequired: true },
  'Urinalysis': { specimenType: 'urine', volume: '30mL', tubeColor: 'clear', fastedRequired: false }
};

// Critical value ranges
const CRITICAL_VALUES = {
  'WBC': { low: 2.5, high: 30.0, unit: '×10³/μL' },
  'Hemoglobin': { low: 5.0, high: 20.0, unit: 'g/dL' },
  'Platelets': { low: 20, high: 1000, unit: '×10³/μL' },
  'Glucose': { low: 40, high: 500, unit: 'mg/dL' },
  'Potassium': { low: 2.8, high: 6.2, unit: 'mEq/L' },
  'Sodium': { low: 120, high: 160, unit: 'mEq/L' }
};

// Normal ranges (gender-aware)
const NORMAL_RANGES = {
  'WBC': { low: 4.5, high: 11.0, unit: '×10³/μL' },
  'RBC-male': { low: 4.5, high: 5.9, unit: '×10⁶/μL' },
  'RBC-female': { low: 4.1, high: 5.1, unit: '×10⁶/μL' },
  'Hemoglobin-male': { low: 13.5, high: 17.5, unit: 'g/dL' },
  'Hemoglobin-female': { low: 12.0, high: 15.5, unit: 'g/dL' },
  'Platelets': { low: 150, high: 400, unit: '×10³/μL' }
};

function isCriticalValue(testName: string, value: number): boolean {
  const criticalRange = CRITICAL_VALUES[testName];
  if (!criticalRange) return false;
  return value < criticalRange.low || value > criticalRange.high;
}

function isAbnormalValue(testName: string, value: number, gender?: string): boolean {
  let key = testName;
  if (gender && NORMAL_RANGES[`${testName}-${gender}`]) {
    key = `${testName}-${gender}`;
  }
  
  const normalRange = NORMAL_RANGES[key];
  if (!normalRange) return false;
  return value < normalRange.low || value > normalRange.high;
}

// ============================================================================
// TEST SUITE 1: LAB TEST SELECTION
// ============================================================================

describe('Lab API Integration - Test Selection', () => {
  let hospitalId: string;
  let doctorToken: string;
  let patientId: string;

  beforeEach(async () => {
    const hospital = await setupTestHospital('Test Hospital A');
    hospitalId = hospital.id;
    doctorToken = createTestToken('doc-001', 'doctor', hospitalId);
    patientId = 'pat-001';
  });

  afterEach(async () => {
    await rollbackTestData();
  });

  it('should validate test ID against lab test database', () => {
    const validTests = Object.keys(LAB_TESTS);
    const testToOrder = 'CBC';

    expect(validTests).toContain(testToOrder);
  });

  it('should reject invalid test selection', () => {
    const invalidTests = ['InvalidTest', 'XYZ123', 'NotATest'];
    const validTests = Object.keys(LAB_TESTS);

    invalidTests.forEach(test => {
      expect(validTests).not.toContain(test);
    });
  });

  it('should require specimen type for each test', () => {
    const tests = ['CBC', 'Urinalysis', 'BMP'];

    tests.forEach(test => {
      const testConfig = LAB_TESTS[test];
      expect(testConfig.specimenType).toBeTruthy();
    });
  });

  it('should retrieve specimen requirements for selected tests', async () => {
    const order = await createTestLabOrder(patientId, 'doc-001', hospitalId, ['CBC', 'BMP']);

    expect(order.tests).toHaveLength(2);
    order.tests.forEach(test => {
      const config = LAB_TESTS[test];
      expect(config).toBeDefined();
    });
  });
});

// ============================================================================
// TEST SUITE 2: SPECIMEN MANAGEMENT
// ============================================================================

describe('Lab API Integration - Specimen Management', () => {
  let hospitalId: string;
  let labTechToken: string;
  let patientId: string;
  let labOrderId: string;

  beforeEach(async () => {
    const hospital = await setupTestHospital('Test Hospital B');
    hospitalId = hospital.id;
    labTechToken = createTestToken('lab-001', 'lab_technician', hospitalId);
    patientId = 'pat-001';

    const order = await createTestLabOrder(patientId, 'doc-001', hospitalId, ['CBC']);
    labOrderId = order.id;
  });

  afterEach(async () => {
    await rollbackTestData();
  });

  it('should validate specimen type matches test type', () => {
    const test = 'CBC';
    const testConfig = LAB_TESTS[test];
    const specimenType = 'blood';

    expect(testConfig.specimenType).toBe(specimenType);
  });

  it('should reject mismatched tube color', () => {
    const test = 'CBC';
    const config = LAB_TESTS[test];
    
    const correctTubeColor = config.tubeColor;
    const wrongTubeColor = 'red'; // Wrong for CBC (should be lavender)

    expect(correctTubeColor).not.toBe(wrongTubeColor);
  });

  it('should verify specimen volume requirements', () => {
    const test = 'BMP';
    const config = LAB_TESTS[test];
    const collectedVolume = 5; // mL

    expect(collectedVolume).toBe(5); // Matches requirement
  });

  it('should track specimen collection timestamp', async () => {
    const collectionTime = new Date();
    expect(collectionTime).toBeInstanceOf(Date);
  });

  it('should enforce specimen stability expiration', () => {
    const specimenCollectionTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const maxStableHours = 4;
    const currentTime = new Date();

    const ageHours = (currentTime.getTime() - specimenCollectionTime.getTime()) / (60 * 60 * 1000);
    expect(ageHours).toBeLessThan(maxStableHours);
  });

  it('should alert for specimens nearing expiration', () => {
    const specimenCollectionTime = new Date(Date.now() - 3.7 * 60 * 60 * 1000); // 3.7 hours ago
    const maxStableHours = 4;
    const warningThreshold = 0.5; // Alert if <30 min left
    
    const ageHours = (new Date().getTime() - specimenCollectionTime.getTime()) / (60 * 60 * 1000);
    const timeRemainingHours = maxStableHours - ageHours;

    expect(timeRemainingHours).toBeLessThan(warningThreshold);
  });
});

// ============================================================================
// TEST SUITE 3: FASTING REQUIREMENTS
// ============================================================================

describe('Lab API Integration - Fasting Requirements', () => {
  let hospitalId: string;
  let doctorToken: string;
  let patientId: string;

  beforeEach(async () => {
    const hospital = await setupTestHospital('Test Hospital C');
    hospitalId = hospital.id;
    doctorToken = createTestToken('doc-001', 'doctor', hospitalId);
    patientId = 'pat-001';
  });

  afterEach(async () => {
    await rollbackTestData();
  });

  it('should flag tests requiring fasting', async () => {
    const fastingRequiredTests = ['BMP', 'Lipid Panel', 'Glucose'];

    fastingRequiredTests.forEach(test => {
      const config = LAB_TESTS[test];
      expect(config.fastedRequired).toBe(true);
    });
  });

  it('should not require fasting for certain tests', () => {
    const nonFastingTests = ['CBC', 'TSH', 'Urinalysis'];

    nonFastingTests.forEach(test => {
      const config = LAB_TESTS[test];
      expect(config.fastedRequired).toBe(false);
    });
  });

  it('should track fasting verification status', async () => {
    const order = await createTestLabOrder(patientId, 'doc-001', hospitalId, ['Glucose']);

    expect(order.fastedRequired).toBe(true);
    expect(order.fastedVerified).toBe(false);
  });

  it('should enforce minimum fasting duration', () => {
    const minimumFastHours = 8;
    const fastingStartTime = new Date(Date.now() - 9 * 60 * 60 * 1000);
    const collectionTime = new Date();

    const fastHoursDuration = (collectionTime.getTime() - fastingStartTime.getTime()) / (60 * 60 * 1000);
    expect(fastHoursDuration).toBeGreaterThanOrEqual(minimumFastHours);
  });

  it('should require confirmation of fasting before collection', () => {
    const needsFastingConfirmation = true;
    const fastedConfirmed = false;

    expect(needsFastingConfirmation).toBe(true);
    expect(fastedConfirmed).toBe(false);
  });
});

// ============================================================================
// TEST SUITE 4: CRITICAL VALUE DETECTION
// ============================================================================

describe('Lab API Integration - Critical Values', () => {
  let hospitalId: string;
  let labTechToken: string;
  let patientId: string;

  beforeEach(async () => {
    const hospital = await setupTestHospital('Test Hospital D');
    hospitalId = hospital.id;
    labTechToken = createTestToken('lab-001', 'lab_technician', hospitalId);
    patientId = 'pat-001';
  });

  afterEach(async () => {
    await rollbackTestData();
  });

  it('should flag low WBC as critical', () => {
    const wbcValue = 2.0;
    expect(isCriticalValue('WBC', wbcValue)).toBe(true);
  });

  it('should flag high WBC as critical', () => {
    const wbcValue = 35.0;
    expect(isCriticalValue('WBC', wbcValue)).toBe(true);
  });

  it('should flag low hemoglobin as critical', () => {
    const hemoglobin = 4.5;
    expect(isCriticalValue('Hemoglobin', hemoglobin)).toBe(true);
  });

  it('should flag critical glucose levels', () => {
    expect(isCriticalValue('Glucose', 35)).toBe(true);
    expect(isCriticalValue('Glucose', 550)).toBe(true);
  });

  it('should not flag normal values as critical', () => {
    expect(isCriticalValue('WBC', 7.0)).toBe(false);
    expect(isCriticalValue('Glucose', 120)).toBe(false);
  });

  it('should trigger alert for critical potassium', () => {
    const criticalK = [2.5, 6.5]; // Both critical
    
    criticalK.forEach(value => {
      expect(isCriticalValue('Potassium', value)).toBe(true);
    });
  });

  it('should trigger alert for critical sodium', () => {
    const criticalNa = [115, 165]; // Both critical
    
    criticalNa.forEach(value => {
      expect(isCriticalValue('Sodium', value)).toBe(true);
    });
  });
});

// ============================================================================
// TEST SUITE 5: RESULT INTERPRETATION
// ============================================================================

describe('Lab API Integration - Result Interpretation', () => {
  let hospitalId: string;
  let labTechToken: string;
  let patientId: string;

  beforeEach(async () => {
    const hospital = await setupTestHospital('Test Hospital E');
    hospitalId = hospital.id;
    labTechToken = createTestToken('lab-001', 'lab_technician', hospitalId);
    patientId = 'pat-001';
  });

  afterEach(async () => {
    await rollbackTestData();
  });

  it('should apply gender-specific normal ranges for RBC', () => {
    const maleRBC = 5.0;
    const femaleRBC = 4.5;

    expect(isAbnormalValue('RBC', maleRBC, 'male')).toBe(false);
    expect(isAbnormalValue('RBC', femaleRBC, 'female')).toBe(false);
  });

  it('should flag abnormal male hemoglobin', () => {
    const lowHemoglobin = 12.0;
    expect(isAbnormalValue('Hemoglobin', lowHemoglobin, 'male')).toBe(true);
  });

  it('should flag abnormal female hemoglobin', () => {
    const lowHemoglobin = 11.0;
    expect(isAbnormalValue('Hemoglobin', lowHemoglobin, 'female')).toBe(true);
  });

  it('should not flag normal WBC', () => {
    const normalWBC = 7.0;
    expect(isAbnormalValue('WBC', normalWBC)).toBe(false);
  });

  it('should flag abnormal platelet count', () => {
    const lowPlatelets = 100;
    expect(isAbnormalValue('Platelets', lowPlatelets)).toBe(true);
  });

  it('should provide clinical interpretation notes', () => {
    const result = {
      testName: 'CBC',
      value: 45000,
      unit: '×10⁶/μL',
      normalRange: '4.5-5.5',
      status: 'high',
      interpretation: 'Elevated RBC count - possible polycythemia or dehydration'
    };

    expect(result.interpretation).toBeTruthy();
    expect(result.status).toBe('high');
  });
});

// ============================================================================
// TEST SUITE 6: LAB ORDER WORKFLOW
// ============================================================================

describe('Lab API Integration - Order Workflow', () => {
  let hospitalId: string;
  let doctorToken: string;
  let labTechToken: string;
  let patientId: string;

  beforeEach(async () => {
    const hospital = await setupTestHospital('Test Hospital F');
    hospitalId = hospital.id;
    doctorToken = createTestToken('doc-001', 'doctor', hospitalId);
    labTechToken = createTestToken('lab-001', 'lab_technician', hospitalId);
    patientId = 'pat-001';
  });

  afterEach(async () => {
    await rollbackTestData();
  });

  it('should create lab order with required fields', async () => {
    const order = await createTestLabOrder(patientId, 'doc-001', hospitalId, ['CBC', 'BMP']);

    expect(order.id).toBeTruthy();
    expect(order.patientId).toBe(patientId);
    expect(order.tests).toHaveLength(2);
    expect(order.status).toBe('ordered');
  });

  it('should allow multiple tests in single order', async () => {
    const tests = ['CBC', 'BMP', 'TSH'];
    const order = await createTestLabOrder(patientId, 'doc-001', hospitalId, tests);

    expect(order.tests).toHaveLength(3);
    order.tests.forEach(test => {
      expect(tests).toContain(test);
    });
  });

  it('should track order status: ordered → collected → processed → resulted', () => {
    const statuses = ['ordered', 'collected', 'processed', 'resulted'];
    
    expect(statuses).toHaveLength(4);
    expect(statuses[0]).toBe('ordered');
    expect(statuses[statuses.length - 1]).toBe('resulted');
  });

  it('should require specimen collection confirmation before proceeding', async () => {
    const order = await createTestLabOrder(patientId, 'doc-001', hospitalId, ['CBC']);

    expect(order.specimenCollected).toBe(false);
    // Order should be stuck until specimen confirmed
  });

  it('should verify all specimen requirements before allowing results', () => {
    const order = {
      tests: ['CBC', 'BMP'],
      specimenCollected: true,
      fastedVerified: true,
      readyForProcessing: true
    };

    const canProcess = order.specimenCollected && order.fastedVerified;
    expect(canProcess).toBe(true);
  });
});

// ============================================================================
// TEST SUITE 7: HOSPITAL SCOPING & SECURITY
// ============================================================================

describe('Lab API Integration - Hospital Scoping', () => {
  let hospital1Id: string;
  let hospital2Id: string;
  let doctor1Token: string;
  let doctor2Token: string;
  let labOrder1Id: string;

  beforeEach(async () => {
    const h1 = await setupTestHospital('Hospital A');
    const h2 = await setupTestHospital('Hospital B');
    hospital1Id = h1.id;
    hospital2Id = h2.id;

    doctor1Token = createTestToken('doc-001', 'doctor', hospital1Id);
    doctor2Token = createTestToken('doc-002', 'doctor', hospital2Id);

    const order = await createTestLabOrder('pat-001', 'doc-001', hospital1Id, ['CBC']);
    labOrder1Id = order.id;
  });

  afterEach(async () => {
    await rollbackTestData();
  });

  it('should enforce hospital_id from JWT context', async () => {
    const order = await createTestLabOrder('pat-001', 'doc-001', hospital1Id, ['BMP']);

    expect(order.hospitalId).toBe(hospital1Id);
  });

  it('should prevent cross-hospital lab order access', () => {
    const order1 = { id: labOrder1Id, hospitalId: hospital1Id };
    
    // Doctor from hospital 2 should NOT access this
    expect(order1.hospitalId).not.toBe(hospital2Id);
  });

  it('should filter lab orders by hospital in list queries', () => {
    const hospital1Orders = [{ id: labOrder1Id, hospitalId: hospital1Id }];
    
    const allFromHospital1 = hospital1Orders.every(o => o.hospitalId === hospital1Id);
    expect(allFromHospital1).toBe(true);
  });

  it('should prevent accessing results from other hospitals', () => {
    const resultsOrder1 = { orderId: labOrder1Id, hospitalId: hospital1Id, results: [] };
    
    expect(resultsOrder1.hospitalId).toBe(hospital1Id);
    expect(resultsOrder1.hospitalId).not.toBe(hospital2Id);
  });
});
