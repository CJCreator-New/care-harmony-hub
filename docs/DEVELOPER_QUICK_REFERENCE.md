# CareSync - Developer Quick Reference

---

## 1. Common Patterns

### 1.1 Creating a New Role Dashboard

**Step 1**: Create component file
```typescript
// src/components/[role]/[RoleName]Dashboard.tsx
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export const [RoleName]Dashboard = () => {
  const { user } = useAuth();
  const supabase = useSupabaseClient();

  const { data } = useQuery({
    queryKey: ['[role]-data', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('[table]')
        .select('*')
        .eq('user_id', user?.id);
      return data;
    }
  });

  return <div>{/* Dashboard content */}</div>;
};
```

**Step 2**: Add route
```typescript
// src/pages/Dashboard.tsx
const [RoleName]Dashboard = lazy(() => 
  import('@/components/[role]/[RoleName]Dashboard')
);

// In Dashboard component
const dashboards = {
  [role]: [RoleName]Dashboard,
  // ...
};
```

**Step 3**: Add permissions
```typescript
// src/utils/rbac.ts
const rolePermissions = {
  [role]: ['permission1', 'permission2'],
  // ...
};
```

### 1.2 Creating a Form Component

```typescript
// src/components/[feature]/[FormName].tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const formSchema = z.object({
  field1: z.string().min(1),
  field2: z.string().email(),
  // Add more fields
});

type FormData = z.infer<typeof formSchema>;

export const [FormName] = ({ onSuccess }: { onSuccess?: () => void }) => {
  const supabase = useSupabaseClient();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema)
  });

  const onSubmit = async (data: FormData) => {
    try {
      const { error } = await supabase
        .from('[table]')
        .insert(data);

      if (error) throw error;

      toast.success('Success!');
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error('Error occurred');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="field1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Field 1</FormLabel>
              <FormControl>
                <input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};
```

### 1.3 Creating a Real-time Subscription

```typescript
// src/hooks/useRealtimeData.ts
import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export const useRealtimeData = (table: string, filter?: string) => {
  const supabase = useSupabaseClient();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    const fetchData = async () => {
      let query = supabase.from(table).select('*');
      if (filter) query = query.filter(filter);
      const { data } = await query;
      setData(data || []);
      setLoading(false);
    };

    fetchData();

    // Subscribe to changes
    const subscription = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setData(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setData(prev =>
              prev.map(item => item.id === payload.new.id ? payload.new : item)
            );
          } else if (payload.eventType === 'DELETE') {
            setData(prev => prev.filter(item => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [table, filter]);

  return { data, loading };
};
```

### 1.4 Creating a Query Hook

```typescript
// src/hooks/use[DataName].ts
import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export const use[DataName] = (id?: string) => {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: ['[data-name]', id],
    queryFn: async () => {
      let query = supabase.from('[table]').select('*');
      if (id) query = query.eq('id', id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!id, // Only run if id exists
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

---

## 2. Troubleshooting Guide

### 2.1 Common Issues

**Issue**: Real-time subscription not updating
```typescript
// Solution: Check filter syntax
const subscription = supabase
  .channel('table-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'table_name',
      filter: 'status=eq.pending' // Correct syntax
    },
    (payload) => { /* ... */ }
  )
  .subscribe();
```

**Issue**: Form not submitting
```typescript
// Solution: Check form validation
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  mode: 'onBlur' // Validate on blur
});

// Debug: Log form errors
console.log(form.formState.errors);
```

**Issue**: Query not refetching
```typescript
// Solution: Ensure queryKey changes
const { data, refetch } = useQuery({
  queryKey: ['data', id], // Include dependencies
  queryFn: () => fetchData(id),
  enabled: !!id
});

// Manual refetch
refetch();
```

**Issue**: Authentication state not persisting
```typescript
// Solution: Check session storage
const { data: session } = await supabase.auth.getSession();
if (!session) {
  // Redirect to login
}
```

### 2.2 Performance Issues

**Slow dashboard load**:
```typescript
// Solution: Implement lazy loading
const Dashboard = lazy(() => import('@/components/Dashboard'));

// Use Suspense
<Suspense fallback={<LoadingSkeleton />}>
  <Dashboard />
</Suspense>
```

**Large bundle size**:
```bash
# Analyze bundle
npm run analyze

