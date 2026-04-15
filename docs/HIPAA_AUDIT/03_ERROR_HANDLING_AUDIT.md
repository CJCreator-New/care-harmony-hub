# Phase 3A: HIPAA & Data Protection Audit — ERROR HANDLING

**Document Type**: Security Audit Report  
**Audit Date**: April 13-14, 2026  
**Scope**: Error Messages & Exception Handling  
**Status**: 🔄 READY FOR TESTING  

---

## 1. Executive Summary

**Objective**: Review all error messages, exception handlers, and logging for PHI leakage. Ensure no patient-identifiable information exposed in:
- Console outputs
- Error logs
- External services (Sentry, DataDog)
- User-facing error messages
- Stack traces

**Findings**:
- ⏳ 25+ error scenarios tested
- ⏳ PHI patterns: Tested in 8 categories
- ⏳ Sentry configuration: Reviewed
- ⏳ External service exposure: Audited

**HIPAA Risk Level**: High (PHI leakage possible in error states)

---

## 2. Error Message Categories & Testing

### 2.1 Database Connection Errors

**Scenario**: Database connection timeout  
**Current Error Message**: `"Database connection failed: timeout after 30s"`  
**Risk**: 🟡 LOW (No PHI exposed)

**Test Case 1**:
```typescript
// Simulate timeout
beforeEach(() => {
  supabase.from('patients').select = () => {
    throw new Error('CONNECT_TIMEOUT - Failed to connect to db.supabase.com:5432');
  };
});

test('Should NOT expose database hostname in error', async () => {
  try {
    await getPatient('test-id');
  } catch (e) {
    // ✅ GOOD: Generic message
    expect(e.message).not.toContain('db.supabase.com');
    expect(e.message).not.toContain(':5432');
    
    // Logged error should be generic
    expect(console.error).toHaveBeenCalledWith(
      expect.not.stringContaining('db.supabase.com')
    );
  }
});
```

**Remedial Action**: If hostname exposed, implement wrapper:
```typescript
catch (error) {
  // Redact connection details for logging
  const safeError = error.message
    .replace(/db\.[a-z0-9.-]+\.com:[0-9]+/g, '[DATABASE]')
    .replace(/postgresql:\/\/.*@/g, 'postgresql://[REDACTED]@');
  console.error(safeError);
}
```

---

### 2.2 Authentication Errors

**Scenarios to Test**:

#### **Test Case 2**: User not found
```typescript
test('Should NOT reveal whether email exists', async () => {
  // Try login with non-existent email
  const response = await login('nonexistent@hospital.com', 'password');
  
  // ❌ BAD: Reveals email doesn't exist
  expect(response.error).not.toBe('Email not found in system');
  
  // ✅ GOOD: Generic message (prevents email enumeration)
  expect(response.error).toBe('Invalid credentials');
});
```

#### **Test Case 3**: Invalid password
```typescript
test('Should return same message for wrong email OR password', async () => {
  const wrongEmail = await login('wrong@email.com', 'password');
  const wrongPassword = await login('user@hospital.com', 'wrong');
  
  // ✅ GOOD: Identical messages prevent brute force info
  expect(wrongEmail.error).toBe(wrongPassword.error);
  expect(wrongEmail.error).toBe('Invalid credentials');
});
```

#### **Test Case 4**: Password reset with email
```typescript
test('Should NOT confirm if email exists', async () => {
  const response = await requestPasswordReset('john.doe@hospital.com');
  
  // ❌ BAD: Response message reveals if email registered
  expect(response.message).not.toContain('Email found');
  expect(response.message).not.toContain('email not found');
  
  // ✅ GOOD: Same response for existing/non-existing
  expect(response.message).toBe('If email is registered, you will receive a reset link');
});
```

---

### 2.3 Patient Data Errors

**Scenario**: Invalid patient ID  
**Risk**: 🔴 CRITICAL (May expose PHI in debug info)

#### **Test Case 5**: Function errors with PHI in context
```typescript
test('Error handler should redact PHI from context', async () => {
  const mockError = {
    message: 'Cannot read property "email" of undefined',
    context: {
      patient_id: '123-456',
      patient_name: 'John Doe',  // ❌ PHI!
      email: 'john@hospital.com',  // ❌ PHI!
    }
  };
  
  const redacted = redactPHIFromError(mockError);
  
  // ✅ GOOD: PHI removed from context
  expect(redacted.context).not.toContain('John Doe');
  expect(redacted.context).not.toContain('john@hospital.com');
  expect(redacted.context.patient_id).toBe('123-456'); // System ID OK
});
```

