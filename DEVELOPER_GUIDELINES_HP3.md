# HP-3: Error Handling & PHI Logging - Developer Guidelines

**Target Audience:** All developers contributing to CareSync HIMS  
**Last Updated:** April 10, 2026  
**Required Reading:** Yes (HIPAA compliance requirement)

---

## Quick Reference

### When to log?
- ✅ Critical errors that need investigation
- ✅ Security events (auth failures, permission denials)
- ✅ Performance issues (slow queries, timeouts)
- ❌ Normal application flow
- ❌ User data without sanitization

### How to log safely?
```typescript
// Use provided utilities
import { sanitizeForLog, devError, devLog } from '@/utils/sanitize';
import { errorHandler } from '@/lib/monitoring/ErrorBoundary';
import { createLogger } from '@/utils/logger';

// Option 1: Development logging
devError('My error message', error);

// Option 2: Sanitized logging
console.error(sanitizeForLog(errorMessage));

// Option 3: Centralized error handling
errorHandler.handleError(error, 'context');

// Option 4: Structured logger
const logger = createLogger('module');
logger.warn(sanitizeForLog(message));
```

### What NOT to log?
```typescript
❌ Patient names, emails, phone numbers, addresses
❌ Medical record numbers (MRN), social security numbers (SSN)
❌ Credit card numbers or payment info
❌ Full error objects (use .message)
❌ Stack traces (unless in development)
❌ Request bodies with PHI
❌ User credentials or tokens
```

---

## Frontend Logging Guidelines

### 1. Error Boundaries

**What:** React components that catch JavaScript errors and display fallback UI  
**Where:** Wrap all major page components  
**Why:** Prevents white-screen crashes and automatically sanitizes errors

```typescript
// ✅ CORRECT: Already done in App.tsx
<ErrorBoundary>
  <PatientDashboard />
</ErrorBoundary>

// ✅ CORRECT: Wrap route-level components
<ErrorBoundary key={location.pathname}>
  <AppRoutes />
</ErrorBoundary>
```

### 2. Console Logging

**For Development:**
```typescript
import { devError, devLog } from '@/utils/sanitize';

// Only appears in development environment
devLog('Patient loaded:', patient.id);
devError('Failed to load patient', error);
```

**For Production:**
```typescript
import { sanitizeForLog } from '@/utils/sanitize';

// Always sanitizes before logging
console.error(sanitizeForLog(error.message));
console.warn(sanitizeForLog(`Failed to process: ${reason}`));
```

### 3. Component Error Handling

```typescript
// ✅ GOOD: Catch, sanitize, display
function PatientForm() {
  const [error, setError] = useState<string>();

  const handleSubmit = async (data: unknown) => {
    try {
      await submitForm(data);
    } catch (err) {
      const message = err instanceof Error 
        ? sanitizeForLog(err.message)
        : 'An error occurred';
      setError(message);
      devError('Form submission failed', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert>{error}</Alert>}
      {/* form fields */}
    </form>
  );
}

// ❌ BAD: Direct error exposure
const handleSubmit = (data: unknown) => {
  submitForm(data).catch(err => {
    console.error('Form error:', err); // May expose PHI
  });
};
```

### 4. Hook Error Handling

```typescript
// ✅ GOOD: Safe hook error handling
function usePatientData(patientId: string) {
  const { data, error } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      try {
        return await fetchPatient(patientId);
      } catch (err) {
        devError(`Failed to fetch patient ${patientId}`, err);
        throw err;
      }
    },
  });

  return { data, error: error?.message };
}

// ❌ BAD: Exposing full error
function usePatientData(patientId: string) {
  const { data, error } = useQuery({
    queryFn: () => fetchPatient(patientId),
  });
  
  // If error.message contains PHI, it's exposed now
  return { data, error: error?.message };
}
```

### 5. Sentry/Error Tracking Integration

```typescript
import { captureException } from '@sentry/react';
import { sanitizeForLog } from '@/utils/sanitize';

// ✅ GOOD: Filter sensitive fields
captureException(error, {
  contexts: {
    user: {
      id: userId,
      // NOT: email, phone, other PHI
    },
    hospital: {
      id: hospitalId,
      // NOT: full hospital object
    },
  },
  extra: {
    sanitizedMessage: sanitizeForLog(error.message),
    requestId: getCorrelationId(),
  },
});

// ❌ BAD: Sending full context
captureException(error, {
  contexts: {
    patient: patientData, // Contains PHI!
  },
});
```

