# Patient Flow Fix - Implementation Guide

## Issues Identified

1. **Nurse Precheck Stage**: No UI for adding precheck details or marking items complete
2. **Doctor Access**: Cannot access consultation details after nurse marks patient ready
3. **Empty Queue**: Patient info doesn't appear when doctor starts consultation

## Solution Overview

### Flow Architecture
```
Receptionist Check-in → Queue Entry Created
    ↓
Nurse Prep → Vitals + Checklist → Mark Ready
    ↓
Doctor Notified → Start Consultation → View Patient Details
    ↓
Complete Consultation → Handoff to Pharmacy/Lab
```

## Implementation Steps

### Step 1: Fix Nurse Precheck UI (PatientPrepChecklistCard)
**Status**: ✅ Already implemented but needs verification

The component at `src/components/nurse/PatientPrepChecklistCard.tsx` already has:
- Checkbox UI for all precheck items
- Modal dialogs for vitals, allergies, medications, chief complaint
- "Mark Ready for Doctor" button

**Verify**: Component is being used in QueueManagementPage

### Step 2: Create Consultation When Patient is Ready

**File**: `src/hooks/useQueue.ts`

Add function to create consultation when marking patient ready:

```typescript
export function useMarkPatientReady() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ queueEntryId, patientId }: { queueEntryId: string; patientId: string }) => {
      // Update queue entry
      const { error: queueError } = await supabase
        .from('queue_entries')
        .update({ 
          status: 'called',
          notes: 'Patient ready for doctor consultation'
        })
        .eq('id', queueEntryId);

      if (queueError) throw queueError;

      // Create consultation if doesn't exist
      const { data: existingConsultation } = await supabase
        .from('consultations')
        .select('id')
        .eq('patient_id', patientId)
        .neq('status', 'completed')
        .maybeSingle();

      if (!existingConsultation) {
        const { error: consultError } = await supabase
          .from('consultations')
          .insert({
            patient_id: patientId,
            status: 'patient_overview',
            current_step: 1,
          });

        if (consultError) throw consultError;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      toast.success('Patient marked as ready for consultation');
    },
  });
}
```

### Step 3: Fix Doctor Dashboard to Show Ready Patients

**File**: `src/pages/doctor/DoctorDashboard.tsx`

Add section to show patients ready for consultation:

```typescript
// Get patients ready for consultation
const { data: readyPatients } = useQuery({
  queryKey: ['ready-patients', hospital?.id],
  queryFn: async () => {
    if (!hospital?.id) return [];

    const { data, error } = await supabase
      .from('patient_prep_checklists')
      .select(`
        *,
        patient:patients(*),
        queue_entry:queue_entries(*)
      `)
      .eq('hospital_id', hospital.id)
      .eq('ready_for_doctor', true)
      .is('consultation_started', null);

    if (error) throw error;
    return data;
  },
  enabled: !!hospital?.id,
});
```

### Step 4: Add "Start Consultation" Button

**Component**: Ready Patients Card

```typescript
<Card>
  <CardHeader>
    <CardTitle>Patients Ready for Consultation</CardTitle>
  </CardHeader>
  <CardContent>
    {readyPatients?.map(prep => (
      <div key={prep.id} className="flex items-center justify-between p-3 border rounded-lg mb-2">
        <div>
          <p className="font-medium">
            {prep.patient.first_name} {prep.patient.last_name}
          </p>
          <p className="text-sm text-muted-foreground">
            MRN: {prep.patient.mrn} • Queue: #{prep.queue_entry?.queue_number}
          </p>
        </div>
        <Button onClick={() => handleStartConsultation(prep.patient_id)}>
          Start Consultation
        </Button>
      </div>
    ))}
  </CardContent>
</Card>
```

### Step 5: Fix Consultation Navigation

**Handler Function**:

```typescript
const handleStartConsultation = async (patientId: string) => {
  try {
    // Get or create consultation
    const consultation = await getOrCreateConsultation.mutateAsync(patientId);
    
    // Navigate to consultation workflow
    navigate(`/consultations/${consultation.id}`);
  } catch (error) {
    toast.error('Failed to start consultation');
  }
};
```

### Step 6: Update Queue Entry When Consultation Starts

**File**: `src/hooks/useConsultations.ts`

Modify `useGetOrCreateConsultation`:

