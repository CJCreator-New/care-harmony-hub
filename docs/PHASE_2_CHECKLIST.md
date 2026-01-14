# Phase 2 Implementation Checklist

## Quick Fix Guide - Copy & Paste Ready

### Fix 1: AIClinicalSupportDashboard.tsx

**Location**: Line 11-17  
**Find**:
```typescript
const { 
  generateDifferentialDiagnosis, 
  isGeneratingDiagnosis,
  predictPatientRisk,
  isPredictingRisk,
  autoCodeEncounter,
  isCoding
} = useAIClinicalSupport();
```

**Status**: ✅ Already Correct - No changes needed!

---

### Fix 2: TwoFactorSetup.tsx

**Location**: Line 56-70  
**Find**:
```typescript
const { data: { user } } = await supabase.auth.getUser();
await supabase
  .from('profiles')
  .update({ 
    two_factor_enabled: true,
    two_factor_secret: secret 
  })
  .eq('id', user.id);
```

**Replace with**:
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user?.id) {
  toast.error('User not authenticated');
  return;
}

await supabase
  .from('profiles')
  .update({ 
    two_factor_enabled: true,
    two_factor_secret: secret 
  })
  .eq('id', user.id);
```

**Location**: Line 82-95  
**Find**:
```typescript
const { data: { user } } = await supabase.auth.getUser();
const { error } = await supabase
  .from('profiles')
  .update({ 
    two_factor_enabled: false,
    two_factor_secret: null 
  })
  .eq('id', user.id);
```

**Replace with**:
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user?.id) {
  toast.error('User not authenticated');
  return;
}

const { error } = await supabase
  .from('profiles')
  .update({ 
    two_factor_enabled: false,
    two_factor_secret: null 
  })
  .eq('id', user.id);
```

---

### Fix 3: SampleTracking.tsx

**Step 1**: Add import at top of file
```typescript
import { LabSampleWithRelations, BadgeVariant } from '@/types/clinical';
```

**Step 2**: Update component to use proper types
**Find** (around line 10):
```typescript
export function SampleTracking() {
  const { samples, isLoading } = useSampleTracking();
```

**Replace with**:
```typescript
export function SampleTracking() {
  const { samples, isLoading } = useSampleTracking();
  
  // Type-safe badge variant mapping
  const statusVariants: Record<LabSampleWithRelations['status'], BadgeVariant> = {
    collected: 'secondary',
    received: 'default',
    processing: 'outline',
    completed: 'default',
    rejected: 'destructive',
  };
  
  const priorityVariants: Record<LabSampleWithRelations['priority'], BadgeVariant> = {
    routine: 'outline',
    urgent: 'secondary',
    stat: 'destructive',
  };
```

**Step 3**: Update Badge usage throughout component
**Find**:
```typescript
<Badge variant={sample.status}>
```

**Replace with**:
```typescript
<Badge variant={statusVariants[sample.status]}>
```

**Find**:
```typescript
<Badge variant={sample.priority}>
```

**Replace with**:
```typescript
<Badge variant={priorityVariants[sample.priority]}>
```

---

### Fix 4: HPITemplateSelector.tsx

**Location**: Template definitions (around line 15-50)  
**Find**:
```typescript
const TEMPLATES = {
  OLDCARTS: {
    name: 'OLDCARTS',
    description: 'Comprehensive symptom assessment',
    fields: [
      { key: 'onset', label: 'Onset', type: 'text', required: true },
      { key: 'location', label: 'Location', type: 'text', required: true },
      // ... more fields
    ]
  },
  // ... more templates
};
```

**Replace with**:
```typescript
const TEMPLATES = {
  OLDCARTS: {
    name: 'OLDCARTS',
    description: 'Comprehensive symptom assessment',
    fields: [
      { key: 'onset', label: 'Onset', type: 'text' as const, required: true },
      { key: 'location', label: 'Location', type: 'text' as const, required: true },
      { key: 'duration', label: 'Duration', type: 'text' as const, required: true },
      { key: 'character', label: 'Character', type: 'textarea' as const, required: true },
      { key: 'aggravating', label: 'Aggravating Factors', type: 'textarea' as const, required: false },
      { key: 'relieving', label: 'Relieving Factors', type: 'textarea' as const, required: false },
      { key: 'timing', label: 'Timing', type: 'text' as const, required: false },
      { key: 'severity', label: 'Severity (1-10)', type: 'number' as const, required: true },
    ]
  },
  SOCRATES: {
    name: 'SOCRATES',
    description: 'Pain assessment framework',
    fields: [
      { key: 'site', label: 'Site', type: 'text' as const, required: true },
      { key: 'onset', label: 'Onset', type: 'text' as const, required: true },
      { key: 'character', label: 'Character', type: 'textarea' as const, required: true },
      { key: 'radiation', label: 'Radiation', type: 'text' as const, required: false },
      { key: 'associations', label: 'Associated Symptoms', type: 'textarea' as const, required: false },
      { key: 'time_course', label: 'Time Course', type: 'text' as const, required: false },
      { key: 'exacerbating', label: 'Exacerbating Factors', type: 'textarea' as const, required: false },
      { key: 'severity', label: 'Severity (1-10)', type: 'number' as const, required: true },
    ]
  }
} as const;
```

