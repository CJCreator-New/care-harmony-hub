
# CareSync HIMS: Standardized Forms Development Guide

## Overview

This guide establishes standardized form patterns for CareSync HIMS. All forms must follow these patterns to ensure consistency, clinical safety, and maintainability.

**Key Goals:**
- ✅ Centralized validation schemas (no duplicated Zod definitions)
- ✅ Standardized error handling and user feedback
- ✅ Clinical validations at form initialization
- ✅ PHI safety (no sensitive data in logs/console)
- ✅ Accessibility compliance (WCAG 2.1 AA)
- ✅ Type safety across all forms

---

## Quick Start

### 1. Simple Form Example (Patient Demographics)

```tsx
import { useFormStandardized } from '@/lib/hooks/useFormStandardized';
import { patientDemographicsSchema } from '@/lib/schemas/formValidation';
import { StandardizedFormField } from '@/components/forms/StandardizedFormField';
import { Form, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function PatientDemographicsForm() {
  const form = useFormStandardized(patientDemographicsSchema, {
    onSuccess: async (data) => {
      // Save to database
      await savePatient(data);
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit} className="space-y-6">
        
        {/* First Name */}
        <StandardizedFormField
          control={form.control}
          name="first_name"
          label="First Name"
          required
        >
          <FormControl>
            <Input placeholder="John" {...form.register('first_name')} />
          </FormControl>
        </StandardizedFormField>

        {/* Last Name */}
        <StandardizedFormField
          control={form.control}
          name="last_name"
          label="Last Name"
          required
        >
          <FormControl>
            <Input placeholder="Doe" {...form.register('last_name')} />
          </FormControl>
        </StandardizedFormField>

        {/* Date of Birth */}
        <StandardizedFormField
          control={form.control}
          name="date_of_birth"
          label="Date of Birth"
          description="Must be between ages 0-150"
          required
          type="date"
        >
          <FormControl>
            <Input type="date" {...form.register('date_of_birth')} />
          </FormControl>
        </StandardizedFormField>

        {/* Gender */}
        <StandardizedFormField
          control={form.control}
          name="gender"
          label="Gender"
          required
        >
          <FormControl>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer Not to Say</SelectItem>
              </SelectContent>
            </Select>
          </FormControl>
        </StandardizedFormField>

        {/* Phone */}
        <StandardizedFormField
          control={form.control}
          name="phone"
          label="Phone Number"
          description="Optional"
        >
          <FormControl>
            <Input placeholder="+1 (555) 123-4567" {...form.register('phone')} />
          </FormControl>
        </StandardizedFormField>

        <Button type="submit" disabled={form.isSubmitting}>
          {form.isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Form>
  );
}
```

---

## 2. Schema Usage Pattern

### Define Once, Use Everywhere

**Good** ✅ - Centralized schema:
```tsx
// src/lib/schemas/formValidation.ts
export const prescriptionFormSchema = z.object({
  patient_id: z.string().uuid(),
  drug_name: drugNameSchema,  // Reusable sub-schema
  dose: dosageSchema,         // Reusable sub-schema
  frequency: medicationFrequencySchema,
  // ... etc
});

// src/pages/CreatePrescription.tsx
import { prescriptionFormSchema } from '@/lib/schemas/formValidation';
const form = useFormStandardized(prescriptionFormSchema, {/*...*/});

// src/components/PrescriptionModal.tsx
import { prescriptionFormSchema } from '@/lib/schemas/formValidation';
const form = useFormStandardized(prescriptionFormSchema, {/*...*/});
```

**Bad** ❌ - Duplicate schemas:
```tsx
// Don't repeat!
const form1 = useForm({
  resolver: zodResolver(z.object({ ... }))
});

// Don't repeat!
const form2 = useForm({
  resolver: zodResolver(z.object({ ... }))
});
```

---

## 3. Clinical Validation Rules

Forms enforce clinical appropriateness at the **schema level**:

