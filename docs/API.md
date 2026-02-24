# API Reference

## Overview

CareSync uses Supabase as the backend, providing:
- **Database API**: Auto-generated REST API from PostgreSQL
- **Auth API**: User authentication and session management
- **Edge Functions**: Serverless functions for custom logic
- **Realtime**: WebSocket subscriptions for live updates

---

## Authentication

### Sign Up

```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securePassword123!',
  options: {
    data: {
      first_name: 'John',
      last_name: 'Doe',
      role: 'doctor',
    }
  }
});
```

### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securePassword123!'
});
```

### Sign Out

```typescript
const { error } = await supabase.auth.signOut();
```

### Get Current User

```typescript
const { data: { user } } = await supabase.auth.getUser();
```

### Password Reset

```typescript
// Request reset
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/hospital/reset-password`
});

// Update password
const { error } = await supabase.auth.updateUser({
  password: 'newSecurePassword123!'
});
```

---

## Database Operations

### Patients

#### List Patients

```typescript
const { data: patients, error } = await supabase
  .from('patients')
  .select('*')
  .eq('hospital_id', hospitalId)
  .eq('is_active', true)
  .order('created_at', { ascending: false });
```

#### Get Patient by ID

```typescript
const { data: patient, error } = await supabase
  .from('patients')
  .select(`
    *,
    appointments(count),
    consultations(count)
  `)
  .eq('id', patientId)
  .single();
```

#### Create Patient

```typescript
const { data, error } = await supabase
  .from('patients')
  .insert({
    hospital_id: hospitalId,
    first_name: 'Jane',
    last_name: 'Doe',
    date_of_birth: '1990-01-15',
    gender: 'female',
    phone: '+1234567890',
    email: 'jane@example.com',
    mrn: generateMRN()
  })
  .select()
  .single();
```

#### Update Patient

```typescript
const { data, error } = await supabase
  .from('patients')
  .update({
    phone: '+0987654321',
    allergies: ['Penicillin', 'Sulfa']
  })
  .eq('id', patientId)
  .select()
  .single();
```

### Appointments

#### List Today's Appointments

```typescript
const today = new Date().toISOString().split('T')[0];

const { data: appointments, error } = await supabase
  .from('appointments')
  .select(`
    *,
    patient:patients(first_name, last_name, mrn),
    doctor:profiles!appointments_doctor_id_fkey(first_name, last_name)
  `)
  .eq('hospital_id', hospitalId)
  .eq('scheduled_date', today)
  .order('scheduled_time', { ascending: true });
```

#### Schedule Appointment

```typescript
const { data, error } = await supabase
  .from('appointments')
  .insert({
    hospital_id: hospitalId,
    patient_id: patientId,
    doctor_id: doctorId,
    scheduled_date: '2024-01-20',
    scheduled_time: '10:00',
    duration_minutes: 30,
    appointment_type: 'follow-up',
    priority: 'normal',
    status: 'scheduled'
  })
  .select()
  .single();
```

#### Update Appointment Status

```typescript
const { data, error } = await supabase
  .from('appointments')
  .update({
    status: 'checked_in',
    check_in_time: new Date().toISOString()
  })
  .eq('id', appointmentId)
  .select()
  .single();
```

### Consultations

#### Start Consultation

```typescript
const { data, error } = await supabase
  .from('consultations')
  .insert({
    hospital_id: hospitalId,
    patient_id: patientId,
    doctor_id: doctorId,
    appointment_id: appointmentId,
    status: 'in_progress',
    current_step: 1,
    started_at: new Date().toISOString()
  })
  .select()
  .single();
```

#### Update Consultation

```typescript
const { data, error } = await supabase
  .from('consultations')
  .update({
    current_step: 3,
    chief_complaint: 'Persistent headache',
    symptoms: ['headache', 'nausea', 'light sensitivity'],
    vitals: {
      blood_pressure: '120/80',
      heart_rate: 72,
      temperature: 98.6,
      respiratory_rate: 16,
      oxygen_saturation: 98
    }
  })
  .eq('id', consultationId)
  .select()
  .single();
```

#### Complete Consultation

```typescript
const { data, error } = await supabase
  .from('consultations')
  .update({
    status: 'completed',
    current_step: 5,
    final_diagnosis: ['Migraine without aura'],
    treatment_plan: 'Rest, hydration, OTC pain relief...',
    completed_at: new Date().toISOString()
  })
  .eq('id', consultationId)
  .select()
  .single();
```

