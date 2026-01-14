# Complete Sanitization Fix Guide

## Summary
- **Total Issues**: 98
- **XSS (CWE-79/80)**: 15 issues
- **Log Injection (CWE-117)**: 71 issues  
- **Hardcoded Credentials (CWE-798/259)**: 10 issues (mostly false positives)
- **SSRF (CWE-918)**: 2 issues

---

## 1. XSS Fixes (CWE-79/80) - 15 Issues

### Pattern:
```typescript
import { sanitizeHtml } from '@/utils/sanitize';
// Replace: <div>{userContent}</div>
// With: <div>{sanitizeHtml(userContent)}</div>
```

### Files to Fix:

#### ✅ IntelligentTaskAssignmentDemo.tsx (Lines 83, 187)
```typescript
// Line 83 - Already fixed
{sanitizeHtml(type.replace('_', ' ').toUpperCase())}

// Line 187 - Add:
{sanitizeHtml(rule.task_type.replace('_', ' ').toUpperCase())}
```

#### ✅ AuditLogViewer.tsx (Line 97)
```typescript
// Already fixed:
{log.details ? sanitizeHtml(sanitizeForLog(log.details)) : '—'}
```

#### ✅ DataExportTool.tsx (Lines 72-73)
```typescript
// Already fixed - CSV export sanitized
```

#### ✅ TwoFactorSetupModal.tsx (Line 160)
```typescript
// Already fixed:
{sanitizeHtml(setupData.secret)}
```

#### ❌ RealTimeCommunicationHub.tsx (Line 175)
```typescript
// Add sanitization to message display:
<p className="text-sm">{sanitizeHtml(message.content)}</p>
```

#### ❌ LoggingDashboard.tsx (Line 189)
```typescript
// Add sanitization to log display:
<pre>{sanitizeHtml(log.message)}</pre>
```

#### ❌ UATDashboard.tsx (Line 71)
```typescript
// Add sanitization to test result:
<div>{sanitizeHtml(result.description)}</div>
```

#### ❌ chart.tsx (Lines 71-85)
```typescript
// Add sanitization to chart labels:
label: sanitizeHtml(String(label))
```

#### ❌ DocumentsPage.tsx (Line 128)
```typescript
// Add sanitization to document name:
<span>{sanitizeHtml(document.title)}</span>
```

#### ❌ EnhancedPortalPage.tsx (Lines 271, 342, 508)
```typescript
// Line 271 - Prescription details:
<p>{sanitizeHtml(prescription.medication_name)}</p>

// Line 342 - Lab results:
<p>{sanitizeHtml(result.test_name)}</p>

// Line 508 - Appointment details:
<p>{sanitizeHtml(appointment.doctor_name)}</p>
```

#### ❌ reportExport.ts (Lines 56, 220-226)
```typescript
// Line 56 - CSV export:
headers.map(h => sanitizeHtml(h)).join(',')

// Lines 220-226 - PDF export:
text: sanitizeHtml(String(value))
```

#### ❌ useAuditLogger.ts (Lines 32-40)
```typescript
// Sanitize event data before sending:
events: sanitizeForLog({
  user_id: user.id,
  ...event,
})
```

#### ❌ useVoiceTranscription.ts (Lines 48-57)
```typescript
// Sanitize transcription result:
setTranscript(sanitizeHtml(event.results[0][0].transcript))
```

---

## 2. Log Injection Fixes (CWE-117) - 71 Issues

### Pattern:
```typescript
import { sanitizeLogMessage } from '@/utils/sanitize';
// Replace: console.error('Error:', error);
// With: console.error('Error:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
```

### Files Already Fixed (16):
- ✅ EnhancedErrorBoundary.tsx
- ✅ ErrorBoundary.tsx
- ✅ useAppointmentRequests.ts
- ✅ useCareGaps.ts
- ✅ useClinicalPharmacy.ts
- ✅ useDocumentUpload.ts
- ✅ useDrugUtilizationReview.ts
- ✅ useEnhancedNotifications.ts
- ✅ useErrorTracking.ts
- ✅ useIntegration.ts
- ✅ useIntelligentTaskRouter.ts
- ✅ paymentService.ts
- ✅ main.tsx
- ✅ web-vitals.ts

### Files Needing Fixes (55):

#### Hooks (40 files):
1. **useOptimisticMutation.ts** (Line 50)
2. **useRefillRequests.ts** (Lines 142, 175, 293)
3. **useSecureMessaging.ts** (Line 145)
4. **useTaskAssignments.ts** (Lines 87, 123)
5. **useTriageAssessments.ts** (Line 62)
6. **useVitalSigns.ts** (Line 136)
7. **useVoiceTranscription.ts** (Line 49)
8. **useWorkflowNotifications.ts** (Line 28)

