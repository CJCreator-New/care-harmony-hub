# Contributing Guide

## Welcome

Thank you for considering contributing to CareSync! This document provides guidelines for contributing to the project.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or bun
- Git
- Code editor (VS Code recommended)

### Local Setup

```bash
# Fork the repository on GitHub

# Clone your fork
git clone https://github.com/YOUR_USERNAME/caresync.git
cd caresync

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## Development Workflow

### Branch Naming

```
feature/add-telemedicine-waiting-room
bugfix/fix-prescription-print
hotfix/security-patch-auth
docs/update-api-reference
refactor/optimize-patient-query
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add video call mute controls
fix: resolve patient search pagination issue
docs: update database schema documentation
style: format prescription component
refactor: extract consultation form logic
test: add unit tests for billing calculations
chore: update dependencies
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with clear commits
3. Update documentation if needed
4. Ensure tests pass
5. Create pull request with description
6. Address review feedback
7. Squash and merge when approved

---

## Code Standards

### TypeScript

```typescript
// ✅ Good - Explicit types
interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
}

function getPatientFullName(patient: Patient): string {
  return `${patient.firstName} ${patient.lastName}`;
}

// ❌ Avoid - Any types
function processData(data: any): any {
  return data.something;
}
```

### React Components

```tsx
// ✅ Good - Functional component with types
interface PatientCardProps {
  patient: Patient;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}

export function PatientCard({ 
  patient, 
  onSelect, 
  isSelected = false 
}: PatientCardProps) {
  return (
    <Card 
      className={cn('cursor-pointer', isSelected && 'ring-2 ring-primary')}
      onClick={() => onSelect?.(patient.id)}
    >
      <CardHeader>
        <CardTitle>{patient.firstName} {patient.lastName}</CardTitle>
      </CardHeader>
    </Card>
  );
}
```

### File Organization

```
components/
├── feature-name/
│   ├── FeatureComponent.tsx      # Main component
│   ├── FeatureSubComponent.tsx   # Sub-components
│   ├── useFeatureLogic.ts        # Custom hook (if complex)
│   └── index.ts                  # Exports
```

### Styling

```tsx
// ✅ Good - Using design system tokens
<div className="bg-card text-card-foreground border border-border">
  <Button variant="primary">Action</Button>
</div>

// ❌ Avoid - Hard-coded colors
<div className="bg-white text-gray-900 border border-gray-200">
  <button className="bg-blue-500">Action</button>
</div>
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- PatientCard

# Run with coverage
npm run test -- --coverage

# Watch mode
npm run test -- --watch
```

### Writing Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { PatientCard } from './PatientCard';

describe('PatientCard', () => {
  const mockPatient = {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-01-15'),
  };

  it('renders patient name', () => {
    render(<PatientCard patient={mockPatient} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<PatientCard patient={mockPatient} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

---

## Documentation

### Code Comments

```typescript
/**
 * Calculates the patient's age from their date of birth.
 * 
 * @param dateOfBirth - The patient's birth date
 * @returns Age in years
 * 
 * @example
 * const age = calculateAge(new Date('1990-01-15'));
 * // Returns 34 (as of 2024)
 */
function calculateAge(dateOfBirth: Date): number {
  // Implementation
}
```

### README Updates

When adding features:
1. Update feature list if applicable
2. Add any new environment variables
3. Document breaking changes

---

## Database Changes

### Migration Guidelines

1. Always use migrations for schema changes
2. Make migrations reversible when possible
3. Test migrations on sample data
4. Document migration in PR

```sql
-- Migration: Add telemedicine fields to appointments
-- Description: Support for video consultation appointments

ALTER TABLE appointments 
ADD COLUMN is_telemedicine BOOLEAN DEFAULT false;

ALTER TABLE appointments 
ADD COLUMN telemedicine_url TEXT;

-- Rollback:
-- ALTER TABLE appointments DROP COLUMN is_telemedicine;
-- ALTER TABLE appointments DROP COLUMN telemedicine_url;
```

### RLS Policies

Always include RLS policies for new tables:

```sql
-- Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view own data"
ON new_table FOR SELECT
USING (user_id = auth.uid());
```

---

## Security Considerations

### Sensitive Data

- Never log sensitive patient data
- Don't expose internal IDs in URLs
- Validate all user inputs
- Use parameterized queries

### Authentication

- Always check user permissions
- Use RLS for data access
- Implement proper session handling

---

## Performance Guidelines

### Database Queries

```typescript
// ✅ Good - Select only needed columns
const { data } = await supabase
  .from('patients')
  .select('id, first_name, last_name, mrn');

// ❌ Avoid - Select all columns unnecessarily
const { data } = await supabase
  .from('patients')
  .select('*');
```

### React Optimization

```tsx
// ✅ Good - Memoize expensive computations
const sortedPatients = useMemo(() => 
  patients.sort((a, b) => a.lastName.localeCompare(b.lastName)),
  [patients]
);

// ✅ Good - Memoize callbacks
const handleSelect = useCallback((id: string) => {
  setSelectedId(id);
}, []);
```

---

## Review Checklist

Before submitting PR:

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] No hardcoded values
- [ ] Proper error handling
- [ ] Accessibility considered
- [ ] Mobile responsive
- [ ] Security reviewed

---

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Create an Issue with reproduction steps
- **Features**: Discuss in Issues before implementing
- **Security**: Email security@caresync.health

---

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow project guidelines

Thank you for contributing! 🎉
