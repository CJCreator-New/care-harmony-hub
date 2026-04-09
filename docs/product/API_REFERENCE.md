# CareSync HIMS - API Reference Guide

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**For**: Backend developers, frontend developers, integration engineers

---

## Table of Contents

1. [Authentication](#authentication)
2. [Base Configuration](#base-configuration)
3. [Core Endpoints](#core-endpoints)
4. [Error Handling](#error-handling)
5. [Common Patterns](#common-patterns)
6. [Rate Limiting & Performance](#rate-limiting--performance)

---

## Authentication

### JWT Bearer Token

All API calls require JWT token in `Authorization` header.

```typescript
// Example: Fetch patients
const response = await fetch('https://api.caresync.local/v1/patients', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
});
```

### Obtaining Token

```typescript
// Login endpoint
POST /auth/login
Content-Type: application/json

{
  "email": "doctor@hospital.com",
  "password": "secure_password"
}

Response 200:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "doctor@hospital.com",
    "role": "doctor",
    "hospital_id": "hospital-uuid"
  },
  "expiresIn": 3600  // seconds
}
```

### Token Refresh

```typescript
// Refresh token before expiry
POST /auth/refresh
Authorization: Bearer ${expiredToken}

Response 200:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}

// After token expires:
Response 401:
{
  "error": "Token expired",
  "message": "Please login again"
}
```

### Logout

```typescript
POST /auth/logout
Authorization: Bearer ${token}

Response 200:
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Base Configuration

### Host & Port

| Environment | URL |
|---|---|
| Local dev | `http://localhost:5173` (frontend), `http://localhost:5432` (Supabase) |
| Staging | `https://staging-api.caresync.local` |
| Production | `https://api.caresync.local` |

### API Version

Current version: `v1`

```
/v1/patients
/v1/appointments
/v1/prescriptions
```

### Headers

```typescript
// Required
'Authorization': `Bearer ${token}`
'Content-Type': 'application/json'

// Optional
'X-Request-ID': 'unique-uuid'  // For tracing
'X-Correlation-ID': 'request-id'  // For distributed tracing
```

### Pagination

```typescript
// Query parameters
GET /v1/patients?page=1&limit=50&sort=last_name&order=asc

Response:
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 523,
    "totalPages": 11,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Core Endpoints

### Patients

#### Get All Patients
```typescript
GET /v1/patients
Query Parameters:
  - page: number (default 1)
  - limit: number (default 50, max 100)
  - search: string (searches name, email, phone)
  - status: 'active' | 'inactive' | 'archived'
  - sort: 'name' | 'created_at' | 'last_visit'
  - order: 'asc' | 'desc'

Headers:
  Authorization: Bearer ${token}

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "hospital_id": "uuid",
      "first_name": "John",
      "last_name": "Smith",
      "date_of_birth": "1975-05-20",
      "email": "john@example.com",
      "phone": "+1234567890",
      "gender": "M",
      "allergies": ["Penicillin"],
      "chronic_conditions": ["Hypertension", "Diabetes"],
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-04-08T14:30:00Z"
    }
  ],
  "pagination": {...}
}

Errors:
  401: Unauthorized (invalid/expired token)
  403: Forbidden (user lacks permission 'patients:read')
  500: Server error
```

#### Get Patient by ID
```typescript
GET /v1/patients/:patientId

Response 200:
{
  "id": "uuid",
  "hospital_id": "uuid",
  "first_name": "John",
  "last_name": "Smith",
  // ... full patient record
}

Errors:
  404: Patient not found
  403: Access denied (patient in different hospital)
```

#### Create Patient
```typescript
POST /v1/patients
Content-Type: application/json

Body:
{
  "first_name": "John",
  "last_name": "Smith",
  "date_of_birth": "1975-05-20",
  "email": "john@example.com",
  "phone": "+1234567890",
  "gender": "M",
  "allergies": ["Penicillin"],
  "chronic_conditions": ["Hypertension"]
}

Response 201:
{
  "id": "new-patient-uuid",
  "hospital_id": "hospital-uuid",
  // ... full patient record
}

Errors:
  400: Bad request (missing required fields)
  403: Forbidden (no 'patients:create' permission)
  409: Conflict (email already exists)
```

#### Update Patient
```typescript
PATCH /v1/patients/:patientId
Content-Type: application/json

Body: (any updatable field)
{
  "phone": "+1987654321",
  "allergies": ["Penicillin", "Sulfa"]
}

Response 200:
{
  "id": "patient-uuid",
  // ... updated patient record
}

Errors:
  404: Patient not found
  403: Forbidden (no 'patients:update' permission)
```

### Appointments

#### Get Hospital Appointments
```typescript
GET /v1/appointments
Query Parameters:
  - status: 'scheduled' | 'checked_in' | 'completed' | 'cancelled'
  - date: '2026-04-15' (specific date)
  - date_from: '2026-04-15' (date range start)
  - date_to: '2026-04-30' (date range end)
  - doctor_id: 'uuid' (filter by doctor)
  - patient_id: 'uuid' (filter by patient)

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "hospital_id": "uuid",
      "patient_id": "uuid",
      "doctor_id": "uuid",
      "appointment_date": "2026-04-15T14:00:00Z",
      "chief_complaint": "Annual checkup",
      "status": "scheduled",
      "appointment_type": "in-person" | "telemedicine",
      "location": "Building A, Room 304",
      "notes": "Patient has mobility issues, use accessible entry",
      "created_at": "2026-03-15T10:00:00Z",
      "updated_at": "2026-04-08T14:30:00Z"
    }
  ],
  "pagination": {...}
}
```

#### Create Appointment
```typescript
POST /v1/appointments
Content-Type: application/json