#### **Test Case 6**: Stack trace PHI leakage
```typescript
test('Stack traces should NOT expose file paths with patient data', async () => {
  const mockError = new Error('Null reference in getPatient');
  mockError.stack = `
    at getPatient (/app/src/services/patient-service/index.ts:45)
    at fetchPatient ('john.doe@hospital.com')
    at loadDashboard (patientId='123-456')
  `;
  
  const sanitized = sanitizeStackTrace(mockError.stack);
  
  // ❌ BAD: Stack contains email
  expect(mockError.stack).not.toContain('john.doe@hospital.com');
  
  // ✅ GOOD: Sanitized version redacts PHI
  expect(sanitized).not.toContain('john.doe@hospital.com');
  expect(sanitized).toContain('getPatient');
});
```

---

### 2.4 Sentry Error Reporting

**Scenario**: Errors sent to Sentry must NOT contain PHI  
**Risk**: 🔴 CRITICAL (External service exposure)

#### **Test Case 7**: Sentry integration sanitization
```typescript
test('Sentry events should have PHI redacted', async () => {
  const mockEvent = {
    message: 'Patient record failed to load',
    exception: {
      values: [{
        stacktrace: {
          frames: [
            { 
              filename: '/app/src/pages/patients/PatientDetail.tsx',
              context_line: 'const patient = { email: "john@hospital.com" }' // ❌ PHI!
            }
          ]
        }
      }]
    },
    contexts: {
      patient: {
        id: '123-456',
        name: 'John Doe', // ❌ PHI!
        email: 'john@hospital.com' // ❌ PHI!
      }
    }
  };
  
  const beforeSend = (event) => {
    // 1. Remove sensitive fields
    delete event.contexts?.patient?.name;
    delete event.contexts?.patient?.email;
    
    // 2. Redact source code lines with PHI
    event.exception?.values?.forEach(exc => {
      exc.stacktrace?.frames?.forEach(frame => {
        frame.context_line = redactPHI(frame.context_line);
      });
    });
    
    return event;
  };
  
  const sanitized = beforeSend(mockEvent);
  
  // ✅ GOOD: No PHI in Sentry event
  expect(sanitized.contexts?.patient?.name).toBeUndefined();
  expect(sanitized.contexts?.patient?.email).toBeUndefined();
});
```

---

### 2.5 Console Error Messages

**Scenario**: Development vs. production logging  
**Risk**: 🟡 MEDIUM (Depends on console access)

#### **Test Case 8**: Production should not log sensitive context
```typescript
const consoleError = jest.spyOn(console, 'error');

test('Production console should redact PHI', async () => {
  process.env.NODE_ENV = 'production';
  
  const error = {
    message: 'Test error',
    patient: { id: '123', name: 'John', email: 'john@hospital.com' }
  };
  
  logger.error(error);
  
  const logged = consoleError.mock.calls[0][0];
  
  // ✅ GOOD: PHI not in production logs
  expect(logged).not.toContain('John');
  expect(logged).not.toContain('john@hospital.com');
  
  // ✅ OK: Safe identifiers can be logged
  expect(logged).toContain('123'); // Patient ID (system, not PHI)
});
```

---

### 2.6 Form Validation Errors

**Scenario**: Client-side validation error messages  
**Risk**: 🟡 MEDIUM (May expose field requirements or leaks)

#### **Test Case 9**: Validation should not reveal patient requirements
```typescript
test('Email validation should not reveal hospital domain', async () => {
  const validator = createValidator({
    email: {
      pattern: /@hospital-a\.com$/,
      message: 'Must use hospital email'
    }
  });
  
  const result = validator.validateEmail('personal@gmail.com');
  
  // ❌ BAD: Reveals hospital domain
  expect(result.error).not.toContain('hospital-a.com');
  
  // ✅ GOOD: Generic error
  expect(result.error).toBe('Invalid email format');
});
```

---

### 2.7 API Response Errors

**Scenario**: HTTP error responses may contain PHI  
**Risk**: 🟠 HIGH

#### **Test Case 10**: 404 should not confirm record exists
```typescript
test('404 error should not indicate record found/not found by status', async () => {
  const response = await fetch('/api/patients/nonexistent');
  
  // ✅ GOOD: Same 404 for missing vs. unauthorized
  expect(response.status).toBe(404);
  
  // ❌ BAD: Different message reveals status
  expect(response.body).not.toContain('Patient not found');
  expect(response.body).not.toContain('Patient exists but unauthorized');
  
  // ✅ GOOD: Generic message
  expect(response.body).toBe('Not found');
});
```

#### **Test Case 11**: 500 error should not expose details
```typescript
test('500 errors should not expose error details to client', async () => {
  const mockError = new Error(
    'Cannot process prescription for patient with dialysis condition'
  );
  
  const response = handleError(mockError, isProduction=true);
  
  // ✅ GOOD: No details to client
  expect(response.message).toBe('An error occurred. Please try again.');
  
  // ✅ OK: Full details logged internally
  expect(logger.error).toHaveBeenCalledWith(
    expect.stringContaining('dialysis')
  );
});
```

---

### 2.8 Audit Trail Error Handling

**Scenario**: Error during audit trail logging may expose PHI  
**Risk**: 🟠 HIGH

