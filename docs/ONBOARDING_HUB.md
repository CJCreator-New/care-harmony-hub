# CareSync Documentation Hub & Onboarding Guide

## Document Information
| Field | Value |
|-------|-------|
| Project Name | CareSync - Hospital Management System |
| Version | 1.0 |
| Last Updated | January 2026 |
| Audience | New Team Members, Stakeholders |

---

## 👋 Welcome to CareSync!

Welcome to the CareSync team! This document serves as your central hub for all project documentation and your guide to getting started.

---

## 1. Quick Start Guide

### 1.1 Day 1 Checklist

```
First Day Essentials:
☐ Read this onboarding document
☐ Set up development environment (see Section 3)
☐ Join Slack channels (see Section 2)
☐ Schedule 1:1 with your manager
☐ Review project charter and roadmap
☐ Complete security training
```

### 1.2 First Week Goals

| Day | Focus | Key Activities |
|-----|-------|----------------|
| 1 | Orientation | Environment setup, team intros |
| 2 | Architecture | Review system architecture, codebase |
| 3 | Product | Explore the product, understand features |
| 4 | Processes | Learn development workflow, tools |
| 5 | Contribution | First small task or bug fix |

### 1.3 First Month Milestones

- [ ] Complete all required training
- [ ] Understand the full product workflow
- [ ] Ship first feature/fix to production
- [ ] Participate in at least 2 sprint ceremonies
- [ ] Present a learning share to the team

---

## 2. Team & Communication

### 2.1 Team Structure

```
CareSync Team
├── Leadership
│   ├── Product Owner - Product vision & priorities
│   ├── Technical Lead - Architecture & technical decisions
│   └── Project Manager - Delivery & coordination
│
├── Development
│   ├── Frontend Developers (2) - React/TypeScript
│   ├── Backend Developer (1) - Supabase/PostgreSQL
│   └── Full-Stack Developer (1) - End-to-end features
│
├── Quality & Design
│   ├── QA Lead - Testing & quality
│   └── UI/UX Designer (Part-time) - Design system
│
└── Operations
    ├── DevOps Engineer (Part-time) - Infrastructure
    └── Technical Writer (Part-time) - Documentation
```

### 2.2 Key Contacts

| Role | Name | Email | Slack |
|------|------|-------|-------|
| Product Owner | [TBD] | po@company.com | @productowner |
| Technical Lead | [TBD] | tech@company.com | @techlead |
| Project Manager | [TBD] | pm@company.com | @pm |
| Your Manager | [TBD] | [TBD] | [TBD] |

### 2.3 Communication Channels

| Channel | Purpose | Join? |
|---------|---------|-------|
| #caresync-general | Team announcements | ✅ Required |
| #caresync-dev | Development discussions | ✅ Required |
| #caresync-design | Design reviews | Optional |
| #caresync-bugs | Bug reports | ✅ Required |
| #caresync-releases | Deployment updates | ✅ Required |
| #caresync-random | Social/fun | Optional |

---

## 3. Development Environment Setup

### 3.1 Prerequisites

```bash
# Required software
- Node.js 18+ (recommended: use nvm)
- Git
- VS Code (recommended) or your preferred editor
- Chrome/Firefox with React DevTools
```

### 3.2 Repository Setup

```bash
# 1. Clone the repository
git clone https://github.com/[organization]/caresync.git
cd caresync

# 2. Install dependencies
npm install

# 3. Set up environment variables
# (Environment variables are auto-configured by Lovable Cloud)

# 4. Start development server
npm run dev

# 5. Open in browser
# http://localhost:5173
```

### 3.3 Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "prisma.prisma"
  ]
}
```

### 3.4 Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run test:e2e` | Run E2E tests |

---

## 4. Documentation Index

### 4.1 Project Initiation Documents

| Document | Description | Audience |
|----------|-------------|----------|
| [Project Charter](./PROJECT_CHARTER.md) | Project purpose, objectives, stakeholders | All |
| [Business Case](./BUSINESS_CASE.md) | Problem statement, justification | Leadership |
| [Requirements](./REQUIREMENTS.md) | Functional & non-functional requirements | All |
| [Scope Statement](./SCOPE_STATEMENT.md) | In-scope and out-of-scope | All |
| [Project Roadmap](./PROJECT_ROADMAP.md) | Timeline, milestones | All |

### 4.2 Technical Documents

| Document | Description | Audience |
|----------|-------------|----------|
| [Architecture](./ARCHITECTURE.md) | System design, components | Developers |
| [Database](./DATABASE.md) | Schema, ERD, tables | Developers |
| [API Reference](./API.md) | API documentation | Developers |
| [Security](./SECURITY.md) | Security architecture, compliance | All |
| [Deployment](./DEPLOYMENT.md) | Deployment guide | DevOps |

### 4.3 Process Documents

| Document | Description | Audience |
|----------|-------------|----------|
| [RACI Matrix](./RACI_MATRIX.md) | Roles & responsibilities | All |
| [Communication Plan](./COMMUNICATION_PLAN.md) | Reporting, meetings | All |
| [Risk Register](./RISK_REGISTER.md) | Risks, mitigations | Leadership |
| [QA Plan](./QUALITY_ASSURANCE_PLAN.md) | Testing strategy | QA, Developers |
| [Contributing](./CONTRIBUTING.md) | How to contribute | Developers |
| [Changelog](./CHANGELOG.md) | Version history | All |

