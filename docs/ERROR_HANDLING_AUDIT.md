# Error Handling & Edge Case Audit Report

**Project:** AROCORD-HIMS (CareSync)  
**Audit Date:** January 2026  
**Status:** Critical Gaps Identified  
**Findings:** 30+ issues requiring attention

---

## Executive Summary

This audit evaluates AROCORD-HIMS for comprehensive error handling and edge case coverage across four critical categories: Network Errors, Data Edge Cases, User Error Prevention, and Concurrent Access. The system has foundational error handling but significant gaps exist that could impact patient safety and user experience.

### Risk Assessment

| Category | Status | Risk Level | Priority |
|----------|--------|------------|----------|
| Network Errors | ❌ Insufficient | **Critical** | Immediate |
| Data Edge Cases | ⚠️ Partial | **High** | High |
| User Error Prevention | ⚠️ Partial | **Medium** | Medium |
| Concurrent Access | ❌ Insufficient | **Critical** | Immediate |

---

## 1. Network Errors

### Current State: ❌ Insufficient Coverage

#### 1.1 Connection Loss Detection

**Status:** ❌ Not Implemented

**What's Missing:**
- No offline detection system
- No network status context/provider
- No event listeners for online/offline events

**What Happens:**
- User actions fail silently
- Loading spinners continue indefinitely
- No user notification of connectivity issues
- Data loss on form submission during disconnect

**How to Handle:**
```typescript
// Required: NetworkStatusContext
- Listen to window.addEventListener('online/offline')
- Provide isOnline state to entire app
- Show offline banner when disconnected
- Queue actions for retry when reconnected
```

**Code Changes Needed:**
1. Create `src/contexts/NetworkStatusContext.tsx`
2. Add offline banner component
3. Wrap app with NetworkStatusProvider
4. Integrate with existing toast system

**Effort:** 4-6 hours

---

#### 1.2 Offline Banner & User Notification

**Status:** ❌ Not Implemented

**What's Missing:**
- No visual indication of offline status
- No warning before attempting actions
- No automatic reconnection notification

**What Happens:**
- Users attempt actions that will fail
- Confusion when requests timeout
- Poor user experience

**How to Handle:**
```typescript
// Required: OfflineBanner component
- Sticky banner at top of screen
- Clear "You are offline" message
- "Reconnecting..." state
- "Back online" success message
- Disable critical actions when offline
```

**Code Changes Needed:**
1. Create `src/components/ui/OfflineBanner.tsx`
2. Add to main layout
3. Style with warning colors (amber/red)
4. Auto-dismiss when online

**Effort:** 2-3 hours

---

#### 1.3 Action Queuing for Offline

**Status:** ❌ Not Implemented

**What's Missing:**
- No request queue system
- No local storage of pending actions
- No automatic retry mechanism

**What Happens:**
- Form submissions lost during disconnect
- Users must re-enter data
- Potential data loss for critical medical data

**How to Handle:**
```typescript
// Required: OfflineQueue system
- Queue actions in IndexedDB/localStorage
- Tag actions as 'retryable' or 'critical'
- Auto-retry on reconnection
- Show "X pending actions" indicator
- Allow manual retry
```

**Code Changes Needed:**
1. Create `src/utils/offlineQueue.ts`
2. Integrate with form submissions
3. Add pending actions UI
4. Implement retry logic

**Effort:** 8-12 hours

---

#### 1.4 API Timeouts

**Status:** ⚠️ Partial Implementation

**What's Missing:**
- Inconsistent timeout handling across API calls
- Some queries have no timeout
- No configurable timeout settings
- No retry button on timeout

**What Happens:**
- Requests hang indefinitely
- User sees loading spinner forever
- No recovery option

**How to Handle:**
```typescript
// Required: Timeout wrapper for all API calls
const withTimeout = (promise, timeoutMs = 30000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
};
```

**Code Changes Needed:**
1. Create `src/utils/apiClient.ts` with timeout wrapper
2. Replace all direct Supabase calls
3. Add retry button to error states
4. Log timeout errors for monitoring

**Effort:** 6-8 hours

---

#### 1.5 Infinite Loading Spinners

**Status:** ⚠️ Risk Present

**What's Missing:**
- Loading states not always cleaned up on error
- Some components lack error state handling
- No global loading state timeout

**What Happens:**
- UI stuck in loading state
- User cannot proceed
- Page refresh required

