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

## Best Practices

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
