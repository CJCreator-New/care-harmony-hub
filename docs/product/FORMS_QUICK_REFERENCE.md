# CareSync HIMS: Standardized Forms Quick Reference

## One-Minute Setup for New Forms

### Step 1: Import & Initialize

```tsx
import { useFormStandardized } from '@/lib/hooks/useFormStandardized';
import { appointmentFormSchema } from '@/lib/schemas/formValidation';

export function MyForm() {
  const form = useFormStandardized(appointmentFormSchema, {
    onSuccess: async (data) => {
      await api.save(data);
    },
  });
  
  // Done! No manual toast/error handling needed
}
```

### Step 2: Render Fields

```tsx
import StandardizedFormField from '@/components/forms/StandardizedFormField';
import { Input } from '@/components/ui/input';

<Form {...form}>
  <form onSubmit={form.handleSubmit} className="space-y-6">
    <StandardizedFormField
      control={form.control}
      name="patient_id"
      label="Patient"
      required
    >
      <Input placeholder="Search..." {...form.register('patient_id')} />
    </StandardizedFormField>
    
    <Button type="submit" disabled={form.isSubmitting}>
      {form.isSubmitting ? 'Saving...' : 'Save'}
    </Button>
  </form>
</Form>
```

---

## Available Form Schemas

| Schema | Use Case | File |
|--------|----------|------|
| `patientDemographicsSchema` | Patient registration, updates | formValidation.ts |
| `prescriptionFormSchema` | Create/edit prescriptions | formValidation.ts |
| `vitalSignsFormSchema` | Record vital signs | formValidation.ts |
| `labOrderFormSchema` | Create lab orders | formValidation.ts |
| `appointmentFormSchema` | Schedule appointments | formValidation.ts |
| `clinicalNoteFormSchema` | Write clinical notes | formValidation.ts |

---

## Available Field Schemas

| Schema | Range | File |
|--------|-------|------|
| `clinicalEmailSchema` | Email format, max 254 chars | formValidation.ts |
| `phoneNumberSchema` | Flexible phone format | formValidation.ts |
| `strongPasswordSchema` | 8+ chars, uppercase, lowercase, number, special | formValidation.ts |
| `dateOfBirthSchema` | Ages 0-150, past only | formValidation.ts |
| `dosageSchema` | 0.001-10,000 | formValidation.ts |
| `mrnSchema` | 6-20 alphanumeric | formValidation.ts |
| `heartRateSchema` | 20-200 bpm | formValidation.ts |
| `bloodPressureSystolicSchema` | 50-250 mmHg | formValidation.ts |
| `temperatureSchema` | 95-106°F | formValidation.ts |
| `bloodGlucoseSchema` | 40-500 mg/dL | formValidation.ts |

---

## Common Patterns

### Type-Safe Data Handling
```tsx
import { Prescription } from '@/lib/schemas/formValidation';

// Form data is automatically typed
const handleSave = async (data: Prescription) => {
  // TypeScript knows data.patient_id is string, dose is number, etc.
  await api.savePrescription(data);
};
```

### Conditional Fields
```tsx
const appointmentType = form.watch('appointment_type');

{appointmentType === 'procedure' && (
  <StandardizedFormField
    control={form.control}
    name="procedure_code"
    label="Procedure Code"
  >
    <Input {...form.register('procedure_code')} />
  </StandardizedFormField>
)}
```

### Custom Success Message
```tsx
const form = useFormStandardized(mySchema, {
  onSuccess: handleSave,
  successMessage: 'Prescription sent to pharmacy', // Appears in toast
});
```

### Manual Error Handling (if needed)
```tsx
const form = useFormStandardized(mySchema, {
  showErrorToast: false, // Disable auto toast
  onError: (error) => {
    // Handle custom,ly
    if (error.message.includes('duplicate')) {
      // Handle duplicate record
    }
  },
});
```

---

## Validation Rules Built-In

### Clinical Safety
- ✅ Vital signs ranges enforced
- ✅ Dosage limits prevent overdose entry
- ✅ Duration limits for prescriptions
- ✅ Age-appropriate calculations

### PHI Protection
- ✅ No sensitive data in console logs
- ✅ Email/phone validation for safety
- ✅ Encryption metadata support
- ✅ Audit trail logging

### Type Safety
- ✅ TypeScript strict mode
- ✅ Zero `any` types
- ✅ Type inference from Zod schemas
- ✅ Exported types for all forms

---

## When to Add New Field Types

If your field isn't in the list, add it to `src/lib/schemas/formValidation.ts`:

```typescript
// New field schema
export const customFieldSchema = z
  .string()
  .min(1, 'Required')
  .max(100, 'Max 100 chars')
  .regex(/^[A-Z0-9]+$/, 'Uppercase letters and numbers only');

// Use in form schema
export const myFormSchema = z.object({
  custom_field: customFieldSchema,
  // ... other fields
});
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Form not submitting | Check `form.hasErrors` - fix validation errors first |
| Toast not appearing | Verify `showErrorToast: true` (default) in options |
| Type errors | Import type: `import { MyFormData } from '@/lib/schemas/formValidation'` |
| Field not validating | Check schema match - field name must be exact |
| PHI in console | Never use `console.log(data)` - use `sanitizeForLog(data)` |

---

## File Locations

- **Hook**: `src/lib/hooks/useFormStandardized.ts`
- **Schemas**: `src/lib/schemas/formValidation.ts`
- **Component**: `src/components/forms/StandardizedFormField.tsx`
- **Guide**: `docs/product/FORMS_DEVELOPMENT_GUIDE.md`
- **Tests**: `src/test/form-validation.test.ts`

---

## Performance Tips

✅ **Good**:
```tsx
const schema = useMemo(() => prescriptionFormSchema, []);
const form = useFormStandardized(schema);
```

❌ **Avoid**:
```tsx
// New function on every render - causes re-renders
const form = useFormStandardized(schema, {
  onSuccess: () => { /* ... */ }
});
```

---

## Questions?

- See: `docs/product/FORMS_DEVELOPMENT_GUIDE.md` (comprehensive guide)
- Review: `src/components/patients/PatientRegistrationModal.STANDARDIZED.tsx` (full example)
- Run tests: `npm run test:unit -- src/test/form-validation.test.ts`