**How to Handle:**
```typescript
// Required: Loading state cleanup
useEffect(() => {
  let cancelled = false;
  
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchData();
      if (!cancelled) setData(data);
    } catch (error) {
      if (!cancelled) setError(error);
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
  
  return () => { cancelled = true; };
}, []);
```

**Code Changes Needed:**
1. Audit all components with loading states
2. Add error handling to all async effects
3. Implement cleanup on unmount
4. Add global loading timeout

**Effort:** 4-6 hours

---

## 2. Data Edge Cases

### Current State: ⚠️ Partial Coverage

#### 2.1 Empty/Null Value Handling

**Status:** ⚠️ Inconsistent

**What's Missing:**
- Inconsistent null checks across components
- Some components crash on undefined values
- Missing fallback UI for empty states

**Examples Found:**
- Patient names: Some displays don't handle null
- Vital signs: Missing values cause NaN in calculations
- Lab results: Missing reference ranges break display
- Addresses: Null fields show "null" text

**What Happens:**
- JavaScript runtime errors
- "undefined" displayed in UI
- NaN values in calculations
- Component crashes

**How to Handle:**
```typescript
// Safe display patterns
<p>{patient.name ?? 'Unknown'}</p>
<p>{patient.middleName || ''}</p>

// Safe calculations
const bmi = weight && height ? (weight / (height * height)).toFixed(1) : 'N/A';

// Empty state components
{results.length === 0 && <EmptyState message="No results found" />}
```

**Code Changes Needed:**
1. Audit all data display components
2. Add null coalescing operators
3. Create EmptyState component variants
4. Add default values in type definitions

**Effort:** 6-8 hours

---

#### 2.2 Very Long Values

**Status:** ❌ Not Handled

**What's Missing:**
- No character limits on inputs
- No truncation for display
- UI overflow not prevented
- Database may truncate silently

**Examples:**
- Patient names (100+ characters break UI)
- Addresses (overflow containers)
- Notes/descriptions (no max length)
- Phone numbers (non-numeric input accepted)

**What Happens:**
- UI layout breaks
- Text overlaps other elements
- Poor readability
- Database errors on insert

**How to Handle:**
```typescript
// Input validation
<Input 
  maxLength={100}
  value={name}
  onChange={e => setName(e.target.value.slice(0, 100))}
/>

// Display truncation
<Tooltip content={fullText}>
  <span>{text.length > 50 ? text.slice(0, 50) + '...' : text}</span>
</Tooltip>
```

**Code Changes Needed:**
1. Add maxLength to all text inputs
2. Create TruncatedText component
3. Add character counters to forms
4. Update database constraints

**Effort:** 4-6 hours

---

#### 2.3 Large Dataset Pagination

**Status:** ⚠️ Partial Implementation

**What's Missing:**
- Some queries missing `.range()` pagination
- No virtual scrolling for long lists
- Memory issues with 10k+ records
- No lazy loading for tables

**Examples Found:**
- Patient lists: Some views load all patients
- Audit logs: Full table scan
- Reports: No streaming for exports

**What Happens:**
- Slow initial load
- Browser memory exhaustion
- UI freeze during render
- Timeout on large queries

**How to Handle:**
```typescript
// Consistent pagination
const { data, count } = await supabase
  .from('patients')
  .select('*', { count: 'exact' })
  .range(start, end)
  .order('created_at', { ascending: false });

// Virtual scrolling for large lists
import { FixedSizeList } from 'react-window';
```

**Code Changes Needed:**
1. Audit all list queries for pagination
2. Add server-side pagination to tables
3. Implement virtual scrolling
4. Add lazy loading for reports

**Effort:** 8-10 hours

---

#### 2.4 Boundary Conditions

**Status:** ⚠️ Inconsistent

**What's Missing:**
- No min/max validation on numeric inputs
- Negative values accepted for positive-only fields
- Future dates allowed for past-only fields
- Extreme values not validated

**Examples:**
- Age: Negative values possible
- Weight: 0 or extreme values accepted
- Blood pressure: No range validation
- Dates of birth: Future dates allowed

**What Happens:**
- Invalid data in system
- Calculation errors
- Medical decision support fails
- Data quality issues

**How to Handle:**
```typescript
// Zod validation schema
const patientSchema = z.object({
  age: z.number().min(0).max(150),
  weight: z.number().min(0.5).max(500),
  dateOfBirth: z.date().max(new Date()),
  bloodPressureSystolic: z.number().min(60).max(300),
  bloodPressureDiastolic: z.number().min(40).max(200),
});
```