### 4.4 Operational Documents

| Document | Description | Audience |
|----------|-------------|----------|
| [Budget & Resources](./BUDGET_RESOURCES.md) | Costs, allocations | Leadership |
| [Features](./FEATURES.md) | Feature documentation | All |

---

## 5. Architecture Overview

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CareSync                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                       Frontend (React)                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │   Pages     │  │ Components  │  │   Hooks     │               │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                  │                                       │
│                                  ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Lovable Cloud (Supabase)                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │  Database   │  │    Auth     │  │   Storage   │               │   │
│  │  │ PostgreSQL  │  │   Supabase  │  │   Buckets   │               │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  │  ┌─────────────┐  ┌─────────────┐                                │   │
│  │  │    Edge     │  │  Realtime   │                                │   │
│  │  │  Functions  │  │ Subscriptions│                               │   │
│  │  └─────────────┘  └─────────────┘                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + TypeScript | UI framework |
| Styling | Tailwind CSS + shadcn/ui | Design system |
| State | TanStack Query | Server state |
| Routing | React Router v6 | Navigation |
| Backend | Supabase (Lovable Cloud) | BaaS |
| Database | PostgreSQL | Data storage |
| Auth | Supabase Auth | Authentication |
| Functions | Deno (Edge Functions) | Serverless logic |

### 5.3 Folder Structure

```
caresync/
├── docs/                    # Project documentation
├── public/                  # Static assets
├── src/
│   ├── components/          # React components
│   │   ├── ui/              # Base UI components (shadcn)
│   │   ├── dashboard/       # Dashboard components
│   │   ├── landing/         # Landing page components
│   │   └── [module]/        # Feature-specific components
│   ├── contexts/            # React contexts
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # External integrations
│   │   └── supabase/        # Supabase client & types
│   ├── lib/                 # Utility libraries
│   ├── pages/               # Page components
│   │   ├── hospital/        # Hospital auth pages
│   │   ├── patient/         # Patient portal pages
│   │   └── [module]/        # Feature pages
│   ├── types/               # TypeScript types
│   └── utils/               # Utility functions
├── supabase/
│   ├── functions/           # Edge functions
│   └── migrations/          # Database migrations
└── [config files]
```

---

## 6. Development Workflow

### 6.1 Git Workflow

```
main (production)
  │
  ├── develop (integration)
  │     │
  │     ├── feature/CARE-123-new-feature
  │     ├── bugfix/CARE-456-fix-issue
  │     └── hotfix/CARE-789-critical-fix
  │
  └── release/v1.2.0
```

### 6.2 Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/CARE-[ID]-description` | `feature/CARE-123-patient-search` |
| Bugfix | `bugfix/CARE-[ID]-description` | `bugfix/CARE-456-login-error` |
| Hotfix | `hotfix/CARE-[ID]-description` | `hotfix/CARE-789-security-fix` |

### 6.3 Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

Example:
feat(appointments): add recurring appointment support

- Added weekly/monthly recurrence options
- Updated appointment form with recurrence fields
- Added migration for recurrence columns

Closes CARE-123
```

### 6.4 Pull Request Process

1. **Create branch** from `develop`
2. **Make changes** with clear commits
3. **Push** and create Pull Request
4. **Fill template** with description, testing notes
5. **Request review** from relevant team members
6. **Address feedback** and update
7. **Merge** when approved and CI passes

---

## 7. Coding Standards

### 7.1 TypeScript Guidelines

```typescript
// ✅ Do: Use explicit types
interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

// ✅ Do: Use functional components
const PatientCard: React.FC<{ patient: Patient }> = ({ patient }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{patient.firstName} {patient.lastName}</CardTitle>
      </CardHeader>
    </Card>
  );
};

// ❌ Don't: Use `any` type
const handleData = (data: any) => { /* ... */ }

// ❌ Don't: Use class components (unless necessary)
class PatientCard extends React.Component { /* ... */ }
```

### 7.2 Component Guidelines

```typescript
// ✅ Good component structure
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PatientListProps {
  hospitalId: string;
  onSelectPatient: (id: string) => void;
}

export const PatientList: React.FC<PatientListProps> = ({
  hospitalId,
  onSelectPatient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom hooks for data fetching
  const { data: patients, isLoading } = usePatients(hospitalId);

  // Early returns for loading/error states
  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Component content */}
    </div>
  );
};
```

### 7.3 Styling Guidelines

```tsx
// ✅ Do: Use Tailwind utility classes
<div className="flex items-center gap-4 p-4 bg-background rounded-lg">

// ✅ Do: Use semantic color tokens
<p className="text-foreground">Primary text</p>
<p className="text-muted-foreground">Secondary text</p>
<Button className="bg-primary text-primary-foreground">Action</Button>