```tsx
// Age-aware vital sign validation
export const bloodPressureSystolicSchema = z
  .number()
  .min(50, 'Systolic too low')
  .max(250, 'Systolic too high');

// Drug route compatibility
export const routeOfAdministrationSchema = z.enum([
  'oral',
  'intravenous',
  'intramuscular',
  // Only valid, clinically appropriate routes
]);

// Frequency boundaries
export const durationDaysSchema = z
  .number()
  .min(1, 'Duration must be at least 1 day')
  .max(365, 'Duration cannot exceed 1 year');

// Cross-field validation (requires .refine())
export const vitalSignsFormSchema = z.object({
  // ... fields ...
}).refine(
  (data) => {
    // At least ONE vital must be recorded
    return data.systolic_bp !== undefined || 
           data.heart_rate !== undefined;
  },
  { message: 'At least one vital sign must be recorded' }
);
```

---

## 4. Error Handling Pattern

The `useFormStandardized` hook handles errors automatically:

```tsx
const form = useFormStandardized(mySchema, {
  onSuccess: async (data) => {
    // Toast shows: "Saved successfully" ✅
    await api.save(data);
  },
  onError: (error) => {
    // Toast shows: error.message ❌
    // Error is logged safely (no PHI in console)
  },
  successMessage: 'Patient record updated', // Custom message
  showErrorToast: true, // Automatic error display
});
```

**No Manual Toast Calls Needed** - the hook handles:
- ✅ Success toasts on submit
- ✅ Error toasts on validation failure
- ✅ Sanitized logging (no PHI leaks)
- ✅ Field-level validation messages

---

## 5. Adding New Form Schemas

### Step 1: Add Schema to `src/lib/schemas/formValidation.ts`

```typescript
export const myNewFormSchema = z.object({
  field_a: z.string().min(1, 'Required'),
  field_b: z.number().min(0),
  field_c: z.enum(['option1', 'option2']),
});

export type MyNewForm = z.infer<typeof myNewFormSchema>;
```

### Step 2: Use in Your Component

```tsx
import { useFormStandardized } from '@/lib/hooks/useFormStandardized';
import { myNewFormSchema } from '@/lib/schemas/formValidation';

export function MyForm() {
  const form = useFormStandardized(myNewFormSchema, {
    onSuccess: handleSave,
  });
  
  // Use with StandardizedFormField...
}
```

---

## 6. Special Cases

### Medical Notes (Prevents XSS)

```tsx
<StandardizedFormField
  control={form.control}
  name="clinical_note"
  label="Clinical Assessment"
  description="Max 5000 characters"
  required
>
  <FormControl>
    <Textarea 
      placeholder="Enter clinical findings..."
      maxLength={5000}
      rows={6}
      {...form.register('clinical_note')}
    />
  </FormControl>
</StandardizedFormField>
```

Medical notes use **medicalNoteSchema** which:
- Allows: letters, numbers, spaces, common punctuation
- Prevents: HTML tags, script injections, special characters
- Max length: 5000 characters

### ICD-10 Lookup Field

```tsx
<StandardizedFormField
  control={form.control}
  name="icd10_code"
  label="Diagnosis Code (ICD-10)"
  description='e.g., "E11.9" for Type 2 Diabetes'
  required
>
  <FormControl>
    <ICD10CodeAutocomplete 
      {...form.register('icd10_code')}
      onSelect={(code) => form.setValue('icd10_code', code)}
    />
  </FormControl>
</StandardizedFormField>
```

### Conditional Fields

```tsx
const appointmentType = form.watch('appointment_type');

{appointmentType === 'procedure' && (
  <StandardizedFormField
    control={form.control}
    name="procedure_details"
    label="Procedure Details"
  >
    {/* Only shown for procedure appointments */}
  </StandardizedFormField>
)}
```

---

## 7. Testing Form Schemas

