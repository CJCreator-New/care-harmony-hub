# Laboratory Equipment Integration Guide — CareSync HIMS

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**Audience**: Integration engineers, lab specialists, biomedical technicians

---

## Table of Contents

1. [Overview](#overview)
2. [Equipment Integration Patterns](#equipment-integration-patterns)
3. [HL7 & LOINC Standards](#hl7--loinc-standards)
4. [Result Upload Process](#result-upload-process)
5. [Error Handling & Validation](#error-handling--validation)
6. [Device Management](#device-management)

---

## Overview

### Supported Laboratory Equipment

CareSync integrates with automated laboratory analyzers through industry-standard protocols:

| Equipment Type | Manufacturers | Protocol | Latency |
|---|---|---|---|
| Hematology Analyzer | Sysmex, ADVIA, Mindray | LIS HL7 | <30 sec |
| Chemistry Analyzer | Roche, Abbott, Beckman | LIS HL7 | <1 min |
| Urinalysis | Siemens, ARKRAY | LIS HL7 | <1 min |
| Blood Bank | IH, Abbott ID | LIS HL7 | <2 min |
| Point-of-care (POC) | i-STAT, Nova, GlucoTrack | HL7 + API | Real-time |

**Integration methods**:
1. **Bidirectional HL7** - Lab analyzer ↔ CareSync server (preferred)
2. **API integration** - POC devices → REST API
3. **Manual upload** - CSV parser + validation

---

## Equipment Integration Patterns

### HL7 Bidirectional Communication

```
HL7 ARCHITECTURE

Standard: HL7 v2.5 (medical industry standard)
Protocol: MLLP (Minimal Lower Layer Protocol)
Connection: TCP socket on port 2575

HL7 MESSAGE FLOW

Lab Analyzer Request (Step 1):
┌─────────────────────────────────────┐
│   Lab Analyzer (Sysmex XN-550)      │
│                                     │
│  Patient Sample loaded:             │
│  Barcode: 20260408-001              │
│  Tests: CBC, CMP                    │
│                                     │
│  Sends ORM^ message:                │
│  "Order me to run tests"            │
└─────────────────────────────────────┘
                  ↓
        [MLLP encode on TCP/2575]
                  ↓
┌─────────────────────────────────────┐
│   CareSync HIMS Server              │
│   (Middleware/Translator)           │
│                                     │
│   HL7 Parser receives ORM^          │
│   Extract: Patient ID, Tests, etc.  │
│   Store: Test order in queue        │
│                                     │
│   Send ACK back:                    │
│   "Order received and processed"    │
└─────────────────────────────────────┘
                  ↓
        [MLLP/TCP response]
                  ↓
┌─────────────────────────────────────┐
│   Lab Analyzer                      │
│   ACK received → Process sample     │
│   Run tests: 3 minutes              │
└─────────────────────────────────────┘


Lab Analyzer ← Result Send (Step 2):
┌─────────────────────────────────────┐
│   Lab Analyzer (Tests Complete)     │
│                                     │
│   Tests done: 14:32 UTC             │
│   Results ready                     │
│                                     │
│   Sends ORU^ message:               │
│   "Observation result you requested"│
│   - WBC: 7.5 K/μL ✓                 │
│   - RBC: 5.2 M/μL ✓                 │
│   - Hemoglobin: 15.2 g/dL ✓         │
│   etc.                              │
└─────────────────────────────────────┘
                  ↓
        [MLLP encode on TCP/2575]
                  ↓
┌─────────────────────────────────────┐
│   CareSync HIMS Server              │
│   (Middleware/Translator)           │
│                                     │
│   HL7 Parser receives ORU^          │
│   Parse: Extract all results        │
│   Map: LOINC codes to CareSync IDs  │
│   Validate: Check ranges            │
│   Store: Results in database        │
│   Notify: Send to physician         │
│   Send ACK back:                    │
│   "Results received and stored"     │
└─────────────────────────────────────┘
                  ↓
        [MLLP/TCP response]
                  ↓
┌─────────────────────────────────────┐
│   Lab Analyzer                      │
│   ACK received → Log complete       │
│   Archive local results             │
└─────────────────────────────────────┘

HL7 MESSAGE STRUCTURE EXAMPLE

Incoming ORM^ (Order Message):

```
MSH|^~\&|LAB-SYSMEX|MetroHosp|CARESYNC|MetroHosp|20260408143200||ORM^O01|MSG-123456|P|2.5
PID|||12345^^^METROHOPS||Smith^John^||19750520|M
ORC|NE|LAB-2026-0424||||||||||Dr. Chen
OBR|1|LAB-2026-0424||CBC^COMPLETE BLOOD COUNT|||20260408143000|||||||||^10^||||
OBX|1|CE|WBC^White Blood Cell Count||7.5|K/uL|4.5-11.0|N|||F
OBX|2|CE|RBC^Red Blood Cell Count||5.2|M/uL|4.5-5.9|M|||F
OBX|3|CE|HGB^Hemoglobin||15.2|g/dL|13.5-17.5|M|||F
```

Segment meanings:
├─ MSH: Message header (timestamp, sender, receiver)
├─ PID: Patient identification (name, DOB, ID)
├─ ORC: Order control (order type, number)
├─ OBR: Observation request (test code, description)
└─ OBX: Observation (actual result values)

HL7 PARSING IN CARESYNC

Code: backend/integrations/hl7-parser.ts

import { parseHL7Message, extractResults } from 'hl7-library';

export async function processIncomingHL7(hl7Message: string) {
  // Decode MLLP wrapper
  const cleanMessage = hl7Message
    .replace(/^\x0b/, '')  // Remove MLLP start
    .replace(/\x1c\x0d$/, '');  // Remove MLLP end
  
  try {
    // Parse HL7 structure
    const parsed = parseHL7Message(cleanMessage);
    
    // Extract key fields
    const messageType = parsed.MSH.messageType;
    const patientId = parsed.PID.patientId;
    const timestamp = parsed.MSH.timestamp;
    
    if (messageType === 'ORM^O01') {
      // Order message - validate test request
      return handleOrderMessage(parsed);
    } else if (messageType === 'ORU^R01') {
      // Result message - store results
      return handleResultMessage(parsed);
    }
  } catch (error) {
    // Log error, send negative ACK
    console.error('HL7 parse error:', error);
    return generateNegativeACK('AR', 'Invalid message format');
  }
}

async function handleResultMessage(parsed: any) {
  // Extract results from OBX segments
  const results = extractResults(parsed.OBX);
  
  // Find patient in CareSync
  const patient = await findPatientByLabId(parsed.PID.patientId);
  if (!patient) {
    return generateNegativeACK('AE', 'Patient not found');
  }
  
  // Map HL7 LOINC codes to CareSync test definitions
  const mappedResults = results.map(result => ({
    loincCode: result.code,
    value: result.value,
    unit: result.unit,
    referenceRange: result.referenceRange,
    testId: mapLoincToTestId(result.code)
  }));
  
  // Validate each result
  for (const result of mappedResults) {
    if (!validateResultValue(result)) {
      return generateNegativeACK('AR', 
        `Invalid value: ${result.loincCode}`);
    }
  }
  
  // Store results
  const labResults = await storeLabResults(patient.id, mappedResults);
  
  // Check for critical values
  const criticalValues = flagCriticalValues(labResults);
  if (criticalValues.length > 0) {
    await notifyPhysician(patient, criticalValues);
  }
  
  // Generate positive ACK
  return generatePositiveACK(parsed.MSH.messageId);
}

ACK MESSAGES

Positive ACK (Success):
```
MSH|^~\&|CARESYNC|MetroHosp|LAB-SYSMEX|MetroHosp|20260408143205||ACK^O01|ACK-123456|P|2.5
MSA|AA|MSG-123456|Results received and stored
```
AA = Application Accept (success)

Negative ACK (Error):
```
MSH|^~\&|CARESYNC|MetroHosp|LAB-SYSMEX|MetroHosp|20260408143205||ACK^O01|ACK-123456|P|2.5
MSA|AE|MSG-123456|Patient not found in system
```
AE = Application Error

MLLP TRANSMISSION

Lower Layer Protocol wraps HL7:

Start byte: 0x0B (vertical tab)
Separator: 0x0D (carriage return)
End sequence: 0x1C0D (file separator + CR)

Example transmission:
0x0B + [HL7 message] + 0x1C + 0x0D
```

### REST API Integration (Point-of-Care Devices)

```
POINT-OF-CARE (POC) API

Devices: i-STAT, Nova, GlucoTrack, etc.
Protocol: REST/JSON over HTTPS
Authentication: API key rotation every 90 days

Device sends result via API:

POST https://api.metrohospital.net/api/v1/lab/poc-result
Content-Type: application/json
X-API-Key: poc-device-001_key_2026
X-Device-ID: ISTAT-2026-001

Request body:
{
  "device_id": "ISTAT-2026-001",
  "patient_id": "hosp-123:pat-456",  // Hospital scoped
  "barcode": "20260408-POC-001",
  "test_type": "BLOOD_GLUCOSE",
  "timestamp": "2026-04-08T14:35:22Z",
  "results": [
    {
      "test_code": "GLUCOSE",
      "test_name": "Blood Glucose",
      "value": 95,
      "unit": "mg/dL",
      "reference_range": "70-100",
      "status": "N"
    }
  ],
  "sample_type": "CAPILLARY_BLOOD",
  "quality_flags": {
    "sample_volume_ok": true,
    "temperature_ok": true,
    "expiration_not_reached": true
  }
}

Backend processing:

export async function handlePOCResult(
  req: Request,
  res: Response
) {
  // Authenticate device
  const deviceId = req.headers['x-device-id'];
  const apiKey = req.headers['x-api-key'];
  const device = await authenticateDevice(deviceId, apiKey);
  
  if (!device) {
    return res.status(401).json({ 
      error: 'Invalid device credentials' 
    });
  }
  
  // Extract and validate
  const { patient_id, results, timestamp } = req.body;
  
  // Decrypt patient_id (hospital scoped)
  const patient = await decryptAndFindPatient(patient_id);
  
  // Validate results
  const validated = results.map(result => 
    validatePOCResult(result, device.calibration_date)
  );
  
  if (validated.some(r => !r.valid)) {
    return res.status(400).json({
      error: 'Invalid results detected',
      details: validated.filter(r => !r.valid)
    });
  }
  
  // Store results
  const stored = await storeLabResults(patient.id, validated.map(r => r.data));
  
  // Flag critical if needed
  const critical = flagCriticalValues(stored);
  if (critical.length > 0) {
    await notifyPhysician(patient, critical);
  }
  
  // Return success
  return res.status(201).json({
    status: 'success',
    result_ids: stored.map(r => r.id),
    next_sync: new Date(Date.now() + 5 * 60000)  // 5 min
  });
}

Response (201 Created):
{
  "status": "success",
  "result_ids": ["res-123", "res-124"],
  "next_sync": "2026-04-08T14:40:22Z",
  "message": "Results stored successfully"
}
```

---

## HL7 & LOINC Standards

### LOINC Code Mapping

```
LOINC = Logical Observation Identifiers Names and Codes
Standardized lab test codes recognized globally

LOINC Mapping Examples:

Test: Complete Blood Count (CBC)
├─ WBC (White Blood Cell Count)
│  └─ LOINC: 6690-2 (WBC # in blood)
├─ RBC (Red Blood Cell Count)
│  └─ LOINC: 789-8 (RBC # in blood)
├─ Hemoglobin
│  └─ LOINC: 718-7 (Hemoglobin [mass/volume] in blood)
├─ Hematocrit
│  └─ LOINC: 4544-3 (Hematocrit [volume fraction] in blood)
└─ Platelets
   └─ LOINC: 777-3 (Platelets [#/volume] in blood)

Comprehensive Metabolic Panel (CMP):
├─ Glucose
│  └─ LOINC: 2345-7 (Glucose [mass/volume] in serum)
├─ Creatinine
│  └─ LOINC: 2160-0 (Creatinine [mass/volume] in serum)
├─ BUN (Blood Urea Nitrogen)
│  └─ LOINC: 3094-0 (Urea nitrogen [mass/volume] in serum)
├─ Sodium
│  └─ LOINC: 2951-2 (Sodium [moles/volume] in serum)
├─ Potassium
│  └─ LOINC: 2823-3 (Potassium [moles/volume] in serum)
└─ Calcium
   └─ LOINC: 2000-8 (Calcium [mass/volume] in serum)

LOINC DATABASE MAPPING

Table: laboratory_tests

CREATE TABLE laboratory_tests (
  id UUID PRIMARY KEY,
  hospital_id UUID REFERENCES hospitals(id),
  test_name VARCHAR(255),
  test_code VARCHAR(50),  -- Internal code (e.g., "CBC")
  loinc_code VARCHAR(50),  -- LOINC standard (e.g., "6690-2")
  description TEXT,
  unit_of_measure VARCHAR(20),
  reference_range_low NUMERIC,
  reference_range_high NUMERIC,
  critical_low NUMERIC,
  critical_high NUMERIC,
  specimen_type VARCHAR(100),  -- "Serum", "Plasma", etc.
  turnaround_time_minutes INT,
  active BOOLEAN DEFAULT true,
  
  -- Machine compatibility
  device_compatibility JSONB,  -- {"Sysmex XN-550": true, "Roche Cobas": true}
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

Example entry:
{
  "id": "test-001",
  "test_name": "White Blood Cell Count",
  "test_code": "WBC",
  "loinc_code": "6690-2",
  "unit_of_measure": "K/μL",
  "reference_range_low": 4.5,
  "reference_range_high": 11.0,
  "critical_low": 2.0,
  "critical_high": 30.0,
  "specimen_type": "Whole Blood (EDTA)",
  "device_compatibility": {
    "Sysmex XN-550": true,
    "ADVIA 2120": true,
    "i-STAT": false
  }
}
```

---

## Result Upload Process

### Manual CSV Upload

```
FOR LABS WITHOUT LIS INTEGRATION

CSV file format:

patient_id,test_date,test_code,value,unit,reference_range_low,reference_range_high
12345,2026-04-08,WBC,7.5,K/uL,4.5,11.0
12345,2026-04-08,RBC,5.2,M/uL,4.5,5.9
12345,2026-04-08,HGB,15.2,g/dL,13.5,17.5
12346,2026-04-08,GLUCOSE,95,mg/dL,70,100

UPLOAD ENDPOINT

POST /api/v1/lab/import-csv
Authorization: Bearer [JWT]
Content-Type: multipart/form-data

Form data:
├─ file: [lab_results.csv]
├─ test_date: 2026-04-08
└─ performer: Dr. Susan Rodriguez

PARSING & VALIDATION

Code: backend/integrations/csv-laboratory.ts

export async function importLabCSV(file: File, metadata: any) {
  const csv = await file.text();
  const rows = csv.split('\n').slice(1);  // Skip header
  
  const results = [];
  const errors = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].split(',');
    
    // Validate structure
    if (row.length < 5) {
      errors.push(`Row ${i + 1}: Missing columns`);
      continue;
    }
    
    const [patientId, testCode, value, unit, refLow, refHigh] = row;
    
    // Lookup patient
    const patient = await findPatient(patientId);
    if (!patient) {
      errors.push(`Row ${i + 1}: Patient ${patientId} not found`);
      continue;
    }
    
    // Lookup test
    const test = await findTestByCode(testCode);
    if (!test) {
      errors.push(`Row ${i + 1}: Test ${testCode} not configured`);
      continue;
    }
    
    // Validate numeric values
    if (isNaN(Number(value))) {
      errors.push(`Row ${i + 1}: Invalid numeric value: ${value}`);
      continue;
    }
    
    // Store result
    results.push({
      patient_id: patient.id,
      test_id: test.id,
      value: parseFloat(value),
      unit: unit,
      reference_range: { low: refLow, high: refHigh }
    });
  }
  
  if (errors.length > 0) {
    return {
      status: 'partial',
      imported: results.length,
      errors: errors
    };
  }
  
  // Store all results
  const stored = await Promise.all(
    results.map(r => storeLabResult(r))
  );
  
  return {
    status: 'success',
    imported: stored.length,
    errors: []
  };
}

RESPONSE

{
  "status": "success",
  "imported": 45,
  "errors": [],
  "timestamp": "2026-04-08T14:45:00Z",
  "performer": "Dr. Susan Rodriguez"
}
```

---

## Error Handling & Validation

### Data Validation Rules

```
VALIDATION CHECKLIST

For each lab result:

1. Patient identification
   ├─ Patient ID must exist in CareSync
   ├─ Patient not deleted
   ├─ Patient belongs to same hospital
   └─ Hospital Scope Match: Result.hospital_id == Patient.hospital_id

2. Test Code validation
   ├─ LOINC code must exist in laboratory_tests table
   ├─ Test must be active (active = true)
   ├─ Specimen type matches device output
   └─ Device compatibility verified

3. Result Value validation
   ├─ Numeric value (not text or symbols)
   ├─ Value within physiologically possible range
   │  └─ Example: Hemoglobin > 20 g/dL unlikely (flag review)
   ├─ Unit matches test definition
   └─ Decimal precision reasonable (not 15 decimal places)

4. Reference Range validation
   ├─ Low < High (sanity check)
   ├─ Matches test definition in system
   ├─ Age/sex appropriate ranges if applicable
   └─ Known vs. result value

5. Timestamp validation
   ├─ Not in future (can't test tomorrow)
   ├─ Not older than 7 days (stale data check)
   ├─ Time zone consistent
   └─ Collection time before received time

CRITICAL VALUE DETECTION

Automatic flag if:
├─ Result < critical_low threshold OR
├─ Result > critical_high threshold
└─ Then: Alert physician immediately

Example thresholds:
├─ Glucose: <40 or >500 mg/dL
├─ Potassium: <2.5 or >6.5 mEq/L
├─ Hemoglobin: <6.0 or >20 g/dL
├─ WBC: <2.0 or >30 K/μL
└─ Troponin: >0.04 ng/mL

CODE: Critical value detection

async function checkCriticalVaues(results: LabResult[]) {
  const criticalResults = [];
  
  for (const result of results) {
    const test = await findTest(result.test_id);
    
    if (result.value < test.critical_low ||
        result.value > test.critical_high) {
      
      criticalResults.push({
        patient_id: result.patient_id,
        test_name: test.test_name,
        value: result.value,
        critical_threshold: result.value < test.critical_low 
          ? `<${test.critical_low}` 
          : `>${test.critical_high}`,
        severity: 'CRITICAL'
      });
      
      // Immediate notification
      await notifyPhysicianOfCriticalValue(
        result.patient_id,
        result.test_id,
        result.value
      );
    }
  }
  
  return criticalResults;
}

ERROR RECOVERY

Failed result upload:

1. Network failure
   └─ Device retries with exponential backoff (5s, 10s, 30s, 60s)
   └─ After 4 failures: Alert technician, store locally

2. Invalid patient ID
   └─ Technician corrects in device/system
   └─ Resubmit corrected data

3. Duplicate result (same test, same patient, same time)
   └─ System detects duplicate (not resend)
   └─ Compare values: same = ignore, different = alert

4. Recovery process
   └─ Manual audit of failed uploads
   └─ Reprocess when resolved
   └─ Log all retries in audit trail
```

---

## Device Management

### Equipment Maintenance & Calibration

```
DEVICE INVENTORY

Tracked devices:

CREATE TABLE lab_devices (
  id UUID PRIMARY KEY,
  hospital_id UUID REFERENCES hospitals(id),
  device_type VARCHAR(100),  -- "Hematology Analyzer", etc.
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  device_ip VARCHAR(15),
  device_port INT DEFAULT 2575,
  
  -- Calibration
  last_calibration_date DATE,
  next_calibration_due DATE,
  calibration_status VARCHAR(50),  -- "Calibrated", "Due", "Overdue"
  
  -- Operations
  status VARCHAR(50),  -- "Online", "Offline", "Maintenance"
  last_heartbeat TIMESTAMP,
  
  -- Configuration
  integration_type VARCHAR(50),  -- "HL7", "REST", "CSV"
  lis_configured BOOLEAN,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

Example:
{
  "device_id": "dev-sysmex-001",
  "device_type": "Hematology Analyzer",
  "manufacturer": "Sysmex",
  "model": "XN-550",
  "serial_number": "SN-2024-00451",
  "status": "Online",
  "last_heartbeat": "2026-04-08T14:45:30Z",
  "last_calibration_date": "2026-04-01",
  "next_calibration_due": "2026-05-01",
  "calibration_status": "Calibrated"
}

DEVICE HEARTBEAT MONITORING

Devices send heartbeat every 5 minutes:

POST /api/v1/lab/device-heartbeat
X-Device-ID: dev-sysmex-001
X-API-Key: [device-api-key]

{
  "device_id": "dev-sysmex-001",
  "timestamp": "2026-04-08T14:45:30Z",
  "status": "operational",
  "queue_size": 3,  -- Pending samples
  "tests_today": 127,
  "last_error": null
}

Alert if no heartbeat received for 15 minutes:
├─ Check device network connectivity
├─ Verify HL7 service is running
├─ Alert biomedical technician
└─ Report to IT

CALIBRATION SCHEDULING

System tracks calibration schedule:

Calibration due reminder (1 week before):
├─ Send alert to lab manager: "Calibration due April 8"
├─ Block new tests before calibration complete

Calibration procedure:
├─ Quality control samples loaded
├─ Device runs known-value samples
├─ Results verified against expected
├─ If passes: Device marked "Calibrated", new date set
├─ If fails: Device marked "Calibration Failed", escalate

Recording calibration:

POST /api/v1/lab/device-calibration
Authorization: Bearer [tech-jwt]
X-Device-ID: dev-sysmex-001

{
  "calibration_date": "2026-04-08",
  "qc_level_1": { "passed": true, "variance": "0.2%" },
  "qc_level_2": { "passed": true, "variance": "0.1%" },
  "qc_level_3": { "passed": true, "variance": "0.3%" },
  "calibration_status": "successful",
  "technician_id": "tech-001",
  "technician_notes": "All QC levels within spec"
}

Response: 200 OK
{
  "status": "success",
  "device_id": "dev-sysmex-001",
  "next_due_date": "2026-05-08",
  "last_calibration": "2026-04-08T14:50:00Z"
}
```

---

**Related Documentation**:
- [DATA_MODEL.md](../product/DATA_MODEL.md) - Laboratory tables schema
- [TESTING_STRATEGY.md](../product/TESTING_STRATEGY.md) - Integration test patterns
- See [API_REFERENCE.md](../product/API_REFERENCE.md) for lab API endpoints

**HL7 Standards**:
- HL7 v2.5 specification: https://www.hl7.org
- LOINC database: https://loinc.org
- MLLP protocol: RFC 1571

**Support**:
- Vendor support for specific analyzers
- HL7 vendor integration team: [contact info]
- Lab IT: [contact info]