**Code Changes Needed:**
1. Add validation schemas to all forms
2. Implement boundary checks in UI
3. Add database constraints
4. Create validation utilities

**Effort:** 6-8 hours

---

#### 2.5 Date/Time Edge Cases

**Status:** ⚠️ Partial Coverage

**What's Missing:**
- Inconsistent timezone handling
- DST transition not handled
- Leap years not validated
- Timezone conversion issues

**Examples:**
- Appointment times: May shift during DST
- Birth dates: Feb 29 not validated
- Shift schedules: Timezone issues for multi-location
- Audit timestamps: Not always UTC

**What Happens:**
- Wrong appointment times displayed
- Schedule conflicts
- Birth date validation errors
- Audit log inconsistencies

**How to Handle:**
```typescript
// Store all times in UTC
const appointmentTime = new Date().toISOString();

// Display in user's timezone
const displayTime = formatInTimeZone(appointmentTime, userTimezone, 'yyyy-MM-dd HH:mm');

// DST-aware scheduling
import { DateTime } from 'luxon';
const localTime = DateTime.fromISO(isoString).setZone(userTimezone);
```

**Code Changes Needed:**
1. Standardize all timestamps to UTC
2. Add timezone selector to user settings
3. Implement DST-aware date handling
4. Add leap year validation

**Effort:** 8-10 hours

---

## 3. User Error Prevention

### Current State: ⚠️ Partial Coverage

#### 3.1 Confirmation Dialogs for Destructive Actions

**Status:** ⚠️ Inconsistent

**What's Missing:**
- Not all destructive actions have confirmation
- Inconsistent dialog messaging
- No undo option for some critical actions

**Actions Missing Confirmation:**
- ❌ Some bulk operations
- ❌ Data export/delete
- ⚠️ Prescription cancellations
- ✅ Patient deletion (has confirmation)

**What Happens:**
- Accidental data loss
- Cannot undo mistakes
- User frustration

**How to Handle:**
```typescript
// Consistent confirmation pattern
const deletePatient = async (id: string) => {
  const confirmed = await confirmDialog({
    title: 'Delete Patient Record',
    message: 'This action cannot be undone. All associated records will be permanently deleted.',
    confirmText: 'Delete',
    variant: 'destructive',
  });
  
  if (confirmed) {
    await performDelete(id);
  }
};
```

**Code Changes Needed:**
1. Audit all destructive actions
2. Add confirmation dialogs uniformly
3. Create reusable ConfirmDialog component
4. Add undo capability where possible

**Effort:** 4-6 hours

---

#### 3.2 Validation Clarity

**Status:** ⚠️ Inconsistent

**What's Missing:**
- Required field indicators inconsistent
- Error messages sometimes generic
- Field-level validation feedback missing
- No real-time validation on some forms

**Examples:**
- "An error occurred" vs "Email is required"
- Required fields not visually marked
- Validation only on submit for some forms
- No character count indicators

**What Happens:**
- Users confused about requirements
- Multiple submit attempts needed
- Poor form completion rate

**How to Handle:**
```typescript
// Clear required indicators
<Label>
  Email <span className="text-destructive">*</span>
</Label>

// Specific error messages
<FormMessage>
  {errors.email?.type === 'required' && 'Email is required'}
  {errors.email?.type === 'pattern' && 'Please enter a valid email address'}
</FormMessage>

// Real-time validation
<Input {...register('email', { 
  required: true,
  pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i 
})} />
```

**Code Changes Needed:**
1. Standardize required field indicators
2. Write specific error messages
3. Add real-time validation
4. Create validation message guidelines

**Effort:** 6-8 hours

---

#### 3.3 Form Data Persistence on Error

**Status:** ❌ Not Implemented

**What's Missing:**
- No auto-save for form drafts
- Data lost on validation error
- No recovery from browser crash
- Page refresh loses all input

**What Happens:**
- Users must re-enter data
- Frustration and time loss
- Incomplete form submissions