```typescript
export function useGetOrCreateConsultation() {
  const queryClient = useQueryClient();
  const { hospital, profile } = useAuth();

  return useMutation({
    mutationFn: async (patientId: string) => {
      if (!hospital?.id || !profile?.id) throw new Error('Not authenticated');

      // Find existing consultation
      const { data: existingConsultation } = await supabase
        .from('consultations')
        .select(`
          ${CONSULTATION_COLUMNS.detail},
          patient:patients(${PATIENT_COLUMNS.detail}),
          doctor:profiles!consultations_doctor_id_fkey(id, first_name, last_name)
        `)
        .eq('patient_id', patientId)
        .neq('status', 'completed')
        .maybeSingle();

      if (existingConsultation) {
        // Update queue entry to in_service
        await supabase
          .from('queue_entries')
          .update({ status: 'in_service', service_start_time: new Date().toISOString() })
          .eq('patient_id', patientId)
          .eq('status', 'called');

        return existingConsultation as Consultation;
      }

      // Create new consultation
      const { data: consultation, error } = await supabase
        .from('consultations')
        .insert({
          patient_id: patientId,
          hospital_id: hospital.id,
          doctor_id: profile.id,
          status: 'patient_overview' as ConsultationStatus,
          current_step: 1,
          started_at: new Date().toISOString(),
        })
        .select(`
          ${CONSULTATION_COLUMNS.detail},
          patient:patients(${PATIENT_COLUMNS.detail}),
          doctor:profiles!consultations_doctor_id_fkey(id, first_name, last_name)
        `)
        .single();

      if (error) throw error;

      // Update queue entry
      await supabase
        .from('queue_entries')
        .update({ status: 'in_service', service_start_time: new Date().toISOString() })
        .eq('patient_id', patientId)
        .in('status', ['waiting', 'called']);

      return consultation as Consultation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      queryClient.invalidateQueries({ queryKey: ['ready-patients'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to load consultation: ${error.message}`);
    },
  });
}
```

## Testing Checklist

### Receptionist Flow
- [ ] Check-in patient creates queue entry
- [ ] Patient appears in queue with "waiting" status
- [ ] Queue number is assigned

### Nurse Flow
- [ ] Nurse can see patient in queue
- [ ] Click "Start Prep" opens checklist
- [ ] Record vitals modal works
- [ ] Allergies verification modal works
- [ ] Medications review modal works
- [ ] Chief complaint modal works
- [ ] All checkboxes can be marked
- [ ] "Mark Ready for Doctor" button appears when all items complete
- [ ] Clicking "Mark Ready" updates queue status to "called"
- [ ] Patient shows "Ready for Doctor" badge

### Doctor Flow
- [ ] Doctor dashboard shows "Patients Ready for Consultation" section
- [ ] Ready patients list shows correct patient info
- [ ] "Start Consultation" button is visible
- [ ] Clicking button creates/finds consultation
- [ ] Navigation to consultation workflow works
- [ ] Patient details load correctly
- [ ] Vitals from nurse are visible
- [ ] Checklist notes are accessible
- [ ] Queue entry updates to "in_service"

### Consultation Flow
- [ ] All 5 steps are accessible
- [ ] Patient overview shows vitals
- [ ] Can add clinical assessment
- [ ] Can create prescriptions
- [ ] Can order labs
- [ ] Can complete consultation
- [ ] Handoff notifies pharmacy/lab

## Quick Fixes to Apply Now

1. **Update PatientPrepChecklistCard** - Already has checkboxes ✅
2. **Add useMarkPatientReady hook** - Create consultation when ready
3. **Update Doctor Dashboard** - Show ready patients list
4. **Fix useGetOrCreateConsultation** - Update queue status
5. **Add navigation handler** - Route to consultation workflow

## Database Schema Verification

Ensure these columns exist:

```sql
-- patient_prep_checklists table
ALTER TABLE patient_prep_checklists 
ADD COLUMN IF NOT EXISTS consultation_started TIMESTAMPTZ;

-- queue_entries table  
ALTER TABLE queue_entries
ADD COLUMN IF NOT EXISTS service_start_time TIMESTAMPTZ;
```

## Files to Modify

1. ✅ `src/hooks/useConsultations.ts` - Add useGetOrCreateConsultation
2. ⏳ `src/hooks/useQueue.ts` - Add useMarkPatientReady
3. ⏳ `src/pages/doctor/DoctorDashboard.tsx` - Add ready patients section
4. ⏳ `src/components/nurse/PatientPrepChecklistCard.tsx` - Verify checkboxes work
5. ⏳ `src/pages/queue/QueueManagementPage.tsx` - Update "Call for Consultation" button

## Priority Order

1. **HIGH**: Fix useGetOrCreateConsultation to update queue status
2. **HIGH**: Add ready patients list to doctor dashboard
3. **MEDIUM**: Add useMarkPatientReady hook
4. **MEDIUM**: Update queue management page buttons
5. **LOW**: Add consultation_started timestamp tracking