Body:
{
  "patient_id": "uuid",
  "doctor_id": "uuid",
  "appointment_date": "2026-04-15T14:00:00Z",
  "chief_complaint": "Annual checkup",
  "appointment_type": "in-person",
  "location": "Building A, Room 304",
  "notes": "Patient requires accessible parking"
}

Response 201:
{
  "id": "new-appointment-uuid",
  // ... full appointment record
}
```

#### Update Appointment Status
```typescript
PATCH /v1/appointments/:appointmentId/status
Content-Type: application/json

Body:
{
  "status": "checked_in" | "completed" | "cancelled",
  "reason": "Patient no-show" // if cancelled
}

Response 200:
{
  "id": "appointment-uuid",
  "status": "checked_in",
  "updated_at": "2026-04-15T14:00:00Z"
}
```

### Consultations

#### Create Consultation
```typescript
POST /v1/consultations
Content-Type: application/json

Body:
{
  "appointment_id": "uuid",
  "patient_id": "uuid",
  "doctor_id": "uuid",
  "chief_complaint": "Persistent cough × 3 days",
  "hpi": "Patient reports dry cough that started Friday...",
  "physical_exam": {
    "temp": 101.5,
    "bp": "140/90",
    "hr": 98,
    "lungs": "Clear bilaterally"
  },
  "assessment": "Acute bronchitis",
  "plan": "Rest, hydration, follow up in 3 days"
}

Response 201:
{
  "id": "new-consultation-uuid",
  "status": "draft",
  // ... full consultation record
}
```

#### Sign Consultation
```typescript
POST /v1/consultations/:consultationId/sign
Content-Type: application/json

Body:
{
  "signature": "base64-encoded-signature-image",
  "timestamp": "2026-04-15T14:30:00Z"
}

Response 200:
{
  "id": "consultation-uuid",
  "status": "signed",
  "signed_at": "2026-04-15T14:30:00Z",
  "signed_by": "doctor-uuid"
}

Errors:
  400: Consultation already signed
  403: Only consulting doctor can sign
```

### Prescriptions

#### Get Prescriptions for Patient
```typescript
GET /v1/patients/:patientId/prescriptions
Query Parameters:
  - status: 'active' | 'completed' | 'cancelled'
  - include_history: true | false (default false)

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "drug_name": "Metformin",
      "dose": 500,
      "unit": "mg",
      "frequency": "twice daily",
      "route": "oral",
      "start_date": "2026-01-15",
      "end_date": "2026-04-15",
      "instructions": "Take with food",
      "refills_remaining": 1,
      "dispensed_date": "2026-01-18",
      "dispensed_by": "pharmacist-uuid",
      "status": "active"
    }
  ]
}
```

#### Create Prescription
```typescript
POST /v1/prescriptions
Content-Type: application/json