```typescript
import { prescriptionFormSchema } from '@/lib/schemas/formValidation';

describe('Prescription Form Validation', () => {
  it('accepts valid prescription data', () => {
    const valid = {
      patient_id: 'uuid-here',
      drug_name: 'Metformin',
      dose: 500,
      dose_unit: 'mg',
      frequency: 'BID',
      route: 'oral',
      duration_days: 30,
    };
    expect(() => prescriptionFormSchema.parse(valid)).not.toThrow();
  });

  it('rejects dose > 10000', () => {
    const invalid = { /* ...valid... */, dose: 50000 };
    expect(() => prescriptionFormSchema.parse(invalid)).toThrow(
      /exceeds maximum allowed/
    );
  });

  it('requires at least one vital sign', () => {
    const vitals = {
      patient_id: 'uuid',
      recorded_at: new Date(),
      systolic_bp: undefined,
      heart_rate: undefined,
      // No vitals recorded
    };
    expect(() => vitalSignsFormSchema.parse(vitals)).toThrow(
      /At least one vital sign/
    );
  });
});
```

---

## 8. Migration Checklist

When updating existing forms to use standardized patterns:

- [ ] Create schema in `src/lib/schemas/formValidation.ts`
- [ ] Import `useFormStandardized` hook
- [ ] Replace `useForm` call with `useFormStandardized`
- [ ] Replace repetitive `FormField` patterns with `StandardizedFormField`
- [ ] Remove manual `toast` calls (hook handles it)
- [ ] Add schema to export types
- [ ] Test with edge cases (empty, max values, invalid dates)
- [ ] Verify PHI is not logged in console
- [ ] Check accessibility (labels, error messages, keyboard nav)

---

## 9. Common Patterns Cheat Sheet

| Use Case | Pattern | File |
|----------|---------|------|
| Patient demographics | `patientDemographicsSchema` | `formValidation.ts` |
| Prescription entry | `prescriptionFormSchema` | `formValidation.ts` |
| Vital signs recording | `vitalSignsFormSchema` | `formValidation.ts` |
| Lab order creation | `labOrderFormSchema` | `formValidation.ts` |
| Appointment scheduling | `appointmentFormSchema` | `formValidation.ts` |
| Clinical notes | `clinicalNoteFormSchema` + `medicalNoteSchema` | `formValidation.ts` |
| Email input | `clinicalEmailSchema` | `formValidation.ts` |
| Phone input | `phoneNumberSchema` | `formValidation.ts` |
| Strong password | `strongPasswordSchema` | `formValidation.ts` |
| Medical Record Number | `mrnSchema` | `formValidation.ts` |
| Form initialization | `useFormStandardized` | `useFormStandardized.ts` |
| Field rendering | `StandardizedFormField` | `StandardizedFormField.tsx` |

---

## Types Exported

```typescript
// Use these for type safety
import {
  PatientDemographics,
  Prescription,
  VitalSigns,
  LabOrder,
  Appointment,
  ClinicalNote,
} from '@/lib/schemas/formValidation';

// Type-safe form handlers
async function save(data: PatientDemographics) {
  await api.patients.update(data);
}
```

---

## Performance Best Practices

```tsx
// ✅ Good: Memoized schema
const schema = useMemo(() => patientDemographicsSchema, []);
const form = useFormStandardized(schema);

// ✅ Good: Avoid unnecessary re-renders
const form = useFormStandardized(schema, { /* options */ });
// Options are stable across renders

// ❌ Bad: New schema on every render
const form = useFormStandardized(
  z.object({ /* inline definition */ })
);

// ❌ Bad: Creating new options object every render
const form = useFormStandardized(schema, {
  onSuccess: () => { /* new function */ }
});
```

---

## Security Checklist

- [x] All schemas validate input length (prevents DoS)
- [x] Medical notes sanitized against XSS
- [x] PHI never logged to console
- [x] Passwords validated for strength  
- [x] Emails validated format
- [x] Phone numbers validated format
- [x] Clinical values within realistic ranges
- [x] Cross-field validation for edge cases

---

## Next Steps

1. Audit existing forms in codebase
2. Create standardization PRs for high-traffic forms (Prescriptions, Vitals, Appointments)
3. Add integration tests for all new schemas
4. Update developer onboarding docs
5. Schedule team review session