**How to Handle:**
```typescript
// Auto-save to localStorage
useEffect(() => {
  const saved = localStorage.getItem(`form-draft-${formId}`);
  if (saved) {
    const confirmed = confirm('Restore saved draft?');
    if (confirmed) reset(JSON.parse(saved));
  }
}, []);

useEffect(() => {
  const timer = setInterval(() => {
    localStorage.setItem(`form-draft-${formId}`, JSON.stringify(getValues()));
  }, 30000);
  return () => clearInterval(timer);
}, [getValues]);

// Clear on successful submit
const onSubmit = async (data) => {
  await submitForm(data);
  localStorage.removeItem(`form-draft-${formId}`);
};
```

**Code Changes Needed:**
1. Create useFormPersistence hook
2. Add to all long forms
3. Add "Restore draft" UI
4. Clear on successful submission

**Effort:** 6-8 hours

---

#### 3.4 Undo Functionality

**Status:** ❌ Not Implemented

**What's Missing:**
- No undo for destructive actions
- No action history
- Cannot revert changes

**What Happens:**
- Mistakes are permanent
- No recovery from errors
- User anxiety about actions

**How to Handle:**
```typescript
// Action history with undo
const [actionHistory, setActionHistory] = useState<Action[]>([]);

const deleteItem = async (item) => {
  // Store for undo
  const action = { type: 'DELETE', item, timestamp: Date.now() };
  setActionHistory(prev => [...prev, action]);
  
  // Soft delete
  await softDelete(item.id);
  
  // Show undo toast
  toast({
    title: 'Item deleted',
    description: 'Click to undo',
    action: <Button onClick={() => undoAction(action)}>Undo</Button>,
    duration: 10000,
  });
};
```

**Code Changes Needed:**
1. Create action history system
2. Implement soft delete pattern
3. Add undo UI to toasts
4. Set undo timeout window

**Effort:** 8-10 hours

---

#### 3.5 Accidental Logout Recovery

**Status:** ⚠️ Partial

**What's Missing:**
- No unsaved changes warning
- Session timeout without warning
- No session recovery

**What Happens:**
- Work lost on logout
- Unexpected session end
- Cannot resume work

**How to Handle:**
```typescript
// Unsaved changes warning
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (formState.isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [formState.isDirty]);

// Session timeout warning
useEffect(() => {
  const warningTimer = setTimeout(() => {
    toast({
      title: 'Session expiring soon',
      description: 'Click to extend session',
      action: <Button onClick={extendSession}>Extend</Button>,
    });
  }, SESSION_TIMEOUT - 60000);
  return () => clearTimeout(warningTimer);
}, []);
```

**Code Changes Needed:**
1. Add unsaved changes detection
2. Implement session warning
3. Add session extension
4. Save work before logout

**Effort:** 4-6 hours

---

## 4. Concurrent Access

### Current State: ❌ Insufficient Coverage

#### 4.1 Optimistic Updates

**Status:** ❌ Not Implemented

**What's Missing:**
- No optimistic UI updates
- All changes wait for server
- Slow perceived performance

**What Happens:**
- Laggy user experience
- Users unsure if action succeeded
- Poor UX on slow connections

**How to Handle:**
```typescript
// Optimistic update pattern
const updatePatient = useMutation({
  mutationFn: async (updates) => {
    return await supabase.from('patients').update(updates);
  },
  onMutate: async (updates) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['patient', updates.id]);
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['patient', updates.id]);
    
    // Optimistically update
    queryClient.setQueryData(['patient', updates.id], (old) => ({
      ...old,
      ...updates,
    }));
    
    return { previous };
  },
  onError: (err, updates, context) => {
    // Rollback on error
    queryClient.setQueryData(['patient', updates.id], context.previous);
    toast({ title: 'Update failed', variant: 'destructive' });
  },
});
```

**Code Changes Needed:**
1. Implement optimistic updates pattern
2. Add to all mutations
3. Handle rollback on error
4. Show sync status indicator

**Effort:** 8-10 hours

---

#### 4.2 Conflict Detection & Resolution

**Status:** ❌ Not Implemented

**What's Missing:**
- No version tracking
- No conflict detection
- No resolution UI
- Last-write-wins (data loss)

**What Happens:**
- Concurrent edits overwrite each other
- Lost updates
- Data inconsistency

**How to Handle:**
```typescript
// Version-based conflict detection
const updateWithConflictCheck = async (id, updates, expectedVersion) => {
  const { data, error } = await supabase
    .from('patients')
    .update({ ...updates, version: expectedVersion + 1 })
    .eq('id', id)
    .eq('version', expectedVersion);
  
  if (!data) {
    // Conflict detected
    throw new ConflictError('Record was modified by another user');
  }
  
  return data;
};

// Conflict resolution UI
if (error instanceof ConflictError) {
  showConflictDialog({
    message: 'This record was modified by another user',
    options: ['Keep my changes', 'Keep their changes', 'View both'],
  });
}
```

