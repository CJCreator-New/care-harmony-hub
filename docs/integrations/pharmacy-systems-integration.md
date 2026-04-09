# Pharmacy Systems Integration Guide — CareSync HIMS

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**Audience**: Integration engineers, pharmacy IT specialists, pharmacy directors

---

## Table of Contents

1. [Overview](#overview)
2. [Prescription Transmission](#prescription-transmission)
3. [Inventory Management](#inventory-management)
4. [Refill Authorization](#refill-authorization)
5. [External Pharmacy Network](#external-pharmacy-network)
6. [Compliance & Error Handling](#compliance--error-handling)

---

## Overview

### Supported Pharmacy Systems

CareSync integrates with pharmacy management systems through industry standards:

| Pharmacy System | Type | Protocol | Features |
|---|---|---|---|
| Independent systems (hospital-based) | Internal | REST API / HL7 | Full control, direct integration |
| Large chains (CVS, Walgreens) | External | NCPDP SCRIPT, REST | Routing, refills, patient notifications |
| Retail/community pharmacies | External | Fax, email, manual | Traditional transmission methods |
| Mail-order pharmacies | External | APIs (varies) | Shipping integration, refill management |
| Specialty pharmacies | External | Secure APIs | Controlled substance tracking |

**Primary integration method**: NCPDP SCRIPT + REST APIs for e-prescribing

---

## Prescription Transmission

### Electronic Prescription (E-Rx) Workflow

```
PRESCRIPTION TRANSMISSION FLOW

Step 1: Doctor creates & signs prescription in CareSync

Doctor workflow:
├─ Patient: John Smith
├─ Drug: Metformin 500mg
├─ Dose: 1 tablet BID (twice daily)
├─ Quantity: 60 tablets
├─ Refills: 3
├─ Instructions: Take with food
├─ Submit: [SIGN & SEND]

System: Prescription record created & signed with digital signature

Step 2: CareSync formats prescription per NCPDP SCRIPT standard

NCPDP SCRIPT Format (XML):

<?xml version="1.0" encoding="UTF-8"?>
<NewRx>
  <NCPDP>
    <!-- Prescriber information -->
    <TransmissionHeader>
      <SenderID>CARESYNC-HIMS-001</SenderID>
      <ReceiverID>PHARMACY-CVS-012345</ReceiverID>
      <Timestamp>2026-04-08T14:32:00Z</Timestamp>
      <TransactionID>TXN-2026-0424-001</TransactionID>
    </TransmissionHeader>
    
    <!-- Prescriber (doctor) -->
    <Prescriber>
      <NPI>1912345678</NPI>
      <FirstName>Sarah</FirstName>
      <LastName>Chen</LastName>
      <DEA>BC1234567</DEA>
      <StateLicense>MD-456789</StateLicense>
      <Phone>555-123-4567</Phone>
      <Address>123 Medical Place</Address>
      <City>Metro City</City>
      <State>ST</State>
      <Zip>12345</Zip>
    </Prescriber>
    
    <!-- Patient information -->
    <Patient>
      <ID>PATIENT-12345</ID>
      <FirstName>John</FirstName>
      <LastName>Smith</LastName>
      <DOB>1975-05-20</DOB>
      <Gender>M</Gender>
      <Phone>555-987-6543</Phone>
      <Email>john.smith@email.com</Email>
      <Address>456 Main St</Address>
      <City>Metro City</City>
      <State>ST</State>
      <Zip>12345</Zip>
    </Patient>
    
    <!-- Drug information -->
    <Drug>
      <DrugName>Metformin Hydrochloride</DrugName>
      <Strength>500</Strength>
      <StrengthUnit>MG</StrengthUnit>
      <DosageForm>TABLET</DosageForm>
      <NDC>00069010010</NDC>  <!-- National Drug Code -->
    </Drug>
    
    <!-- Directions & quantity -->
    <Directions>
      <Dose>1</Dose>
      <Unit>TABLET</Unit>
      <Frequency>BID</Frequency>   <!-- Twice daily -->
      <Route>PO</Route>            <!-- By mouth -->
      <SpecialInstructions>Take with food</SpecialInstructions>
    </Directions>
    
    <!-- Quantity & refills -->
    <Quantity>60</Quantity>
    <RefillsAuthorized>3</RefillsAuthorized>
    <RefillsRemaining>3</RefillsRemaining>
    
    <!-- Clinical justification -->
    <Indication>Type 2 Diabetes Mellitus (E11.9)</Indication>
    <Diagnosis>T2DM</Diagnosis>
    
    <!-- Signature -->
    <ElectronicSignature>
      <SignedBy>dr-sarah-chen-001</SignedBy>
      <SignatureTimestamp>2026-04-08T14:32:00Z</SignatureTimestamp>
      <SignatureAlgorithm>SHA-256</SignatureAlgorithm>
      <Signature>[digital signature hash]</Signature>
    </ElectronicSignature>
  </NCPDP>
</NewRx>

Step 3: Transmit to pharmacy system

Transmission method depends on pharmacy:

a) Hospital pharmacy (internal):
   └─ Send via local REST API
   
b) Retail pharmacy (CVS, Walgreens):
   └─ Send via NCPDP routing network
   
c) Community pharmacy (no e-Rx):
   └─ Create paper prescription
   └─ Patient prints or picks up at hospital

TRANSMISSION CODE

Code: backend/integrations/ncpdp-transmitter.ts

export async function transmitPrescription(
  prescription: Prescription
) {
  // Format per NCPDP standard
  const ncpdpMessage = formatNCPDPMessage(prescription);
  
  // Determine pharmacy type
  const pharmacy = await findPharmacy(prescription.pharmacy_id);
  
  if (pharmacy.integration_type === 'REST') {
    // Direct REST API
    return transmitViaRESTAPI(ncpdpMessage, pharmacy);
  } else if (pharmacy.supports_ncpdp_script) {
    // Via routing network
    return transmitViaNCPDPNetwork(ncpdpMessage, pharmacy);
  } else {
    // Fallback: Generate printable prescription
    return generatePrintablePrescription(prescription);
  }
}

async function transmitViaRESTAPI(
  ncpdpMessage: string,
  pharmacy: Pharmacy
) {
  const response = await fetch(`${pharmacy.api_endpoint}/prescriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      'Authorization': `Bearer ${pharmacy.api_token}`,
      'X-Encryption': 'TLS-1.3'
    },
    body: ncpdpMessage
  });
  
  if (!response.ok) {
    throw new Error(`Pharmacy transmission failed: ${response.status}`);
  }
  
  const result = await response.json();
  
  // Log transmission
  await logPrescriptionTransmission({
    prescription_id: prescription.id,
    pharmacy_id: pharmacy.id,
    transmission_method: 'REST_API',
    transmitted_at: new Date(),
    pharmacy_confirmation_id: result.confirmation_id,
    status: 'success'
  });
  
  // Notify patient
  await notifyPatient(prescription.patient_id,
    'Your prescription has been sent to the pharmacy'
  );
  
  return result;
}

Step 4: Pharmacy receives & acknowledges prescription

Pharmacy system:
├─ Receives NCPDP message
├─ Parses prescription details
├─ Verifies drug inventory
├─ Checks patient allergies
├─ Validates insurance coverage
├─ Processes payment
└─ Sends ACK back to CareSync

Acknowledgement message:

{
  "status": "received",
  "confirmation_id": "CONF-CVS-2026-0424-001",
  "estimated_ready_time": "2026-04-08T16:30:00Z",
  "pickup_instructions": "Come to CVS #12345, Lincoln Ave",
  "refills_transferred": 3
}

Step 5: CareSync updates prescription status

System updates:
├─ Prescription status: "transmitted" → "received_by_pharmacy"
├─ Pharmacy confirmation ID stored
├─ Estimated ready time recorded
├─ Patient notification sent: "Your Rx is at CVS"
└─ Prescription PDF archived in patient record
```

### Refill Requests

```
PATIENT REFILL WORKFLOW

Patient requests refill:

1. Via patient portal:
   └─ [REQUEST REFILL] button on medication list
   └─ Select medication: "Metformin 500mg"
   └─ Select pharmacy: "CVS #12345 or default"
   └─ [SUBMIT REQUEST]

2. Via SMS:
   └─ Text "REFILL METFORMIN" to [pharmacy number]
   └─ System parses medication
   └─ Confirms via SMS: "Confirm refill of Metformin? Reply YES/NO"
   └─ Patient: "YES" → Refill submitted

3. Via phone:
   └─ Patient calls pharmacy
   └─ Pharmacist notifies CareSync
   └─ CareSync transmits refill authorization

REFILL PROCESSING

Electronic refill request:

POST /api/v1/prescriptions/request-refill
Authorization: Bearer [patient-jwt]
Content-Type: application/json

{
  "prescription_id": "rx-123",
  "pharmacy_id": "pharmacy-456",
  "patient_id": "pat-789",
  "refill_quantity": 60,
  "requested_at": "2026-04-08T14:45:00Z"
}

Backend processing:

async function processRefillRequest(req: Request) {
  const { prescription_id, pharmacy_id, patient_id } = req.body;
  
  // Verify prescription exists & has refills
  const rx = await getPrescription(prescription_id);
  
  if (!rx) {
    return res.status(404).json({ error: 'Prescription not found' });
  }
  
  if (rx.refills_remaining <= 0) {
    // Need doctor authorization
    return res.status(400).json({
      error: 'No refills remaining',
      action: 'Contact prescriber for authorization'
    });
  }
  
  // Verify pharmacy information
  const pharmacy = await getPharmacy(pharmacy_id);
  if (!pharmacy.e_rx_enabled) {
    return res.status(400).json({
      error: 'Pharmacy does not accept e-refills'
    });
  }
  
  // Check drug interactions (in case other meds added)
  const interactions = await checkInteractions(patient_id, rx.drug_id);
  if (interactions.some(i => i.severity === 'CRITICAL')) {
    return res.status(400).json({
      error: 'Drug interaction detected, contact doctor'
    });
  }
  
  // Create refill prescription
  const refillRx = {
    ...rx,
    id: generateUUID(),
    issue_date: new Date(),
    refills_remaining: rx.refills_remaining - 1,
    is_refill_of: rx.id
  };
  
  // Transmit to pharmacy
  const transmitted = await transmitPrescription(refillRx, pharmacy);
  
  return res.status(200).json({
    status: 'success',
    confirmation_id: transmitted.confirmation_id,
    estimated_ready: transmitted.estimated_ready_time,
    refills_remaining_after: rx.refills_remaining - 1
  });
}

REFILL DENIAL (Need doctor approval)

If refills exhausted:

System action:
├─ Query hospital schedule for prescriber
├─ Send request to doctor: "Patient John Smith requests Metformin refill"
├─ Doctor reviews in app:
│  ├─ Last fill: 90 days ago ✓ (expected timing)
│  ├─ Patient compliance: Good
│  ├─ Recent labs: Normal kidney function ✓
│  └─ [APPROVE REFILL x3] button
│
├─ Doctor approves, system sends to pharmacy
└─ Patient notified: "Your prescription has been refilled"

If doctor unavailable (evening/weekend):
├─ Pharmacy calls on-call doctor number
├─ Verbal authorization obtained
├─ Pharmacist documents in system: "Verbal auth from Dr. Lee, 8:30 PM"
└─ Prescription filled
```

---

## Inventory Management

### Drug Inventory Synchronization

```
INVENTORY API

Hospital pharmacy maintains inventory in CareSync.
External pharmacies report via EDI (Electronic Data Interchange).

Inventory broadcast (every 4 hours):

Hospital pharmacy inventory update:

POST /api/v1/pharmacy/inventory-update
Authorization: Bearer [pharmacy-system-jwt]
Content-Type: application/json

{
  "pharmacy_id": "pharmacy-internal-001",
  "timestamp": "2026-04-08T14:45:00Z",
  "inventory_changes": [
    {
      "ndc": "00069010010",
      "drug_name": "Metformin HCl 500mg",
      "quantity_on_hand": 2450,
      "quantity_low_stock": 500,
      "reorder_point": 1000,
      "status": "in_stock",
      "expiration_date": "2027-12-31",
      "lot_number": "LOT-2026-001"
    },
    {
      "ndc": "00310612307",
      "drug_name": "Lisinopril 10mg",
      "quantity_on_hand": 127,
      "quantity_low_stock": 500,
      "reorder_point": 1000,
      "status": "low_stock",
      "expiration_date": "2027-06-30",
      "lot_number": "LOT-2026-002"
    }
  ]
}

Response: 200 OK
{
  "status": "success",
  "inventory_items_updated": 2,
  "timestamp": "2026-04-08T14:45:15Z"
}

INVENTORY ALERTS

Low stock warning (automatic):

When quantity_on_hand falls below reorder_point:
├─ Alert pharmacist: "Lisinopril 10mg stock below 1000"
├─ Check supplier pricing
├─ Generate purchase order (if approved)
├─ Estimate delivery: 2-3 business days
└─ Block new prescriptions? No (substitute allowed)

Out of stock handling:

If drug becomes unavailable:
├─ Status: "out_of_stock"
├─ Prevent new prescriptions
├─ Notify patients with open prescriptions
├─ Suggest alternative medication (if equivalent)
├─ Patient options:
│  ├─ Wait for restock (ETA: [date])
│  ├─ Fill at different pharmacy
│  └─ Ask doctor for therapeutic alternative

EXPIRED DRUG REMOVAL

Drugs approaching expiration:

Weekly expiration check:
├─ Query inventory for expiration_date < TODAY + 30 days
├─ Alert: "Metformin LOT-2026-001 expires 4/15, remove by 4/8"
├─ Update status: "expired"
├─ Remove from inventory count
└─ Log disposal in audit trail

Drug disposal record:

{
  "ndc": "00069010010",
  "lot_number": "LOT-2026-001",
  "quantity_disposed": 500,
  "expiration_date": "2026-04-15",
  "disposal_date": "2026-04-08",
  "disposal_method": "DEA-compliant incineration",
  "disposal_certificate": "DEA-DISPOSE-2026-001",
  "disposed_by": "Pharmacist Tom"
}
```

---

## Refill Authorization

### Doctor Refill Approval Workflow

```
DOCTOR REFILL DASHBOARD

Doctor sees pending refill requests:

┌─────────────────────────────────────────┐
│ REFILL REQUESTS AWAITING APPROVAL       │
│                                         │
│ 1. John Smith - Metformin 500mg         │
│    Patient note: "Still taking daily"   │
│    Last fill: 90 days ago ✓             │
│    Refills remaining: 1 (this is it)   │
│    [APPROVE] [DENY] [MODIFY]           │
│                                         │
│ 2. Jane Doe - Lisinopril 10mg           │
│    Last fill: 92 days ago ✓             │
│    Recent labs: BP 128/82 ✓             │
│    [APPROVE] [DENY] [MODIFY]           │
│                                         │
│ 3. Robert Wilson - Metoprolol 50mg      │
│    Last fill: 45 days ago (TOO SOON)    │
│    [APPROVE] [DENY] [MODIFY]           │
│    └─ Reason for early refill?         │
└─────────────────────────────────────────┘

APPROVAL LOGIC

Doctor clicks: [APPROVE]

System checks:
├─ Refill appropriate for indication?
├─ Patient compliance check (early refill?)
├─ Recent labs/vitals support continuation?
├─ Drug interactions with current meds?
├─ Insurance coverage available?
└─ Pharmacy has drug in stock?

Approval record:

```sql
INSERT INTO prescription_refills (
  prescription_id,
  requested_by_patient_id,
  approved_by_doctor_id,
  approval_timestamp,
  approval_rationale,
  new_refills_authorized,
  transmission_status
) VALUES (
  'rx-123',
  'pat-789',
  'dr-456',
  '2026-04-08T15:30:00Z',
  'Patient compliant, labs normal, continue therapy',
  3,
  'pending_transmission'
);
```

Transmit refill:
├─ Format refill prescription
├─ Route to patient's preferred pharmacy
├─ Log transmission in refill record
└─ Notify patient: "Your Rx approved and sent to pharmacy"

DENIAL (Need discussion with patient)

Doctor clicks: [DENY]

Doctor required to provide reason:
├─ "Patient not due for refill yet"
├─ "Need to see patient first"
├─ "Drug no longer appropriate"
└─ "Recommend different therapy"

Denial notification to patient:

Email/SMS to patient:
"Your request for Metformin refill was not approved at this time. 
Reason: Need to discuss with your doctor.
Next steps: Call to schedule appointment with Dr. Chen
or message through patient portal."

Doctor notes:
"Patient requested early refill (28 days vs 30 expected). 
Schedule appointment to discuss adherence."

MODIFICATION

Doctor clicks: [MODIFY]

Doctor can adjust:
├─ Quantity (e.g., reduce from 90 days to 30 days)
├─ Dose (e.g., "try 250mg instead of 500mg")
├─ Refills (e.g., approve 2 refills instead of 3)
└─ Pharmacy (send to different location)

Example modification:

Original refill:
├─ Drug: Metformin 500mg
├─ Quantity: 60 tablets
├─ Refills: 1

Modified refill:
├─ Drug: Metformin 500mg
├─ Quantity: 30 tablets (trial dose)
├─ Refills: 0 (call back after 1 month)
├─ Reason: "Dosage trial to assess GI tolerance"
└─ [SEND MODIFIED]

System transmits modified prescription to pharmacy
Patient notified of changes
```

---

## External Pharmacy Network

### Community Pharmacy Integration

```
EXTERNAL PHARMACY ROUTING

Patient selects pharmacy not affiliated with hospital:

Patient chooses: "CVS #12345 on Main Street"

CareSync system:
├─ Looks up pharmacy in network directory
├─ Verifies e-Rx capability
├─ Retrieves pharmacy APIs/routing info
└─ Routes prescription via appropriate method

Pharmacy directory entry:

```sql
CREATE TABLE external_pharmacies (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  npi_number VARCHAR(10),
  address TEXT,
  phone VARCHAR(20),
  
  -- E-Rx capabilities
  accepts_erx BOOLEAN,
  erx_network VARCHAR(100),  -- "NCPDP", "direct", "fax"
  erx_endpoint VARCHAR(255),
  erx_api_key VARCHAR(255) ENCRYPTED,
  
  -- Refill capability
  accepts_refill_requests BOOLEAN,
  
  -- Delivery
  accepts_delivery BOOLEAN,
  delivery_available BOOLEAN,
  
  -- Specialty
  accepts_controlled_substances BOOLEAN,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

Example:
```json
{
  "id": "pharm-cvs-12345",
  "name": "CVS Pharmacy #12345",
  "address": "123 Main St, Metro City, ST 12345",
  "phone": "555-123-4567",
  "accepts_erx": true,
  "erx_network": "NCPDP_SCRIPT",
  "accepts_refill_requests": true,
  "accepts_delivery": true,
  "accepts_controlled_substances": true
}
```

PRESCRIPTION ROUTING VIA NCPDP NETWORK

For external pharmacies, use NCPDP routing:

1. CareSync connects to NCPDP routing service
   └─ Credentials: Hospital NCPDP ID, credentials
   
2. Format prescription in NCPDP SCRIPT format
   └─ XML message as described earlier
   
3. Send to NCPDP network
   └─ NCPDP routes to target pharmacy
   
4. Pharmacy receives & acknowledges
   └─ ACK sent back through NCPDP network
   
5. CareSync receives confirmation
   └─ Update prescription status
   └─ Notify patient

TRANSMISSION CODE

export async function routePrescriptionToExternalPharmacy(
  prescription: Prescription,
  pharmacy: ExternalPharmacy
) {
  // Check if pharmacy on NCPDP network
  if (pharmacy.erx_network === 'NCPDP_SCRIPT') {
    // Use NCPDP routing
    const ncpdpMessage = formatNCPDPMessage(prescription);
    
    return routeViaNCPDP(ncpdpMessage, pharmacy);
  } else if (pharmacy.erx_endpoint) {
    // Direct API if available
    return routeViaDirectAPI(prescription, pharmacy);
  } else {
    // Fallback: Generate faxable prescription
    return generateFaxablePrescription(prescription, pharmacy);
  }
}

async function routeViaNCPDP(
  ncpdpMessage: string,
  pharmacy: ExternalPharmacy
) {
  const ncpdpClient = new NCPDPClient({
    hospital_id: process.env.NCPDP_HOSPITAL_ID,
    credentials: process.env.NCPDP_CREDENTIALS
  });
  
  const result = await ncpdpClient.send({
    target_pharmacy_npi: pharmacy.npi_number,
    message_content: ncpdpMessage,
    priority: 'normal'
  });
  
  if (!result.success) {
    // Log failure, alert user
    throw new Error(`NCPDP transmission failed: ${result.error}`);
  }
  
  // Log successful transmission
  await logTransmission({
    prescription_id: prescription.id,
    pharmacy_id: pharmacy.id,
    method: 'NCPDP',
    confirmation_id: result.transmission_id,
    status: 'transmitted'
  });
  
  return result;
}

FAX FALLBACK (For non-e-Rx pharmacies)

For older pharmacies without e-Rx:

1. Generate prescription PDF
   └─ Formatted for faxing
   └─ Includes doctor signature image
   
2. Send via eFax API
   └─ Service: eFax, HelloFax, or similar
   └─ Recipient: Pharmacy fax number
   
3. Confirm fax delivery
   └─ Delivery confirmation logged
   └─ Patient notification sent
   
4. Manual follow-up (if needed)
   └─ Pharmacy calls if unclear
   └─ Doctor callback if questions

Code:

async function transmitViafax(
  prescription: Prescription,
  pharmacy: ExternalPharmacy
) {
  // Generate PDF
  const prescriptionPDF = await generatePrescriptionPDF(prescription);
  
  // Send via eFax
  const faxResult = await efaxClient.send({
    recipient_fax: pharmacy.fax_number,
    document: prescriptionPDF,
    coversheet: true,
    subject: `Prescription for ${prescription.patient.name}`
  });
  
  if (!faxResult.successful) {
    throw new Error(`Fax transmission failed: ${faxResult.error}`);
  }
  
  // Log in system
  await logTransmission({
    prescription_id: prescription.id,
    pharmacy_id: pharmacy.id,
    method: 'FAX',
    fax_number: pharmacy.fax_number,
    tracking_number: faxResult.tracking_id,
    status: 'transmitted',
    requires_manual_followup: true
  });
  
  // Send manual reminder to pharmacy
  await sendPharmacyReminder(pharmacy, prescription, '10m');
}
```

---

## Compliance & Error Handling

### HIPAA Compliance for E-Rx

```
PRESCRIPTION PRIVACY & SECURITY

HIPAA Requirements:

1. Transmission Security
   ├─ TLS 1.3 minimum for all transmissions
   ├─ NCPDP uses encryption for routing
   ├─ No unencrypted prescription data in transit
   └─ Audit log: Every transmission logged

2. Access Control
   ├─ Only doctor can initiate transmission
   ├─ Only pharmacist can receive
   ├─ Patient cannot modify prescription
   ├─ Admin access limited to audit purposes
   └─ role-based access per hospital policy

3. Audit Trail
   ├─ Every transmission logged (immutable)
   ├─ Timestamp, user, action, result
   ├─ 6-year retention (HIPAA minimum)
   └─ Tampering detection enabled

4. Encryption at Rest
   ├─ Transmitted prescriptions encrypted in DB
   ├─ Patient notes encrypted
   ├─ Pharmacy confirmation data encrypted
   └─ Key rotation: Quarterly

5. Patient Rights
   ├─ Patient can request pharmacy history
   ├─ Patient can object to pharmacy choice (limited)
   ├─ Patient can request access to prescription log
   └─ Patient can request data deletion (after retention period)

CONSENT DOCUMENTATION

Patient must consent to e-prescribing:

Before first e-Rx transmission:

┌───────────────────────────────┐
│   E-PRESCRIBING CONSENT       │
│                               │
│ I consent to electronic       │
│ prescriptions being sent to:  │
│                               │
│ CVS Pharmacy #12345           │
│ 123 Main St, Metro City       │
│                               │
│ I understand:                 │
│ ☑ Prescription transmitted    │
│   over secure network         │
│ ☑ Pharmacy receives copy      │
│ ☑ I may revoke anytime        │
│ ☑ Paper option still available│
│                               │
│ [AGREE] [DECLINE]            │
├───────────────────────────────┤
│ Date: ___________            │
│ Signature: __________________ │
└───────────────────────────────┘

Record in system:

{
  "patient_id": "pat-789",
  "consent_type": "e_prescribing",
  "pharmacy_id": "pharm-cvs-12345",
  "consented": true,
  "consent_date": "2026-04-08T14:45:00Z",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "revocable": true
}

ERROR HANDLING & RECOVERY

Transmission failure scenarios:

1. Network connectivity error
   └─ Retry: Exponential backoff (5s, 10s, 30s, 1m, 5m)
   └─ Alert: If fails after 5 retries, notify pharmacy staff

2. Pharmacy system down
   └─ Status: "delivery_failed_pharmacy_unavailable"
   └─ Retry: Auto-retry every 15 minutes (24 hours)
   └─ Alert: "Pharmacy system unavailable, will retry soon"

3. Invalid pharmacy information
   └─ Error: "Pharmacy NPI not found in network"
   └─ Resolution: Update pharmacy information, retry

4. Patient insurance issues
   └─ Error: "Insurance verification failed"
   └─ Resolution: Pharmacy handles during filling

5. Drug out of stock
   └─ Pharmacy notifies: "Drug not in stock"
   └─ Patient options: Wait, substitute, or transfer to another pharmacy

DISASTER RECOVERY

If communication channel fails completely:

Fallback protocol:

1. Generate paper prescription
   └─ Printable by patient or doctor
   
2. Contact pharmacy manually
   └─ Phone call by staff
   └─ Verbal verification with doctor
   
3. Document fallback in refill record
   └─ Reason: Channel unavailable
   └─ Method: Phone/paper
   └─ Time: Date/time of transmission
   
4. Resume e-Rx once restored
   └─ Verify network connectivity
   └─ Retry transmission
   └─ Confirm receipt with pharmacy
```

---

**Related Documentation**:
- [SECURITY_CHECKLIST.md](../product/SECURITY_CHECKLIST.md) - E-Rx security requirements
- [API_REFERENCE.md](../product/API_REFERENCE.md) - Pharmacy API endpoints
- [DATA_MODEL.md](../product/DATA_MODEL.md) - Prescription database schema

**Standards**:
- NCPDP SCRIPT standard: https://www.ncpdp.org
- HIPAA e-prescribing: https://www.hhs.gov/hipaa

**Support**:
- Pharmacy vendor support: [contact]
- NCPDP network support: [1-888-622-7388]
- E-Rx technical team: [internal contact]