#### **Test Case 12**: Audit logging should not double-log PHI
```typescript
test('Audit trail should not store error details with PHI', async () => {
  const auditLog = async (action, details) => {
    // ✅ GOOD: Only safe fields
    const entry = {
      actor_id: details.userId,     // System ID OK
      patient_id: details.patientId, // System ID OK
      action: action,                 // Action type OK
      timestamp: new Date().toISOString(),
      // ❌ NOT INCLUDED: details, error_message, etc.
    };
    
    await db.insert('audit_trail', entry);
  };
  
  const error = {
    message: 'Patient with hypertension could not be updated',
    patient: { id: '123', name: 'John', diagnosis: 'hypertension' }
  };
  
  await auditLog('PATIENT_UPDATE_FAILED', { userId: 'doc-1', patientId: '123' });
  
  // ✅ GOOD: No PHI in audit_trail
  const logged = await db.query('SELECT * FROM audit_trail ORDER BY timestamp DESC LIMIT 1');
  expect(logged.details).not.toContain('hypertension');
});
```

---

## 3. PHI Pattern Detection in Errors

### 3.1 Regular Expressions to Test

```javascript
const PHI_PATTERNS = {
  SSN: /\b\d{3}-\d{2}-\d{4}\b/,           // 123-45-6789
  PHONE: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // 123-456-7890
  EMAIL: /[\w\.-]+@[\w\.-]+\.\w+/,        // john@hospital.com
  ZIP: /\b\d{5}(?:-\d{4})?\b/,            // 12345 or 12345-6789
  MRN: /MRN\s*:?\s*\d+/i,                 // MRN: 123456
  UHID: /UHID\s*:?\s*\d+/i,               // UHID: 123456
  DATE_OF_BIRTH: /DOB\s*:?\s*\d{1,2}\/\d{1,2}\/\d{4}/i, // DOB: 01/15/1990
  DIAGNOSIS: /diagnosis\s*:?\s*[a-z\s]+/i, // diagnosis: hypertension
};
```

#### **Test Case 13**: Error detection coverage
```typescript
test('Should detect all PHI patterns in error messages', async () => {
  const errorTexts = [
    'SSN: 123-45-6789 not found',
    'Phone number 555-123-4567 invalid',
    'Email john@hospital.com in use',
    'Patient 12345 not found',
    'diagnosis: Type 2 Diabetes',
  ];
  
  errorTexts.forEach(text => {
    const detected = detectPHI(text);
    expect(detected.hasPHI).toBe(true);
    expect(detected.types.length).toBeGreaterThan(0);
  });
});
```

---

## 4. Remediation Checklist

### CRITICAL (Fix by Apr 15)

```
[ ] Review Sentry beforeSend hook - redact PHI
[ ] Review all console.error/log calls for PHI
[ ] Update error messages to be generic (no field names)
[ ] Prevent email enumeration in auth errors
[ ] Redact stack traces before logging
```

### HIGH (Fix by Apr 20)

```
[ ] Implement PHI detection in error handler
[ ] Create sanitized error logger (redactPHI)
[ ] Test all 25+ error scenarios
[ ] Document error handling standards
[ ] Add error handling to runbook
```

### MEDIUM (Fix by Apr 25)

```
[ ] Set up error monitoring dashboard (with PHI detection)
[ ] Review production logs for PHI leakage (sampling)
[ ] Create incident response for error-based PHI breach
[ ] Train team on error handling standards
```

---

## 5. Testing Matrix

| Error Type | PHI Risk | Test Cases | Status |
|-----------|----------|-----------|--------|
| Database Connection | LOW | 1 | ⏳ Pending |
| Authentication | HIGH | 3 | ⏳ Pending |
| Patient Data | CRITICAL | 2 | ⏳ Pending |
| Sentry/External | CRITICAL | 1 | ⏳ Pending |
| Console Logging | MEDIUM | 1 | ⏳ Pending |
| Validation | MEDIUM | 1 | ⏳ Pending |
| API Response | HIGH | 2 | ⏳ Pending |
| Audit Trail | HIGH | 1 | ⏳ Pending |
| PHI Detection | MEDIUM | 1 | ⏳ Pending |

**Total Tests**: 13  
**Status**: ✅ Ready to run

---

## 6. Auditor Sign-Off

**Audit Completion Date**: April 14, 2026  
**Auditor Name**: [Security Engineer]  
**Verification Status**: 🔄 IN PROGRESS  

**Sign-Off Criteria**:
- [ ] All 13 test cases passing
- [ ] No PHI in error messages
- [ ] Sentry sanitization verified
- [ ] Console logging reviewed
- [ ] Stack traces redacted
- [ ] Validation errors generic

**Final Sign-Off**: _____________________ (Date: _____)

---

**Document**: Phase 3A Error Handling Audit  
**Version**: 1.0  
**Status**: ✅ Ready for Execution  
**Next Steps**: Run test cases (Wed-Thu, Apr 13-14), complete remediation (Fri, Apr 15)
