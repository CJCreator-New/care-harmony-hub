# CareSync HIMS — Implementation Guide

This guide walks developers through implementing common patterns in the CareSync codebase.

## Project Structure

```
src/
  hooks/          # TanStack Query data-access hooks
  components/     # React UI components
  pages/          # Route-level page components
  contexts/       # React context providers (AuthContext)
  utils/          # Shared utilities (sanitize, encryption, etc.)
  types/          # TypeScript type definitions
supabase/
  migrations/     # Database migration files
  functions/      # Edge function source code
```

## Adding a New Feature Hook

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useMyFeature() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['my-feature', hospital?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('my_table')
        .select('*')
        .eq('hospital_id', hospital!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!hospital?.id,
  });
}
```

## Adding a Mutation

```typescript
export function useCreateMyRecord() {
  const queryClient = useQueryClient();
  const { hospital, profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: MyPayload) => {
      const { data, error } = await supabase
        .from('my_table')
        .insert({ ...payload, hospital_id: hospital!.id, created_by: profile!.user_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-feature', hospital?.id] });
      toast.success('Record created');
    },
    onError: (err: any) => {
      toast.error(err.message ?? 'Failed to create record');
    },
  });
}
```

## Role-Protected Routes

```tsx
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute';

<RoleProtectedRoute allowedRoles={['doctor', 'admin']}>
  <MyPage />
</RoleProtectedRoute>
```

## HIPAA-Compliant PHI Encryption

```typescript
import { useHIPAACompliance } from '@/hooks/useHIPAACompliance';

const { encryptField, decryptField } = useHIPAACompliance();

// Encrypt before persisting
const encryptedSsn = await encryptField(rawSsn);
```

## Adding a Supabase Migration

1. Create a file in `supabase/migrations/` with a timestamp prefix:
   ```
   supabase/migrations/20261001000000_add_my_table.sql
   ```
2. Write your SQL (CREATE TABLE, ALTER TABLE, RLS policies).
3. Run `supabase db push` to apply.
4. Regenerate types: `supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts`

## Testing

```bash
npm run test:unit          # Vitest unit tests
npm run test:integration   # Vitest integration tests
npm run test:e2e           # Playwright end-to-end tests
npm run test:security      # Security-focused tests
```