**Code Changes Needed:**
1. Add version column to tables
2. Implement version checking
3. Create ConflictDialog component
4. Add merge resolution UI

**Effort:** 12-16 hours

---

#### 4.3 Duplicate Prevention

**Status:** ⚠️ Partial Implementation

**What's Missing:**
- Double-booking still possible
- Duplicate form submissions
- No idempotency keys
- No debouncing on submit buttons

**Examples:**
- Appointments: Can double-book same slot
- Prescriptions: Can submit twice
- Forms: Button can be clicked multiple times

**What Happens:**
- Duplicate records in database
- Double charges
- Confusion

**How to Handle:**
```typescript
// Disable submit button during submission
<Button disabled={isSubmitting} onClick={handleSubmit}>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</Button>

// Unique constraint check
const createAppointment = async (data) => {
  // Check for conflicts
  const { data: existing } = await supabase
    .from('appointments')
    .select('id')
    .eq('doctor_id', data.doctor_id)
    .eq('scheduled_time', data.scheduled_time)
    .maybeSingle();
  
  if (existing) {
    throw new Error('This time slot is already booked');
  }
  
  return await supabase.from('appointments').insert(data);
};

// Idempotency key
const idempotencyKey = crypto.randomUUID();
```

**Code Changes Needed:**
1. Add unique constraints to database
2. Implement pre-check queries
3. Disable buttons during submission
4. Add idempotency keys

**Effort:** 6-8 hours

---

#### 4.4 Race Conditions

**Status:** ❌ Not Prevented

**What's Missing:**
- No mutex/locks
- Concurrent access not controlled
- Critical sections unprotected

**Examples:**
- Inventory decrement: Race on quantity
- Billing: Concurrent invoice generation
- Bed assignment: Same bed to two patients

**What Happens:**
- Incorrect data
- Negative inventory
- Double billing

**How to Handle:**
```typescript
// Database-level locks
const assignBed = async (bedId, patientId) => {
  // Use PostgreSQL advisory locks
  const { data } = await supabase.rpc('assign_bed_atomic', {
    p_bed_id: bedId,
    p_patient_id: patientId,
  });
  return data;
};

// Or use transaction with row lock
BEGIN;
SELECT * FROM beds WHERE id = $1 FOR UPDATE;
-- Check availability
-- Update if available
COMMIT;
```

**Code Changes Needed:**
1. Identify critical sections
2. Add database locks
3. Create atomic RPC functions
4. Test concurrent scenarios

**Effort:** 10-12 hours

---

#### 4.5 Stale Data Handling

**Status:** ⚠️ Partial Implementation

**What's Missing:**
- Incomplete realtime subscriptions
- No stale data indicators
- Subscription cleanup issues
- No reconnection handling

**What Happens:**
- Viewing outdated information
- Decisions based on stale data
- Confusion when data changes

**How to Handle:**
```typescript
// Realtime subscription with reconnection
useEffect(() => {
  const channel = supabase
    .channel(`patient-${patientId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'patients',
      filter: `id=eq.${patientId}`,
    }, (payload) => {
      queryClient.setQueryData(['patient', patientId], payload.new);
    })
    .subscribe((status) => {
      if (status === 'CLOSED') {
        // Attempt reconnection
        setTimeout(() => channel.subscribe(), 5000);
      }
    });
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [patientId]);