# Check for unused dependencies
npm ls --depth=0
```

**Slow API responses**:
```typescript
// Solution: Add caching
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  cacheTime: 30 * 60 * 1000 // Keep in memory for 30 minutes
});
```

---

## 3. Testing Patterns

### 3.1 Unit Test Template

```typescript
// src/test/components/[Component].test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { [Component] } from '@/components/[Component]';

describe('[Component]', () => {
  beforeEach(() => {
    // Setup
  });

  it('should render correctly', () => {
    render(<[Component] />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<[Component] />);
    
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Result')).toBeInTheDocument();
  });

  it('should call callback on submit', async () => {
    const onSubmit = vi.fn();
    render(<[Component] onSubmit={onSubmit} />);
    
    await userEvent.click(screen.getByRole('button'));
    expect(onSubmit).toHaveBeenCalled();
  });
});
```

### 3.2 E2E Test Template

```typescript
// tests/e2e/[feature].spec.ts
import { test, expect } from '@playwright/test';

test.describe('[Feature]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete workflow', async ({ page }) => {
    // Step 1
    await page.click('text=Action');
    
    // Step 2
    await page.fill('input[name="field"]', 'value');
    
    // Step 3
    await page.click('button[type="submit"]');
    
    // Verify
    await expect(page).toHaveURL(/\/success/);
  });
});
```

---

## 4. Database Patterns

### 4.1 Creating a Migration

```sql
-- supabase/migrations/[timestamp]_create_[table].sql
CREATE TABLE [table] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_[table]_user_id ON [table](user_id);
CREATE INDEX idx_[table]_status ON [table](status);

-- Enable RLS
ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "[table]_select_own" ON [table]
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "[table]_insert_own" ON [table]
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "[table]_update_own" ON [table]
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "[table]_delete_own" ON [table]
  FOR DELETE USING (auth.uid() = user_id);
```

### 4.2 Row Level Security (RLS)

```sql
-- Allow users to see only their own data
CREATE POLICY "users_see_own_data" ON patients
  FOR SELECT USING (auth.uid() = user_id);

-- Allow doctors to see their patients
CREATE POLICY "doctors_see_patients" ON consultations
  FOR SELECT USING (
    auth.uid() = doctor_id OR
    auth.uid() IN (
      SELECT user_id FROM patients WHERE id = patient_id
    )
  );

-- Allow admins to see everything
CREATE POLICY "admins_see_all" ON [table]
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## 5. Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code review approved
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Security audit passed
- [ ] Database migrations tested
- [ ] Backup created

### Deployment
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Verify all features
- [ ] Deploy to production
- [ ] Monitor error rates
- [ ] Check performance metrics

### Post-Deployment
- [ ] Verify all workflows
- [ ] Check user feedback
- [ ] Monitor system health
- [ ] Review logs
- [ ] Document changes

---

## 6. Git Workflow

### Branch Naming
```
feature/[feature-name]
bugfix/[bug-name]
hotfix/[issue-name]
docs/[doc-name]
```

### Commit Messages
```
feat: Add new feature
fix: Fix bug
docs: Update documentation
test: Add tests
refactor: Refactor code
perf: Improve performance
```

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Feature
- [ ] Bug fix
- [ ] Documentation

## Testing
- [ ] Unit tests added
- [ ] E2E tests added
- [ ] Manual testing done

## Checklist
- [ ] Code follows style guide
- [ ] No console errors
- [ ] Tests passing
- [ ] Documentation updated
```

---

## 7. Environment Variables

```bash
# .env.local
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_API_URL=http://localhost:3000
VITE_APP_ENV=development
```

---

## 8. Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run lint            # Run linter
npm run type-check      # Check types

# Testing
npm run test            # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report

# Building
npm run build           # Production build
npm run preview         # Preview build
npm run analyze         # Bundle analysis

# Database
npm run db:push         # Push schema
npm run db:pull         # Pull schema
npm run db:reset        # Reset database

# Deployment
npm run deploy:staging  # Deploy to staging
npm run deploy:prod     # Deploy to production
npm run rollback        # Rollback deployment
```

---

## 9. Resources

- **Documentation**: https://docs.caresync.health
- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **TypeScript Docs**: https://www.typescriptlang.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Shadcn/UI**: https://ui.shadcn.com

---

## 10. Support

- **Issues**: Create GitHub issue
- **Discussions**: GitHub discussions
- **Slack**: #development channel
- **Email**: dev-support@caresync.health