### Prescriptions

#### Create Prescription

```typescript
// Create prescription
const { data: prescription, error } = await supabase
  .from('prescriptions')
  .insert({
    hospital_id: hospitalId,
    consultation_id: consultationId,
    patient_id: patientId,
    prescribed_by: doctorId,
    prescription_number: generateRxNumber(),
    status: 'pending'
  })
  .select()
  .single();

// Add prescription items
const { data: items, error: itemsError } = await supabase
  .from('prescription_items')
  .insert([
    {
      prescription_id: prescription.id,
      medication_name: 'Ibuprofen',
      dosage: '400mg',
      frequency: 'TID',
      duration: '5 days',
      quantity: 15,
      instructions: 'Take with food'
    }
  ]);
```

### Lab Orders

#### Create Lab Order

```typescript
const { data, error } = await supabase
  .from('lab_orders')
  .insert({
    hospital_id: hospitalId,
    patient_id: patientId,
    consultation_id: consultationId,
    ordered_by: doctorId,
    test_name: 'Complete Blood Count',
    test_code: 'CBC',
    test_category: 'Hematology',
    priority: 'normal',
    status: 'ordered',
    specimen_type: 'Blood',
    ordered_at: new Date().toISOString()
  })
  .select()
  .single();
```

#### Enter Lab Results

```typescript
const { data, error } = await supabase
  .from('lab_orders')
  .update({
    status: 'completed',
    results: {
      hemoglobin: { value: 14.5, unit: 'g/dL', normal: '12-16' },
      wbc: { value: 7500, unit: '/µL', normal: '4000-11000' },
      platelets: { value: 250000, unit: '/µL', normal: '150000-400000' }
    },
    is_critical: false,
    processed_by: labTechId,
    completed_at: new Date().toISOString()
  })
  .eq('id', labOrderId)
  .select()
  .single();
```

---

## Edge Functions

### Appointment Reminders

**Endpoint**: `/functions/v1/appointment-reminders`

Sends reminder notifications 24 hours before appointments.

```typescript
// Called via cron or manually
const { data, error } = await supabase.functions.invoke('appointment-reminders');
```

### Lab Critical Values

**Endpoint**: `/functions/v1/lab-critical-values`

Alerts doctors about critical lab results.

```typescript
const { data, error } = await supabase.functions.invoke('lab-critical-values', {
  body: { labOrderId }
});
```

### Check Low Stock

**Endpoint**: `/functions/v1/check-low-stock`

Monitors medication inventory and alerts for reorder.

```typescript
const { data, error } = await supabase.functions.invoke('check-low-stock', {
  body: { hospitalId }
});
```

### Send Notification

**Endpoint**: `/functions/v1/send-notification`

Generic notification sender.

```typescript
const { data, error } = await supabase.functions.invoke('send-notification', {
  body: {
    recipientId: userId,
    title: 'Appointment Reminder',
    message: 'Your appointment is tomorrow at 10:00 AM',
    type: 'appointment_reminder',
    priority: 'normal'
  }
});
```

### Monitoring

**Endpoint**: `/functions/v1/monitoring`

System monitoring and alerting service.

```typescript
// Collect system metrics
const { data, error } = await supabase.functions.invoke('monitoring', {
  body: {
    action: 'collect_metrics',
    data: [{
      timestamp: new Date().toISOString(),
      service: 'frontend',
      metric_name: 'page_load_time',
      value: 1250,
      status: 'normal'
    }]
  }
});

// Check alerts
const { data: alerts, error } = await supabase.functions.invoke('monitoring', {
  body: { action: 'check_alerts' }
});

// Get system status
const { data: status, error } = await supabase.functions.invoke('monitoring', {
  body: { action: 'get_status' }
});
```

---

## Error Tracking API

### Log Error

```typescript
import { useErrorTracking } from '@/hooks/useErrorTracking';

const { logError } = useErrorTracking();

// Log an error with context
await logError(new Error('Database connection failed'), {
  severity: 'high',
  userId: currentUserId,
  additionalContext: { operation: 'patient_search' }
});
```

### Retrieve Error Logs

