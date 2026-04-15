# CareSync HIMS - Documentation Index & Navigation Guide

**Last Updated**: April 10, 2026 ✅ Documentation Suite Complete  
**For**: Software engineers, AI agents, product managers, QA engineers

---

## 📚 Quick Navigation

### 🎯 For Different Roles

| Your Role | Start Here |
|-----------|-----------|
| **New Developer** | → [Onboarding Checklist](#-onboarding-for-new-developers) |
| **AI Agent** | → [Agent Context Map](#-agent-context-map) |
| **Feature Developer** | → [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) + [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) |
| **QA Engineer** | → [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md) + E2E Testing Guide |
| **DevOps / Infra** | → Deployment & Operations Guide (Coming) |
| **Product Manager** | → [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md) + [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md) |
| **Security Review** | → [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md) + Security Checklist (Coming) |

---

## 📖 Complete Documentation Library

### Core Architecture & Design

#### 1. [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) — **15 KB**
**What**: Complete technical overview of CareSync HIMS system  
**When to read**: Starting a feature, understanding system design, onboarding  
**Key sections**:
- Technology stack (React 18, Supabase, TanStack Query)
- Component architecture (45+ folders, 150+ hooks)
- Data access patterns (hospital-scoped multi-tenancy)
- Authentication & authorization model
- All 20+ production features overview
- Deployment architecture
- Security & HIPAA compliance

**Example questions answered**:
- "What's the tech stack?"
- "How is multi-tenancy enforced?"
- "What's the component structure?"

---

#### 2. [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md) — **12 KB**
**What**: Complete specification of all 20+ production features  
**When to read**: Building new features, understanding workflows, acceptance criteria  
**Key sections**:
- All 20+ features with descriptions
- 4 detailed clinical workflows:
  - Appointment flow (check-in → vitals → consultation → discharge)
  - Prescription flow (create → validate → sign → dispense)
  - Lab order flow (order → collection → processing → result → approval)
  - Billing flow (encounter closure → charges → claims → payment)
- AI-powered features (diagnosis suggestions, drug interactions, predictive analytics)
- 10 universal acceptance criteria for all features

**Example questions answered**:
- "How does the appointment workflow work?"
- "What's the prescription approval process?"
- "What are lab critical value alerts?"

---

#### 3. [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md) — **10 KB**
**What**: Complete role-based access control and permission matrix  
**When to read**: Building permission-protected features, understanding authorization, security review  
**Key sections**:
- 7 roles with responsibilities and scoping rules (Admin, Doctor, Nurse, Pharmacist, Lab Tech, Receptionist, Patient)
- 40+ permission matrix (patients, appointments, consultations, vitals, prescriptions, pharmacy, lab, billing, etc.)
- 3-layer permission enforcement model (Frontend → API → Database RLS)
- RLS policy examples
- Data scoping rules (hospital isolation, role-specific filters)
- Permission checking code patterns

**Example questions answered**:
- "What can a Pharmacist do?"
- "How to check if user has permission to delete lab result?"
- "Where are permissions enforced?"

---

#### 4. [DATA_MODEL.md](./DATA_MODEL.md) — **12 KB**
**What**: Complete database schema and entity relationships  
**When to read**: Working with database, writing migrations, understanding data storage, building queries  
**Key sections**:
- 11 core entities with full SQL schemas:
  - hospitals, users, patients, appointments, consultations
  - vital_signs, prescriptions, lab_orders, lab_results
  - billing_encounters, billing_line_items, activity_logs
- Relationships and FK cardinalities
- Encryption strategy for PHI (AES-256-GCM)
- Query patterns (safe multi-tenant queries)
- Performance indexes
- Migration patterns

**Example questions answered**:
- "What's the patient table schema?"
- "How are prescriptions linked to appointments?"
- "Which fields are encrypted?"

---

#### 5. [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) — **14 KB**
**What**: Code organization, patterns, best practices, and standards  
**When to read**: Writing code, code review, following conventions, debugging patterns  
**Key sections**:
- Frontend directory structure
- Naming conventions (components, hooks, types, variables)
- TypeScript best practices and strict mode
- React component patterns (functional components, custom hooks, error boundaries)
- Data access patterns (query keys, mutations, caching)
- Error handling (logging, toast notifications, permission denials)
- Security best practices (input validation, PHI protection, encryption)
- Performance guidelines (lazy loading, caching, memoization)
- Testing standards (unit tests, E2E test patterns)
- Commit & PR guidelines

**Example questions answered**:
- "How should I name this component?"
- "What's the query key pattern?"
- "How do I handle errors?"

---

#### 6. [API_REFERENCE.md](./API_REFERENCE.md) — **18 KB**
**What**: Complete REST API documentation with endpoints, parameters, responses, errors  
**When to read**: Building integrations, testing APIs, implementing backend features  
**Key sections**:
- Authentication & JWT token management
- Base configuration (hosts, headers, pagination)
- Core endpoints (patients, appointments, consultations, prescriptions, lab orders)
- Error handling with error codes and examples
- Common patterns (multi-tenancy, permissions, timestamps)
- Rate limiting & performance best practices
- SDK examples (JavaScript/TypeScript, React hooks)

**Example questions answered**:
- "How do I fetch a patient's lab results?"
- "What's the rate limit per endpoint?"
- "How do I create a prescription via API?"

---

#### 7. [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) — **20 KB**
**What**: Comprehensive testing pyramid, frameworks, patterns, and CI/CD integration  
**When to read**: Writing tests, creating test fixtures, debugging test failures, setting up CI  
**Key sections**:
- Testing pyramid (70% unit, 20% integration, 10% E2E)
- Unit tests with Vitest (mocking patterns, edge cases)
- Integration tests (real database, cross-component)
- E2E tests with Playwright (role-based workflows, critical paths)
- Test infrastructure (database setup, user fixtures, patient data)
- Running tests (command reference, configuration files)
- Coverage standards and gates (75% minimum)
- CI/CD pipeline (GitHub Actions workflow, multi-role testing)
- Test writing best practices (naming, Arrange-Act-Assert, flaky test detection)

**Example questions answered**:
- "How do I write a unit test for a custom hook?"
- "What's the E2E test for prescription approval workflow?"
- "How do I run tests in watch mode?"

---

#### 8. [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) — **22 KB**
**What**: Pre-deployment security checklist, code review security checks, data protection, compliance  
**When to read**: Before release, code reviews, incident response, compliance audits  
**Key sections**:
- Pre-deployment security checklist (secrets, code scanning, OWASP, database, encryption)
- Code review security checks (input validation, SQL injection, authentication, RBAC)
- Data protection (PHI handling, encryption, audit trail, backup security)
- Authentication & authorization (passwords, 2FA, API keys, RBAC enforcement)
- API security (endpoints, rate limiting, CORS, HTTP headers)
- Infrastructure security (TLS, firewall, DDoS, monitoring)
- Incident response procedures (detection, investigation, remediation)
- Vulnerability reference guide (SQL injection, XSS, CSRF, weak crypto)
- Compliance frameworks (HIPAA, GDPR, HITECH, NIST)

**Example questions answered**:
- "What are the OWASP Top 10 checks for this PR?"
- "How do we handle a data breach?"
- "Is our HIPAA compliance verified before release?"

---

### Workflow Documentation

#### 9. [WORKFLOW_OVERVIEW.md](../workflows/WORKFLOW_OVERVIEW.md) — **8 KB**
**What**: High-level cross-role workflows and journey maps  
**When to read**: Understanding end-to-end processes, building multi-role features  
**Key sections**:
- Index to 7 role-specific workflow documents
- 3 detailed cross-role journey maps:
  - Patient Appointment to Doctor Consultation
  - Lab Order to Result to Notification
  - Prescription Order to Patient Pickup
- High-priority workflows with escalation paths
- Service Level Agreements (SLAs) for each step
- Troubleshooting guide for workflow issues

**Example questions answered**:
- "What steps happen after a patient books appointment?"
- "How does a critical lab value get communicated?"
- "What's the SLA for prescription approval?"

---

#### 10. [doctor.md](./doctor.md) — **16 KB**
**What**: Complete doctor workflow guide with patient consultation process  
**When to read**: Understanding doctor features, building doctor-related functionality  
**Key sections**:
- Doctor dashboard and daily workflow
- Patient consultation step-by-step (HPI, assessment, plan)
- Prescription management and approval workflows
- Vital signs review and critical value alerts
- Lab order management and result approval
- Referral making and consultation handling
- Keyboard shortcuts and speed features
- Common tasks (flu-like symptoms, prescription approval)

**Example questions answered**:
- "What's the step-by-step consultation workflow?"
- "How do I handle critical lab values?"
- "How long should each step take?"

---

#### 11. [patient.md](./patient.md) — **15 KB**
**What**: Complete patient portal guide with self-service capabilities  
**When to read**: Building patient features, understanding patient workflows  
**Key sections**:
- Patient account creation and login
- Dashboard overview and widgets
- Appointment booking, rescheduling, cancellation
- Pre-visit preparation and forms
- Viewing medical records and lab results
- Medication management and refills
- Billing and payment
- Telemedicine video visit setup
- Accessibility features and support

**Example questions answered**:
- "How does a patient book an appointment?"
- "How do I view my lab results?"
- "Can I start a telemedicine visit?"

---

### Role-Specific Workflows

**Individual workflow documents in `/docs/workflows/`**:

- ✅ `patient.md` — Patient portal features, appointment booking, result viewing
- `receptionist.md` — Check-in, appointment management, patient registration (Coming soon)
- ✅ `doctor.md` — Patient assessment, prescription creation, consultation notes
- `nurse.md` — Vital signs monitoring, medication administration, pre-op preparation (Coming soon)
- `pharmacist.md` — Prescription filling, dispensing, drug interactions (Coming soon)
- `lab_technician.md` — Sample collection, test processing, result entry (Coming soon)
- `admin.md` — Hospital management, user creation, reporting, billing oversight (Coming soon)

---

## 🤖 Agent Context Map

### For GitHub Copilot Agents Working on CareSync

**Problem to Solve**: Need specific documenation for different kinds of work

#### When Adding a New Feature

**→ Read in this order**:
1. [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md) — Understand what needs to be built
2. [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md) — Who should access it
3. [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) — Where to put code
4. [DATA_MODEL.md](./DATA_MODEL.md) — What data storage needed
5. [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) — Code patterns to follow

**Then**: Create feature in appropriate component folder, write tests, check permissions

---

#### When Fixing a Bug

**→ Read in this order**:
1. [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) — Understand affected system
2. [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) — Debugging patterns
3. [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md) — If permission-related
4. [DATA_MODEL.md](./DATA_MODEL.md) — If data-related

**Then**: Locate component/hook, apply pattern fix, write test to prevent regression

---

#### When Implementing a Workflow

**→ Read in this order**:
1. [WORKFLOW_OVERVIEW.md](../workflows/WORKFLOW_OVERVIEW.md) — Understand workflow steps
2. [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md) — Detailed requirements
3. [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md) — Role-specific access control
4. [DATA_MODEL.md](./DATA_MODEL.md) — Data storage for each step
5. [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) — Multi-component patterns

**Then**: Implement step by step, add E2E test for full workflow, verify all roles work

---

#### When Reviewing Code

**→ Use checklist**:
- ✓ Follows naming conventions from [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md)
- ✓ Permissions checked per [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md)
- ✓ Error handling per [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) patterns
- ✓ Queries use hospital_id filter per [DATA_MODEL.md](./DATA_MODEL.md)
- ✓ Tests cover main paths
- ✓ No PHI in logs per security section

---

#### When Debugging Permission Issues

**→ Read in this order**:
1. [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md) — Permission definition
2. [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md#security--hipaa-compliance) — 3-layer enforcement
3. [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md#permission-denied-pattern) — Pattern examples
4. [DATA_MODEL.md](./DATA_MODEL.md) — RLS policies

**Checklist**:
- [ ] Permission exists in permissions matrix
- [ ] Frontend checks permission: `usePermissions()`
- [ ] API validates permission
- [ ] Database RLS policy enforces it
- [ ] User has role with permission
- [ ] User's hospital matches data's hospital_id

---

## 🏃 Onboarding for New Developers

### Day 1: System Understanding

1. **Read** [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) (15 min)
   - Understand tech stack, component structure, multi-tenancy model

2. **Read** [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md) Intro (10 min)
   - See what features exist

3. **Explore** Codebase
   ```bash
   # Frontend structure
   ls -la src/components
   ls -la src/hooks
   
   # Database
   ls -la supabase/migrations
   ```

4. **Setup Development**
   ```bash
   npm install
   npm run dev
   # Open http://localhost:5173
   ```

### Day 2: Authorization & Security

1. **Read** [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md) (20 min)
   - Understand 7 roles and permission model

2. **Read** relevant sections of [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) (15 min)
   - TypeScript patterns
   - Security best practices
   - Error handling

3. **Hands-on**: Create test user
   ```bash
   npm run create:test-users
   ```

4. **Test different roles**:
   - Login as Admin
   - Login as Doctor
   - Observe what features appear/disappear

### Day 3: Data Model & Queries

1. **Read** [DATA_MODEL.md](./DATA_MODEL.md) (20 min)
   - Understand 11 core entities
   - See schema and relationships

2. **Read** [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md#data-access--queries) (10 min)
   - Learn query patterns

3. **Try queries**:
   ```typescript
   // In a component
   const patients = usePatients();
   console.log(patients.data);
   ```

### Day 4-5: First Feature

1. **Pick small feature** from [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md)

2. **Follow pattern**:
   - Create component in `src/components/feature-name/`
   - Create hook in `src/hooks/useFeature.ts`
   - Add permission check
   - Write unit test
   - Test with E2E test

3. **Code review** against [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) checklist

---

## 📋 Document Dependencies

```
SYSTEM_ARCHITECTURE.md (Entry point)
├── FEATURE_REQUIREMENTS.md (what to build)
├── RBAC_PERMISSIONS.md (who can use it)
├── DATA_MODEL.md (how to store data)
├── DEVELOPMENT_STANDARDS.md (how to code it)
└── WORKFLOW_OVERVIEW.md (how to orchestrate it)
    └── Individual role workflows (detailed steps per role)
```

---

## 🔍 How to Find Information

### By Topic

| Need to find... | Read this | Location |
|---|---|---|
| How multi-tenancy works | SYSTEM_ARCHITECTURE | System Design section |
| Patient appointment workflow | FEATURE_REQUIREMENTS | Clinical Workflows section |
| Doctor permissions | RBAC_PERMISSIONS | Permission Matrix table |
| Patient table schema | DATA_MODEL | Entities section |
| How to name variables | DEVELOPMENT_STANDARDS | Naming Conventions section |
| Lab critical value workflow | WORKFLOW_OVERVIEW | High-Priority Workflows section |
| React component template | DEVELOPMENT_STANDARDS | React Component Patterns section |

### By Use Case

| I want to... | Read this | Then do... |
|---|---|---|
| Add new feature | FEATURE_REQUIREMENTS, RBAC_PERMISSIONS | Create component folder |
| Fix permission bug | RBAC_PERMISSIONS | Check 3-layer enforcement |
| Optimize query | DATA_MODEL, DEVELOPMENT_STANDARDS | Add index, fix N+1 |
| Understand error | DEVELOPMENT_STANDARDS | Check error handling section |
| Write E2E test | DEVELOPMENT_STANDARDS | Copy test pattern |
| Review PR | DEVELOPMENT_STANDARDS | Use PR checklist |

---

## 📞 Documentation Maintenance

### How to Update Docs

1. **Architecture changes** → Update [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
2. **New features** → Update [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md)
3. **Permission changes** → Update [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md)
4. **Schema changes** → Update [DATA_MODEL.md](./DATA_MODEL.md)
5. **Code pattern changes** → Update [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md)
6. **Workflow changes** → Update [WORKFLOW_OVERVIEW.md](../workflows/WORKFLOW_OVERVIEW.md)

### Update Process

1. **Make code change**
2. **Update relevant doc section**
3. **Update dates/versions**
4. **Commit together**: `docs: update X documentation for Y feature`

---

## ✅ Documentation Completeness Checklist

- [x] SYSTEM_ARCHITECTURE.md — Complete (15 KB)
- [x] FEATURE_REQUIREMENTS.md — Complete (12 KB)
- [x] RBAC_PERMISSIONS.md — Complete (10 KB)
- [x] DATA_MODEL.md — Complete (12 KB)
- [x] DEVELOPMENT_STANDARDS.md — Complete (14 KB)
- [x] WORKFLOW_OVERVIEW.md — Complete (8 KB)
- [x] API_REFERENCE.md — Complete (18 KB)
- [x] TESTING_STRATEGY.md — Complete (20 KB)
- [x] SECURITY_CHECKLIST.md — Complete (22 KB)
- [x] doctor.md — Complete (16 KB)
- [x] patient.md — Complete (15 KB)
- [ ] Additional role-specific workflows (receptionist, nurse, pharmacist, lab_tech, admin) — **Coming soon**
- [ ] Deployment & DevOps guide — Coming soon
- [ ] Integration guides (telemedicine, lab equipment, pharmacy systems) — Coming soon

**Total Documentation**: ~160 KB created (11 major documents)

---

## 📚 External Resources

- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **React Documentation**: https://react.dev/
- **Supabase Documentation**: https://supabase.com/docs
- **TanStack Query Docs**: https://tanstack.com/query/latest
- **GitHub Copilot Skills**: Read `.github/skills/` for specialized guidance

---

## 🚀 Quick Links

- **Project README**: `/README.md`
- **Copilot Instructions**: `/.github/copilot-instructions.md`
- **Product Manager Skill**: `/.github/skills/product-manager-docs/SKILL.md`
- **Source Code**: `/src/`
- **Database Migrations**: `/supabase/migrations/`
- **E2E Tests**: `/tests/e2e/`

---

**Last Updated**: April 8, 2026  
**Maintained by**: Development Team  
**Questions?** Contact: architecture@caresync.local