---

## Backend Logging Guidelines

### 1. Edge Function Error Handling

```typescript
import {
  errorHandler,
  BadRequestError,
  NotFoundError,
  createErrorResponse,
} from './_shared/errorHandler.ts';

// ✅ GOOD: Use centralized error handler
Deno.serve(async (req: Request) => {
  try {
    const patientId = req.pathname.split('/')[2];
    const patient = await getPatient(patientId);

    if (!patient) {
      throw new NotFoundError(`Patient not found`);
    }

    return createErrorResponse(
      { success: true, data: patient },
      req.headers.get('X-Request-ID')
    );
  } catch (error) {
    return createErrorResponse(error, req.headers.get('X-Request-ID'));
  }
});

// ❌ BAD: Unprotected error responses
Deno.serve(async (req: Request) => {
  try {
    const patient = await getPatient(patientId);
    return new Response(JSON.stringify(patient));
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});
```

### 2. Database Error Handling

```typescript
import { sanitizeLogMessage } from './_shared/sanitizeLog.ts';

// ✅ GOOD: Sanitize database errors
async function queryPatients(hospitalId: string) {
  try {
    const result = await supabase
      .from('patients')
      .select('*')
      .eq('hospital_id', hospitalId);

    if (result.error) {
      console.error(sanitizeLogMessage(`DB error: ${result.error.message}`));
      throw new InternalServerError('Failed to load patients');
    }

    return result.data;
  } catch (error) {
    console.error(sanitizeLogMessage(`DB query failed: ${error.message}`));
    throw error;
  }
}

// ❌ BAD: Exposing database internals
const queryPatients = async (hospitalId: string) => {
  const result = await supabase
    .from('patients')
    .select('*')
    .eq('hospital_id', hospitalId);
  
  if (result.error) {
    console.error('DB error:', result.error); // May expose table structure
  }
  return result.data;
};
```

### 3. API Request Logging

```typescript
// ✅ GOOD: Log only safe information
function logRequest(req: Request) {
  const url = new URL(req.url);
  const requestId = req.headers.get('X-Request-ID');

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    path: url.pathname,
    // NOT: req.body, query params with PHI, headers with tokens
  }));
}

// ❌ BAD: Logging everything
function logRequest(req: Request) {
  console.log('Request:', {
    ...req,
    body: req.body,  // May contain PHI
    headers: req.headers,  // May contain tokens
  });
}
```

---

## Structured Logging Best Practices

### Use Structured Logging, Not Free Text

```typescript
// ✅ GOOD: Structured, parseable
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  timestamp: string;
  requestId: string;
  module: string;
  action: string;
  status: 'success' | 'failure';
  message: string;
  duration?: number;
}

const logEntry: LogEntry = {
  level: 'error',
  timestamp: new Date().toISOString(),
  requestId: correlationId,
  module: 'patient-service',
  action: 'create_prescription',
  status: 'failure',
  message: sanitizeForLog(error.message),
  duration: performance.now() - start,
};

console.error(JSON.stringify(logEntry));

// ❌ BAD: Free text, unstructured
console.error(
  `Failed at ${new Date().toISOString()}: ${error} for request ${req} in patient-service`
);
```

### Include Context Without PHI

```typescript
// ✅ GOOD: Safe context
const context = {
  correlationId: 'req-abc123',
  userId: 'user-xyz', // ID only
  hospitalId: 'hosp-456', // ID only
  module: 'prescription-service',
  action: 'approve_prescription',
  prescriptionId: 'rx-789', // ID only
  timestamp: new Date().toISOString(),
};

// ❌ BAD: Unnecessary PHI in context
const context = {
  patient: patientRecord, // Contains name, DOB, medical history
  prescriber: prescriberData, // Contains contact info
  diagnosis: 'Hypertension', // Sensitive medical info
};
```

---

## Testing & Validation

### Unit Tests for Error Handling

```typescript
// ✅ GOOD: Test error sanitization
describe('Error sanitization', () => {
  it('removes SSN from error messages', () => {
    const error = 'Patient SSN 123-45-6789 not found';
    const sanitized = sanitizeForLog(error);
    
    expect(sanitized).not.toContain('123-45-6789');
    expect(sanitized).toContain('[SSN]');
  });

  it('handles error objects safely', () => {
    const error = new Error('Email test@hospital.com failed');
    const sanitized = sanitizeForLog(error.message);
    
    expect(sanitized).not.toContain('test@hospital.com');
    expect(sanitized).toContain('[EMAIL]');
  });
});
```