```typescript
// Get error logs (admin only)
const { data: errorLogs, error } = await supabase
  .from('error_logs')
  .select('*')
  .eq('severity', 'critical')
  .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  .order('timestamp', { ascending: false })
  .limit(100);
```

### Performance Monitoring

```typescript
// Log performance metrics
const { data, error } = await supabase
  .from('performance_logs')
  .insert({
    type: 'slow_page_load',
    value: 3500, // milliseconds
    threshold: 2000,
    page: '/dashboard',
    user_agent: navigator.userAgent
  });
```

---

## Realtime Subscriptions

### Subscribe to Queue Updates

```typescript
const channel = supabase
  .channel('queue-updates')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'patient_queue',
      filter: `hospital_id=eq.${hospitalId}`
    },
    (payload) => {
      console.log('Queue updated:', payload);
      // Update UI
    }
  )
  .subscribe();

// Cleanup
channel.unsubscribe();
```

### Subscribe to Notifications

```typescript
const channel = supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `recipient_id=eq.${userId}`
    },
    (payload) => {
      showNotification(payload.new);
    }
  )
  .subscribe();
```

---

## Error Handling

### Standard Error Response

```typescript
interface SupabaseError {
  message: string;
  details: string;
  hint: string;
  code: string;
}

// Usage
const { data, error } = await supabase.from('patients').select('*');

if (error) {
  console.error('Database error:', error.message);
  // Handle specific error codes
  if (error.code === '23505') {
    // Unique constraint violation
  } else if (error.code === '42501') {
    // RLS policy violation
  }
}
```

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 23505 | Unique violation | Duplicate entry exists |
| 42501 | Permission denied | Check RLS policies |
| 22P02 | Invalid input | Validate data types |
| 23503 | Foreign key violation | Referenced record doesn't exist |
| PGRST116 | No rows found | Handle empty result |

---

## Rate Limits

- **Database**: 1000 requests/second
- **Auth**: 30 requests/minute for sign-up/sign-in
- **Edge Functions**: 100 concurrent executions
- **Realtime**: 100 connections per project

---

## Edge Functions Reference

All edge functions are hosted at:
```
https://<SUPABASE_PROJECT_ID>.supabase.co/functions/v1/<function-name>
```

### Authentication Tiers

| Tier | Header Required | Description |
|------|----------------|-------------|
| **Authenticated** | `Authorization: Bearer <jwt>` | Valid Supabase session JWT |
| **Service Role** | Internal only | Called server-side via service key |
| **Public** | None | No auth required (health check only) |

---

### Authentication & 2FA Functions

#### `generate-2fa-secret`
- **Method**: `POST`
- **Auth**: Authenticated
- **Purpose**: Generates a new TOTP secret for the current user
- **Request**: `{}` (empty — uses JWT identity)
- **Response**: `{ secret: string, qrCodeUrl: string, backupCodes: string[] }`
- **Rate limit**: 5 req/min per user

#### `store-2fa-secret`
- **Method**: `POST`
- **Auth**: Authenticated
- **Purpose**: Encrypts (AES-GCM) and persists TOTP secret + hashed backup codes
- **Request**: `{ secret: string, backupCodes: string[] }`
- **Response**: `{ success: true }`
- **Security**: Secret stored as `v1:{iv}.{ciphertext}` using `TWO_FACTOR_ENCRYPTION_KEY` env secret

#### `verify-2fa`
- **Method**: `POST`
- **Auth**: Authenticated
- **Purpose**: Verifies a 6-digit TOTP code during login
- **Request**: `{ code: string }`
- **Response**: `{ valid: boolean }`

#### `verify-totp`
- **Method**: `POST`
- **Auth**: Authenticated
- **Purpose**: Validates TOTP code against stored encrypted secret
- **Request**: `{ token: string, userId: string }`
- **Response**: `{ verified: boolean }`

#### `verify-backup-code`
- **Method**: `POST`
- **Auth**: Authenticated
- **Purpose**: Validates a one-time backup code (salted SHA-256 comparison)
- **Request**: `{ code: string }`
- **Response**: `{ valid: boolean, codesRemaining: number }`

---

### User & Hospital Management

#### `create-hospital-admin`
- **Method**: `POST`
- **Auth**: Service Role (admin bootstrap only)
- **Purpose**: Creates a new hospital record + initial admin user in one transaction
- **Request**: `{ hospitalName: string, adminEmail: string, adminPassword: string, adminFirstName: string, adminLastName: string }`
- **Response**: `{ hospitalId: string, userId: string }`