// Stale indicator
const isStale = useIsStale(['patient', patientId], { staleTime: 30000 });
{isStale && <Badge variant="warning">Data may be outdated</Badge>}
```

**Code Changes Needed:**
1. Add realtime subscriptions
2. Implement stale detection
3. Add visual indicators
4. Handle reconnection

**Effort:** 8-10 hours

---

## Test Scenario Results

### Scenario 1: Disconnect During Form Submission

**Test:** Submit form while offline

**Current Behavior:**
- Request hangs indefinitely
- Loading spinner continues
- No error message shown
- User confused about status

**Expected Behavior:**
- Detect offline immediately
- Show "You're offline" banner
- Queue action for retry
- Show pending actions indicator
- Auto-retry when online
- Success/failure notification

**Gap Severity:** Critical

---

### Scenario 2: Refresh Page While Loading

**Test:** Refresh during data fetch

**Current Behavior:**
- May leave loading states stuck
- Possible memory leaks
- Inconsistent state

**Expected Behavior:**
- Cleanup on unmount
- Cancel pending requests
- Recover gracefully on reload

**Gap Severity:** Medium

---

### Scenario 3: Delete Patient in Use

**Test:** Delete patient being accessed by another user

**Current Behavior:**
- FK constraint error
- Generic error message shown
- User doesn't understand why

**Expected Behavior:**
- Check dependencies before delete
- Show specific error: "Cannot delete: Patient has active appointments"
- Offer alternatives: Archive instead

**Gap Severity:** High

---

### Scenario 4: Schedule During DST

**Test:** Create appointment during DST transition

**Current Behavior:**
- Time may be off by 1 hour
- Potential scheduling conflicts
- Confusion for users

**Expected Behavior:**
- Store in UTC
- Display in user timezone
- Handle DST correctly
- Show warning for ambiguous times

**Gap Severity:** Medium

---

### Scenario 5: 100+ Character Name

**Test:** Register patient with very long name

**Current Behavior:**
- UI overflow
- Layout breaks
- Database may truncate

**Expected Behavior:**
- Validate length (max 100 chars)
- Show character counter
- Truncate display with ellipsis
- Tooltip shows full name

**Gap Severity:** Medium

---

### Scenario 6: Missing Lab Reference Range

**Test:** View lab result without reference range

**Current Behavior:**
- Shows "undefined" or blank
- May crash component
- Poor UX

**Expected Behavior:**
- Show "Reference range not available"
- Still display result value
- Flag as needing review

**Gap Severity:** Low

---

## Implementation Roadmap

### Phase 1: Critical (Week 1-2)

**Priority:** Immediate patient safety and data integrity

| Task | Effort | Risk Reduction |
|------|--------|----------------|
| Network status context & offline banner | 6h | High |
| Null/undefined safety audit | 8h | High |
| API timeout wrapper | 8h | High |
| Form data persistence | 8h | Medium |
| **Total** | **30h** | |

---

### Phase 2: High Priority (Week 3-4)

**Priority:** User experience and data quality

| Task | Effort | Risk Reduction |
|------|--------|----------------|
| Confirmation dialog consistency | 6h | Medium |
| Validation clarity improvements | 8h | Medium |
| Input length validation | 6h | Medium |
| Duplicate prevention | 8h | Medium |
| Loading state cleanup | 6h | Medium |
| **Total** | **34h** | |

---

### Phase 3: Medium Priority (Week 5-6)

**Priority:** Advanced error handling

| Task | Effort | Risk Reduction |
|------|--------|----------------|
| Optimistic updates | 10h | Medium |
| Conflict detection | 16h | Medium |
| Undo functionality | 10h | Low |
| Offline action queue | 12h | Low |
| **Total** | **48h** | |

---

### Phase 4: Enhancement (Week 7-8)

**Priority:** Complete coverage

| Task | Effort | Risk Reduction |
|------|--------|----------------|
| Timezone handling | 10h | Low |
| Race condition prevention | 12h | Medium |
| Stale data indicators | 10h | Low |
| Realtime improvements | 10h | Low |
| **Total** | **42h** | |

---

## Metrics & Monitoring

### Recommended Error Tracking

```typescript
// Error tracking integration
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Custom error boundaries
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    Sentry.captureException(error, { extra: errorInfo });
  }
}
```

### Key Metrics to Track

- **Network Errors:** Offline frequency, timeout rate
- **Data Errors:** Null reference exceptions, validation failures
- **User Errors:** Form abandonment rate, undo usage
- **Concurrency:** Conflict frequency, duplicate attempts

---

## Conclusion

AROCORD-HIMS has foundational error handling but requires significant improvements to meet healthcare-grade reliability standards. The most critical gaps are:

1. **No offline handling** - Risk of data loss during connectivity issues
2. **Incomplete null safety** - Risk of application crashes
3. **Missing conflict resolution** - Risk of data corruption
4. **Inconsistent validation** - Risk of invalid data entry

**Recommendation:** Implement Phase 1 immediately before production deployment. Phases 2-4 should be completed within 8 weeks for comprehensive coverage.

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Next Review:** After Phase 1 completion