### Integration Tests for Error Responses

```typescript
// ✅ GOOD: Test error response format
describe('Error responses', () => {
  it('returns sanitized error in production', async () => {
    const response = await handleRequest(badRequest);
    const body = await response.json();
    
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('BAD_REQUEST');
    // error.message should be safe for end user
    expect(body.error.message).not.toContain('select');
    expect(body.error.details).toBeUndefined();
  });

  it('returns request ID for tracking', async () => {
    const requestId = 'req-test-123';
    const response = await handleRequest(req, requestId);
    
    expect(response.headers.get('X-Request-ID')).toBe(requestId);
  });
});
```

---

## Troubleshooting

### Problem: Too Many Sanitization Warnings

**Solution:** Review what you're logging
```typescript
// Instead of logging everything and sanitizing:
console.log(sanitizeForLog(JSON.stringify(patient))); // 🟡 Works but overkill

// Only log what you need:
const safeInfo = {
  id: patient.id,
  status: patient.status,
  createdAt: patient.created_at,
};
console.log(JSON.stringify(safeInfo)); // ✅ Better
```

### Problem: Error Message Lost in Production

**Know:** Production sanitizes for user safety
```typescript
// In production, user sees:
"An error occurred. Please contact support."

// In development, you see:
"Patient SSN [SSN] validation failed: invalid format"

// Always check development logs for details
devLog('Full error context:', error);
```

### Problem: Correlation ID Not Present

**Check:** Ensure X-Request-ID header in requests
```typescript
const correlationId = crypto.randomUUID();

// Frontend: Add to all requests
const response = await fetch(url, {
  headers: {
    'X-Request-ID': correlationId,
  },
});

// Backend: Check in handler
const requestId = req.headers.get('X-Request-ID');
console.log({ requestId, message });
```

---

## Compliance Checklist

Before committing code, verify:

- [ ] No direct `error.message` logging (use sanitizeForLog)
- [ ] No patient objects in logs (only IDs)
- [ ] Error boundaries wrap all major components
- [ ] Backend uses errorHandler for all endpoints
- [ ] Correlation IDs present in requests
- [ ] No PHI in console.log calls
- [ ] Test covers error scenarios
- [ ] Documentation explains error flow

---

## Quick Patterns to Copy-Paste

### Safe Component Error Handling
```typescript
import { sanitizeForLog } from '@/utils/sanitize';
import { useState } from 'react';

export function MyComponent() {
  const [error, setError] = useState<string>();

  const handleAction = async () => {
    try {
      await performAction();
      setError(undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('An error occurred. Please try again or contact support.');
      console.error(sanitizeForLog(message));
    }
  };

  return (
    <>
      {error && <div className="error">{error}</div>}
      <button onClick={handleAction}>Do Something</button>
    </>
  );
}
```

### Safe Edge Function
```typescript
import { errorHandler, createSuccessResponse, createErrorResponse } from './_shared/errorHandler.ts';

export default async (req: Request) => {
  const correlationId = req.headers.get('X-Request-ID') || crypto.randomUUID();
  
  try {
    const result = await processRequest(req);
    return createSuccessResponse(result, correlationId);
  } catch (error) {
    return createErrorResponse(error, correlationId);
  }
};
```

### Safe Logger Setup
```typescript
import { sanitizeForLog } from '@/utils/sanitize';
import { devError, devLog } from '@/utils/sanitize';

export const logger = {
  error: (msg: string, error?: any) => {
    console.error(sanitizeForLog(msg), error);
  },
  warn: (msg: string) => {
    console.warn(sanitizeForLog(msg));
  },
  debug: (msg: string, data?: any) => {
    devLog(msg, data);
  },
};
```

---

## Additional Resources

- **HIPAA Laws:** https://www.hhs.gov/hipaa/
- **OWASP Logging:** https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- **PII Types:** https://www.dhs.gov/about-pii
- **Error Handling Standard:** See `HP3_PR_COMPLETION_STATUS.md`
- **Audit Report:** See `HP3_PR3_AUDIT_REPORT.md`

---

## Contact & Questions

- **Tech Lead:** For guidance on logging patterns
- **Security Officer:** For compliance questions
- **DevOps:** For monitoring/alerting setup

**Last Training:** April 10, 2026  
**Next Training:** July 10, 2026 (Quarterly refresher)

---

**Remember:** When in doubt, don't log it. If you must log, sanitize it.