Body:
{
  "patient_id": "uuid",
  "consultation_id": "uuid",
  "drug_name": "Metformin",
  "dose": 500,
  "unit": "mg",
  "frequency": "twice daily",
  "route": "oral",
  "start_date": "2026-04-15",
  "end_date": "2026-07-15",
  "instructions": "Take with food",
  "refills": 3
}

Response 201:
{
  "id": "new-prescription-uuid",
  "status": "pending_approval",
  // ... full prescription record
}
```

#### Approve Prescription
```typescript
POST /v1/prescriptions/:prescriptionId/approve
Authorization: Bearer ${token}  // Must be pharmacist

Response 200:
{
  "id": "prescription-uuid",
  "status": "approved",
  "approved_at": "2026-04-15T14:30:00Z",
  "approved_by": "pharmacist-uuid"
}

Errors:
  403: Only pharmacist can approve
  400: Prescription already approved/cancelled
```

### Lab Orders & Results

#### Create Lab Order
```typescript
POST /v1/lab-orders
Content-Type: application/json

Body:
{
  "patient_id": "uuid",
  "consultation_id": "uuid",
  "doctor_id": "uuid",
  "test_name": "Complete Blood Count",
  "test_code": "CBC",
  "urgency": "routine" | "stat",
  "specimen_type": "Blood",
  "special_instructions": "Fasting",
  "date_needed_by": "2026-04-16T00:00:00Z"
}

Response 201:
{
  "id": "new-lab-order-uuid",
  "status": "pending_collection",
  // ... full lab order record
}
```

#### Get Lab Results for Patient
```typescript
GET /v1/patients/:patientId/lab-results
Query Parameters:
  - status: 'pending' | 'completed' | 'approved'
  - date_from: '2026-04-01'
  - date_to: '2026-04-30'

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "lab_order_id": "uuid",
      "test_name": "Complete Blood Count",
      "test_code": "CBC",
      "result_date": "2026-04-16T10:00:00Z",
      "values": {
        "wbc": { "value": 7.2, "unit": "K/uL", "reference_range": "4.5-11.0", "flag": null },
        "rbc": { "value": 4.8, "unit": "M/uL", "reference_range": "4.5-5.9", "flag": null },
        "hemoglobin": { "value": 14.5, "unit": "g/dL", "reference_range": "13.5-17.5", "flag": null }
      },
      "critical_value": false,
      "status": "completed",
      "approved_by": "doctor-uuid",
      "approved_at": "2026-04-16T11:00:00Z"
    }
  ]
}
```

---

## Error Handling

### Standard Error Response

```typescript
Response 400/401/403/500:
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field": "what went wrong"  // Only for validation errors
  },
  "timestamp": "2026-04-15T14:30:00Z",
  "requestId": "uuid"  // For support reference
}
```

### Error Codes

| Code | Status | Meaning | Action |
|------|--------|---------|--------|
| `INVALID_TOKEN` | 401 | Token expired or invalid | Refresh token, re-login if needed |
| `INSUFFICIENT_PERMISSION` | 403 | User lacks required permission | Grant permission from admin |
| `VALIDATION_ERROR` | 400 | Bad request format | Check request body against schema |
| `NOT_FOUND` | 404 | Resource doesn't exist | Verify ID is correct |
| `DUPLICATE_ENTRY` | 409 | Unique constraint violated | Check for duplicate email, etc. |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait, then retry |
| `SERVER_ERROR` | 500 | Server-side error | Contact support with requestId |

### Example Error Response

```typescript
Response 403:
{
  "error": "INSUFFICIENT_PERMISSION",
  "message": "User does not have permission to approve prescriptions",
  "details": {
    "required_permission": "prescriptions:approve",
    "user_permissions": ["prescriptions:read", "prescriptions:create"]
  },
  "timestamp": "2026-04-15T14:30:00Z",
  "requestId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6"
}
```

---

## Common Patterns

### Multi-Tenancy Query Pattern

```typescript
// All queries automatically filtered by hospital_id
// Supabase RLS policies enforce this at database level