#### `accept-invitation-signup`
- **Method**: `POST`
- **Auth**: Public (token-gated)
- **Purpose**: Completes staff registration from an email invitation link
- **Request**: `{ token: string, password: string, firstName: string, lastName: string }`
- **Response**: `{ success: true, session: Session }`

#### `validate-invitation-token`
- **Method**: `POST`
- **Auth**: Public (token-gated)
- **Purpose**: Verifies an invitation token is valid and not expired
- **Request**: `{ token: string }`
- **Response**: `{ valid: boolean, email: string, role: string, hospitalId: string }`
- **Rate limit**: 10 req/min per IP

---

### Notifications & Messaging

#### `send-notification`
- **Method**: `POST`
- **Auth**: Authenticated
- **Purpose**: Inserts a cross-role notification record and triggers real-time delivery
- **Request**: `{ recipientId: string, type: string, title: string, message: string, priority?: 'low'|'normal'|'high'|'urgent', metadata?: object }`
- **Response**: `{ id: string }`

#### `send-email`
- **Method**: `POST`
- **Auth**: Service Role
- **Purpose**: Sends transactional emails (appointment reminders, password reset, etc.)
- **Request**: `{ to: string, subject: string, template: string, data: object }`
- **Response**: `{ messageId: string }`

#### `appointment-reminders`
- **Method**: `POST` (cron-triggered)
- **Auth**: Service Role
- **Purpose**: Scans upcoming appointments and sends reminder emails/notifications
- **Request**: `{}` (scheduled invocation)
- **Response**: `{ sent: number, failed: number }`

---

### Clinical Decision Support

#### `ai-clinical-support`
- **Method**: `POST`
- **Auth**: Authenticated (doctor role required)
- **Purpose**: Provides AI-assisted clinical suggestions (differential diagnosis, drug interactions)
- **Request**: `{ patientId: string, symptoms: string[], currentMedications: string[], query: string }`
- **Response**: `{ suggestions: string[], disclaimer: string, confidence: number }`
- **Note**: No PHI is forwarded to external AI APIs; only anonymized clinical data

#### `symptom-analysis`
- **Method**: `POST`
- **Auth**: Authenticated
- **Purpose**: Analyses symptom patterns and suggests triage priority
- **Request**: `{ symptoms: string[], vitalSigns?: object, patientAge?: number }`
- **Response**: `{ priority: 'low'|'normal'|'high'|'urgent', suggestedICD10: string[], notes: string }`

#### `predict-deterioration`
- **Method**: `POST`
- **Auth**: Authenticated (doctor/nurse)
- **Purpose**: Early-warning deterioration score based on vitals trend
- **Request**: `{ patientId: string, hospitalId: string }`
- **Response**: `{ score: number, riskLevel: 'low'|'medium'|'high', factors: string[] }`

#### `clinical-pharmacy`
- **Method**: `POST`
- **Auth**: Authenticated (pharmacist/doctor)
- **Purpose**: Drug interaction check and clinical pharmacy advisory
- **Request**: `{ medications: string[], patientAllergies: string[] }`
- **Response**: `{ interactions: Interaction[], allergies: Alert[], recommendations: string[] }`

---

### Laboratory

#### `lab-critical-values`
- **Method**: `POST`
- **Auth**: Authenticated (lab_technician)
- **Purpose**: Processes critical lab result and triggers immediate doctor notification
- **Request**: `{ labOrderId: string, resultValue: number, unit: string, criticalRangeId: string }`
- **Response**: `{ alertId: string, notificationSent: boolean }`

#### `lab-automation`
- **Method**: `POST`
- **Auth**: Service Role (instrument integration)
- **Purpose**: Accepts automated result payloads from lab analysers
- **Request**: `{ instrumentId: string, results: LabResult[] }`
- **Response**: `{ processed: number, errors: number }`

---

### Queue & Operations

#### `optimize-queue`
- **Method**: `POST`
- **Auth**: Authenticated (receptionist/nurse/admin)
- **Purpose**: Re-prioritises the patient queue using wait time, acuity, and appointment type
- **Request**: `{ hospitalId: string, date?: string }`
- **Response**: `{ reordered: number, queueSnapshot: QueueEntry[] }`