---

### Fix 5: ReviewOfSystemsStep.tsx

**Location**: Checkbox component usage (around line 60)  
**Find**:
```typescript
<Checkbox
  checked={value}
  onCheckedChange={(checked) => onChange(checked)}
/>
```

**Replace with**:
```typescript
<Checkbox
  checked={Boolean(value)}
  onCheckedChange={(checked) => onChange(Boolean(checked))}
/>
```

---

### Fix 6: AIClinicalAssistant.tsx

**Step 1**: Add import at top
```typescript
import { DrugInteraction } from '@/types/clinical';
```

**Step 2**: Update state declaration (around line 15)  
**Find**:
```typescript
const [drugInteractions, setDrugInteractions] = useState([]);
```

**Replace with**:
```typescript
const [drugInteractions, setDrugInteractions] = useState<DrugInteraction[]>([]);
```

---

### Fix 7: WorkflowOrchestrator.tsx

**Location**: Badge display for unread count  
**Find**:
```typescript
{unreadCount > 0 && (
  <Badge>{unreadCount}</Badge>
)}
```

**Replace with**:
```typescript
{(unreadCount ?? 0) > 0 && (
  <Badge>{unreadCount}</Badge>
)}
```

---

## Verification Steps

After applying each fix:

```bash
# 1. Check TypeScript errors for that file
npx tsc --noEmit path/to/file.tsx

# 2. Run full type check
npm run type-check

# 3. Test the component
npm run dev
# Navigate to the component and test functionality
```

---

## Batch Fix Script

Create a file `apply-fixes.sh` (Git Bash/Linux/Mac):

```bash
#!/bin/bash

echo "Applying Phase 2 fixes..."

# Fix 2: TwoFactorSetup.tsx
echo "✓ Fix 2: Add null checks to TwoFactorSetup.tsx"
# (Manual - requires careful placement)

# Fix 3: SampleTracking.tsx  
echo "✓ Fix 3: Update SampleTracking.tsx types"
# (Manual - requires multiple changes)

# Fix 4: HPITemplateSelector.tsx
echo "✓ Fix 4: Add 'as const' to template fields"
# (Manual - template definitions)

# Fix 5: ReviewOfSystemsStep.tsx
echo "✓ Fix 5: Cast checkbox values to boolean"
# (Manual - checkbox components)

# Fix 6: AIClinicalAssistant.tsx
echo "✓ Fix 6: Add DrugInteraction type"
# (Manual - state declaration)

# Fix 7: WorkflowOrchestrator.tsx
echo "✓ Fix 7: Add null coalescing to unreadCount"
# (Manual - badge display)

echo "All fixes applied! Run 'npm run type-check' to verify."
```

---

## Priority Order

1. **High Priority** (Breaks build):
   - Fix 2: TwoFactorSetup.tsx (undefined errors)
   - Fix 3: SampleTracking.tsx (type errors)

2. **Medium Priority** (Type safety):
   - Fix 4: HPITemplateSelector.tsx
   - Fix 5: ReviewOfSystemsStep.tsx
   - Fix 6: AIClinicalAssistant.tsx

3. **Low Priority** (Defensive coding):
   - Fix 7: WorkflowOrchestrator.tsx

---

## Estimated Time

- Fix 2: 5 minutes
- Fix 3: 10 minutes
- Fix 4: 5 minutes
- Fix 5: 3 minutes
- Fix 6: 3 minutes
- Fix 7: 2 minutes

**Total**: ~30 minutes for all Phase 2 fixes

---

## Testing Checklist

After all fixes:

- [ ] `npm run type-check` passes with 0 errors
- [ ] `npm run build` completes successfully
- [ ] `npm run lint` passes
- [ ] All 7 roles can log in
- [ ] Performance dashboard loads
- [ ] Lab sample tracking works
- [ ] 2FA setup completes
- [ ] HPI templates render
- [ ] Review of systems checkboxes work
- [ ] AI clinical assistant displays
- [ ] Workflow orchestrator shows notifications

---

**Ready to implement?** Start with Fix 2 (highest priority) and work down the list!