// User with hospital_id "hosp-123" can only see:
GET /v1/patients
→ Returns patients where hospital_id = "hosp-123"

// Cannot see patients from other hospitals even if ID known:
GET /v1/patients/patient-from-other-hosp
Response 403: Access Denied (RLS policy blocks)
```

### Permission Checking Pattern

```typescript
// API validates permissions before action
POST /v1/prescriptions/:prescriptionId/approve
Authorization: Bearer ${token}
→ Checks user has 'prescriptions:approve' permission
→ If yes: Approval succeeds
→ If no: Returns 403 Forbidden

// 3-layer enforcement:
// 1. Frontend (usePermissions hook) - UX convenience
// 2. API (permission check) - business logic
// 3. Database (RLS policies) - ultimate security
```

### Handling Timestamps

```typescript
// All timestamps are ISO 8601 format, UTC timezone
"created_at": "2026-04-15T14:30:00.000Z"
"updated_at": "2026-04-15T14:30:00.000Z"

// Convert to local time in frontend
const localTime = new Date("2026-04-15T14:30:00Z").toLocaleString();
// Output: "4/15/2026, 10:30:00 AM" (depends on browser locale)
```

### Handling Null Values

```typescript
// Optional fields may be null
{
  "id": "uuid",
  "phone": null,  // Not provided during registration
  "allergies": ["Penicillin"],  // Empty array if no allergies
  "notes": ""  // Empty string, never null for text fields
}

// Always check:
if (patient.phone) {
  // Safe to use
}
```

---

## Rate Limiting & Performance

### Rate Limits

| Endpoint Type | Requests | Per | Example |
|---|---|---|---|
| Read (GET) | 1000 | minute | Listing patients |
| Write (POST, PATCH) | 100 | minute | Creating appointment |
| Authentication | 10 | minute | Login attempts |
| Bulk export | 5 | hour | Export all records |

```typescript
Response 429: Too Many Requests
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded: 1000 requests per minute",
  "retryAfter": 60  // seconds
}

// Exponential backoff strategy:
// Delay 1s, retry
// If fails: Delay 2s, retry
// If fails: Delay 4s, retry
// If fails: Delay 8s, retry
// If fails: Delay 16s, retry
// Max: 5 retries
```

### Performance Best Practices

```typescript
// ✅ GOOD: Get only fields you need
GET /v1/patients?fields=id,first_name,last_name,email

// ❌ SLOW: Get all fields, then filter in frontend
GET /v1/patients
→ Get all 50+ fields per patient
→ Filter in frontend

// ✅ GOOD: Paginate large result sets
GET /v1/appointments?date=2026-04-15&limit=50&page=1

// ❌ WRONG: Fetch all appointments
GET /v1/appointments
→ Could return 10,000+ appointments

// ✅ GOOD: Use filters
GET /v1/patients?status=active&hospital_id=hosp-123

// ❌ WRONG: Fetch all, filter in code
GET /v1/patients
→ Filter = hundreds of records processed
```

---

## SDK Examples

### JavaScript/TypeScript (Supabase Client)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hospital.supabase.co',
  'your-anon-key'
);

// Fetch patients
const { data, error } = await supabase
  .from('patients')
  .select('*')
  .eq('hospital_id', hospital.id)
  .order('last_name')
  .limit(50);

if (error) {
  console.error('Error fetching patients:', error);
} else {
  console.log('Patients:', data);
}
```

### React Hook Pattern

```typescript
import { useQuery } from '@tanstack/react-query';

export function usePatients() {
  const { hospital } = useAuthContext();
  
  return useQuery({
    queryKey: ['patients', hospital?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('hospital_id', hospital!.id);
      
      if (error) throw error;
      return data;
    }
  });
}
```

---

**Questions?** Contact API support or reference [SYSTEM_ARCHITECTURE.md](../product/SYSTEM_ARCHITECTURE.md) for architecture details.