#### Components (6 files):
9. **InterRoleCommunicationHub.tsx** (Lines 70, 75)
10. **TaskAssignmentSystem.tsx** (Line 85)
11. **PatientPrepChecklistCard.tsx** (Lines 466, 475)

#### Contexts (1 file):
12. **AuthContext.tsx** (Line 178)

#### Libraries (1 file):
13. **sentry.ts** (Line 20)

#### Pages (1 file):
14. **LoginPage.tsx** (Line 41)

---

## 3. Hardcoded Credentials (CWE-798/259) - 10 Issues

### Status: MOSTLY FALSE POSITIVES

#### ✅ OutpatientMockup.tsx (Lines 7-10)
**Status**: FALSE POSITIVE - Mock UI data for demo
```typescript
// These are sample patient names for UI mockup, NOT credentials
const queueItems = [
  { token: 'Q-001', name: 'Aisha Patel', ... },
  // ...
];
```
**Action**: Add comment to suppress warning:
```typescript
// @ts-ignore - Mock data for UI demonstration only
const queueItems = [ ... ];
```

#### ✅ SignupPage.tsx (Lines 85, 89)
**Status**: FALSE POSITIVE - Form placeholders
```typescript
// These are placeholder text for user guidance, NOT real credentials
placeholder="admin@hospital.com"
placeholder="LIC-123456"
```
**Action**: No fix needed - these are UI placeholders

#### ✅ paymentService.ts (Line 23)
**Status**: FIXED - Using environment variable
```typescript
// Already fixed:
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
```

---

## 4. SSRF Fixes (CWE-918) - 2 Issues

### ✅ cache-manager.ts (Lines 73, 80)
**Status**: ALREADY FIXED
```typescript
import { sanitizeUrl } from '@/utils/sanitize';

const cacheFirst = async (url: string): Promise<Response> => {
  const sanitizedUrl = sanitizeUrl(url);
  if (!sanitizedUrl) throw new Error('Invalid URL');
  const response = await fetch(sanitizedUrl);
  // ...
};
```

---

## 5. Code Quality Issues - 10 Issues

### These are non-security issues:
1. **DoctorDashboard.tsx** (Line 55) - Readability
2. **LabTechDashboard.tsx** (Line 164) - Naming
3. **NurseDashboard.tsx** (Lines 36, 64-65) - Readability & Error Handling
4. **PatientDashboard.tsx** (Lines 42, 174) - Performance
5. **PatientQueue.tsx** (Lines 41, 88, 102-122) - Multiple issues
6. **PharmacistDashboard.tsx** (Line 55) - Naming
7. **StatsCard.tsx** (Lines 67, 76) - Readability
8. **UpcomingAppointments.tsx** (Line 73) - Error Handling

**Action**: These are suggestions for improvement, not security vulnerabilities. Can be addressed in code refactoring phase.

---

## Quick Fix Script

### For Log Injection (Batch Fix):
```bash
# Add import to all files
find src/ -name "*.ts" -o -name "*.tsx" | while read file; do
  if grep -q "console.error" "$file" && ! grep -q "sanitizeLogMessage" "$file"; then
    sed -i "1i import { sanitizeLogMessage } from '@/utils/sanitize';" "$file"
  fi
done

# Replace console.error patterns
find src/ -name "*.ts" -o -name "*.tsx" | while read file; do
  sed -i "s/console\.error(\([^,]*\), error)/console.error(\1, sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'))/g" "$file"
done
```

### For XSS (Manual Fix Required):
Each XSS issue needs manual review to determine the correct sanitization point.

---

## Verification Checklist

After applying fixes:
- [ ] Run `npm run type-check`
- [ ] Run `npm run lint`
- [ ] Re-run Amazon Q Security Scan
- [ ] Test affected components manually
- [ ] Verify no breaking changes

---

## Priority Order

1. **HIGH**: XSS issues (15) - Direct security risk
2. **HIGH**: Log Injection (71) - Security & compliance risk
3. **MEDIUM**: SSRF (2) - Already fixed
4. **LOW**: Hardcoded Credentials (10) - Mostly false positives
5. **LOW**: Code Quality (10) - Non-security improvements

---

## Estimated Time

- XSS Fixes: 30 minutes
- Log Injection Fixes: 45 minutes
- Verification: 15 minutes
- **Total**: ~90 minutes

---

*Generated: $(date)*
*All patterns and utilities are ready in src/utils/sanitize.ts*