// ❌ Don't: Use arbitrary color values
<div className="bg-[#3b82f6]">
<p className="text-gray-500">
```

---

## 8. Key Processes

### 8.1 Sprint Cycle (2 Weeks)

```
Week 1:
├── Monday: Sprint Planning (2 hours)
├── Tue-Fri: Development
│   └── Daily Standups (15 min)
└── Friday: Mid-sprint check-in

Week 2:
├── Mon-Wed: Development continues
├── Thursday: Feature freeze, testing
├── Friday:
    ├── Sprint Review (1 hour)
    ├── Retrospective (1 hour)
    └── Deployment
```

### 8.2 Definition of Done

A story is "Done" when:
- [ ] Code complete and committed
- [ ] Code reviewed and approved
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration/E2E tests passing
- [ ] No critical/high bugs
- [ ] Documentation updated
- [ ] Product Owner acceptance

### 8.3 Support Rotation

We have a support rotation for handling production issues:

| Week | Primary | Backup |
|------|---------|--------|
| 1 | Developer A | Developer B |
| 2 | Developer B | Developer C |
| 3 | Developer C | Developer A |

---

## 9. Product Knowledge

### 9.1 User Roles

| Role | Description | Key Features |
|------|-------------|--------------|
| Admin | Hospital administrator | User management, settings, reports |
| Doctor | Physician | Consultations, prescriptions, lab orders |
| Nurse | Nursing staff | Vitals, patient prep, medications |
| Receptionist | Front desk | Scheduling, check-in, billing |
| Pharmacist | Pharmacy staff | Dispensing, inventory |
| Lab Technician | Laboratory staff | Sample processing, results |
| Patient | Healthcare recipient | Portal, appointments, records |

### 9.2 Core Workflows

**Patient Journey:**
```
Registration → Appointment → Check-in → Queue → Consultation → 
Prescription → Lab Tests → Pharmacy → Billing → Follow-up
```

**Clinical Workflow:**
```
Chief Complaint → Physical Exam → Diagnosis → Treatment Plan → 
Prescriptions → Lab Orders → Summary & Handoff
```

### 9.3 Demo Credentials

For testing in development:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.hospital.com | Demo123! |
| Doctor | doctor@demo.hospital.com | Demo123! |
| Nurse | nurse@demo.hospital.com | Demo123! |
| Receptionist | reception@demo.hospital.com | Demo123! |

⚠️ **Note**: Never use demo credentials in production environments!

---

## 10. Learning Resources

### 10.1 Required Reading

- [ ] [Project Charter](./PROJECT_CHARTER.md)
- [ ] [Architecture Overview](./ARCHITECTURE.md)
- [ ] [Security Guidelines](./SECURITY.md)
- [ ] [Contributing Guide](./CONTRIBUTING.md)

### 10.2 Technology Deep Dives

| Topic | Resource |
|-------|----------|
| React | [React Documentation](https://react.dev/) |
| TypeScript | [TypeScript Handbook](https://www.typescriptlang.org/docs/) |
| Tailwind CSS | [Tailwind Documentation](https://tailwindcss.com/docs) |
| Supabase | [Supabase Documentation](https://supabase.com/docs) |
| TanStack Query | [Query Documentation](https://tanstack.com/query/latest) |

### 10.3 Healthcare Domain

- [ ] HIPAA basics training
- [ ] Healthcare workflow fundamentals
- [ ] Medical terminology essentials

---

## 11. FAQ

### Q: How do I get access to the codebase?
A: Request GitHub access from the Technical Lead. You'll receive an invitation to the organization.

### Q: Where do I report bugs?
A: Post in #caresync-bugs Slack channel or create an issue in Linear/Jira.

### Q: How do I deploy changes?
A: Merge to `develop` for staging, merge to `main` for production. CI/CD handles the rest.

### Q: Who approves my PRs?
A: Any senior developer or the Technical Lead. At least one approval required.

### Q: How do I access the database?
A: Use the Lovable Cloud interface or Supabase client in code. Direct database access is restricted.

### Q: Where's the design system?
A: We use shadcn/ui components. See `src/components/ui/` and Tailwind config.

### Q: How do I add a new feature?
A: Discuss with Product Owner → Create ticket → Follow development workflow → PR → Review → Merge

---

## 12. Getting Help

### When You're Stuck

1. **Check documentation** (this hub and linked docs)
2. **Search Slack** for similar questions
3. **Ask in #caresync-dev** with context
4. **Pair with a teammate** for complex issues
5. **Escalate to Tech Lead** if blocked

### Useful Slack Commands

```
/who [role] - Find team members by role
/pr [repo] - Check PR status
/deploy [env] - Check deployment status
```

### Office Hours

| Day | Time | Topic |
|-----|------|-------|
| Tuesday | 3 PM | Technical Q&A |
| Thursday | 3 PM | Product Q&A |

---

## 13. Feedback

We continuously improve our onboarding. Please share feedback:

- [ ] What was confusing?
- [ ] What was missing?
- [ ] What was helpful?

Submit feedback to: pm@company.com or #caresync-general

---

**Welcome aboard! We're excited to have you on the team! 🎉**

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | [Author] | Initial onboarding hub |