#### `workflow-automation`
- **Method**: `POST` (event-driven)
- **Auth**: Service Role
- **Purpose**: Executes configured workflow rules (e.g., notify nurse on check-in)
- **Request**: `{ event: string, payload: object, hospitalId: string }`
- **Response**: `{ rulesEvaluated: number, actionsExecuted: number }`

#### `analytics-engine`
- **Method**: `POST`
- **Auth**: Authenticated (admin)
- **Purpose**: Aggregates KPI metrics for admin dashboards (census, throughput, revenue)
- **Request**: `{ hospitalId: string, dateFrom: string, dateTo: string, metrics: string[] }`
- **Response**: `{ metrics: MetricsMap, generatedAt: string }`

---

### Integrations

#### `fhir-integration`
- **Method**: `POST`
- **Auth**: Authenticated (admin/doctor)
- **Purpose**: Export/import patient data in FHIR R4 format
- **Request**: `{ action: 'export'|'import', resourceType: string, patientId?: string, payload?: FHIRResource }`
- **Response**: `{ success: boolean, resource?: FHIRResource, id?: string }`

#### `insurance-integration`
- **Method**: `POST`
- **Auth**: Authenticated (receptionist/admin)
- **Purpose**: Verifies insurance eligibility and submits pre-authorisation requests
- **Request**: `{ patientId: string, insuranceProviderId: string, serviceCode: string }`
- **Response**: `{ eligible: boolean, coveragePercent: number, preAuthRequired: boolean, preAuthId?: string }`

#### `telemedicine`
- **Method**: `POST`
- **Auth**: Authenticated (doctor/patient)
- **Purpose**: Creates/joins a telemedicine session (video call token)
- **Request**: `{ action: 'create'|'join', consultationId: string }`
- **Response**: `{ roomUrl: string, token: string, expiresAt: string }`

---

### System & Monitoring

#### `health-check`
- **Method**: `GET`
- **Auth**: Public
- **Purpose**: Liveness probe for load balancers/uptime monitors
- **Response**: `{ status: 'ok', timestamp: string, version: string }`

#### `monitoring`
- **Method**: `POST`
- **Auth**: Service Role
- **Purpose**: Collects system metrics (DB connections, queue depth, error rates) for Grafana/dashboards
- **Request**: `{ hospitalId?: string }`
- **Response**: `{ metrics: SystemMetrics }`

#### `system-monitoring`
- **Method**: `POST`
- **Auth**: Authenticated (admin)
- **Purpose**: Returns hospital-scoped system health report (active users, error counts, RLS violations in last 24 h)
- **Request**: `{ hospitalId: string }`
- **Response**: `{ health: HealthReport, alerts: Alert[] }`

#### `audit-logger`
- **Method**: `POST`
- **Auth**: Service Role
- **Purpose**: Appends structured HIPAA audit log entries to `activity_logs` from server-side events
- **Request**: `{ userId: string, hospitalId: string, action: string, entityType: string, entityId: string, details?: object }`
- **Response**: `{ id: string }`

#### `backup-manager`
- **Method**: `POST`
- **Auth**: Service Role
- **Purpose**: Triggers on-demand DB backup and stores metadata in `backup_runs` table
- **Request**: `{ type: 'full'|'incremental', hospitalId?: string }`
- **Response**: `{ backupId: string, status: 'initiated', estimatedCompletionMinutes: number }`

---

### Inventory

#### `check-low-stock`
- **Method**: `POST` (cron-triggered)
- **Auth**: Service Role
- **Purpose**: Scans pharmaceutical inventory and fires notifications for items below reorder threshold
- **Request**: `{}` (scheduled invocation)
- **Response**: `{ alertsSent: number, items: LowStockItem[] }`

---

1. **Use Select Sparingly**: Only select needed columns
   ```typescript
   // Good
   .select('id, first_name, last_name')
   
   // Avoid
   .select('*')
   ```

2. **Batch Operations**: Use arrays for multiple inserts
   ```typescript
   await supabase.from('items').insert([item1, item2, item3]);
   ```

3. **Handle Pagination**: Use range for large datasets
   ```typescript
   .range(0, 49) // First 50 items
   ```

4. **Cleanup Subscriptions**: Always unsubscribe on unmount
   ```typescript
   useEffect(() => {
     const channel = supabase.channel('...');
     return () => channel.unsubscribe();
   }, []);
   ```
