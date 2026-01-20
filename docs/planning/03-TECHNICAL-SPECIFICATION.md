# Technical Specification Document
## Care Harmony Hub - Hospital Management System

**Version**: 1.0  
**Date**: January 2026  
**Status**: Approved

---

## 1. System Architecture

### 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Web App │  │ Mobile   │  │  Tablet  │  │  Kiosk   │   │
│  │  (React) │  │   App    │  │   App    │  │   App    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │   API Gateway  │
                    │   (Supabase)   │
                    └───────┬───────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Auth    │  │ Business │  │ Workflow │  │   AI/ML  │   │
│  │ Service  │  │  Logic   │  │  Engine  │  │  Service │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │  Redis   │  │  S3      │  │ Elastic  │   │
│  │ Database │  │  Cache   │  │ Storage  │  │  Search  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Architecture Patterns
- **Frontend**: Component-based architecture (React)
- **Backend**: Serverless architecture (Supabase Edge Functions)
- **Database**: PostgreSQL with Row Level Security
- **Caching**: Redis for session and query caching
- **Storage**: S3-compatible object storage
- **Search**: Elasticsearch for full-text search

---

## 2. Technology Stack

### 2.1 Frontend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | React | 18.3+ | UI framework |
| Language | TypeScript | 5.7+ | Type safety |
| Build Tool | Vite | 7.3+ | Build & dev server |
| Styling | Tailwind CSS | 3.4+ | Utility-first CSS |
| UI Library | Shadcn/UI | Latest | Component library |
| State Management | TanStack Query | 5.x | Server state |
| Routing | React Router | 6.x | Client-side routing |
| Forms | React Hook Form | 7.x | Form handling |
| Validation | Zod | 3.x | Schema validation |
| Animation | Framer Motion | 11.x | Animations |

### 2.2 Backend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Platform | Supabase | Latest | Backend-as-a-Service |
| Database | PostgreSQL | 15+ | Relational database |
| Auth | Supabase Auth | Latest | Authentication |
| Storage | Supabase Storage | Latest | File storage |
| Functions | Edge Functions | Latest | Serverless logic |
| Realtime | Supabase Realtime | Latest | WebSocket |

### 2.3 DevOps & Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Version Control | Git/GitHub | Source control |
| CI/CD | GitHub Actions | Automation |
| Hosting | Vercel/Netlify | Frontend hosting |
| Database Hosting | Supabase Cloud | Database hosting |
| Monitoring | Sentry | Error tracking |
| Analytics | Google Analytics | Usage analytics |
| CDN | Cloudflare | Content delivery |

---

## 3. System Components

### 3.1 Frontend Architecture

```typescript
src/
├── components/          # React components
│   ├── admin/          # Admin-specific components
│   ├── doctor/         # Doctor-specific components
│   ├── nurse/          # Nurse-specific components
│   ├── patient/        # Patient-specific components
│   ├── ui/             # Reusable UI components
│   └── shared/         # Shared components
├── pages/              # Route pages
├── hooks/              # Custom React hooks
├── services/           # API services
├── contexts/           # React contexts
├── utils/              # Utility functions
├── types/              # TypeScript types
└── styles/             # Global styles
```

### 3.2 Backend Architecture

```
supabase/
├── migrations/         # Database migrations
├── functions/          # Edge functions
│   ├── ai-triage/     # AI triage service
│   ├── notifications/ # Notification service
│   ├── analytics/     # Analytics service
│   └── integrations/  # Third-party integrations
└── seed/              # Seed data
```

---

## 4. Database Design

### 4.1 Core Tables

**Users & Authentication**:
- `profiles` - User profiles
- `roles` - User roles
- `permissions` - Role permissions
- `audit_logs` - Audit trail

**Patient Management**:
- `patients` - Patient demographics
- `medical_history` - Medical history
- `allergies` - Patient allergies
- `medications` - Current medications

**Clinical Operations**:
- `appointments` - Appointments
- `consultations` - Doctor consultations
- `prescriptions` - Prescriptions
- `lab_orders` - Laboratory orders
- `lab_results` - Lab results

**Pharmacy**:
- `pharmacy_inventory` - Drug inventory
- `prescription_queue` - Prescription queue
- `dispensing_log` - Dispensing records

**Billing**:
- `invoices` - Patient invoices
- `payments` - Payment records
- `insurance_claims` - Insurance claims

### 4.2 Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_patients_search ON patients USING gin(to_tsvector('english', full_name));
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_consultations_patient ON consultations(patient_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
```

### 4.3 Row Level Security

```sql
-- Example RLS policy
CREATE POLICY "Users can view own data"
ON patients FOR SELECT
USING (auth.uid() = user_id OR 
       EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('doctor', 'nurse', 'admin')));
```

---

## 5. API Design

### 5.1 RESTful API Endpoints

**Authentication**:
```
POST   /auth/signup
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
POST   /auth/reset-password
```

**Patients**:
```
GET    /api/patients
GET    /api/patients/:id
POST   /api/patients
PUT    /api/patients/:id
DELETE /api/patients/:id
GET    /api/patients/search?q=
```

**Appointments**:
```
GET    /api/appointments
POST   /api/appointments
PUT    /api/appointments/:id
DELETE /api/appointments/:id
GET    /api/appointments/availability
```

**Consultations**:
```
GET    /api/consultations
POST   /api/consultations
PUT    /api/consultations/:id
GET    /api/consultations/:id/prescriptions
POST   /api/consultations/:id/prescriptions
```

### 5.2 API Response Format

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe"
  },
  "meta": {
    "timestamp": "2026-01-15T10:30:00Z",
    "version": "1.0"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

---

## 6. Security Architecture

### 6.1 Authentication Flow

```
1. User submits credentials
2. Backend validates credentials
3. Generate JWT token (access + refresh)
4. Return tokens to client
5. Client stores tokens (httpOnly cookies)
6. Include access token in API requests
7. Refresh token when expired
```

### 6.2 Authorization Layers

1. **Network Layer**: Firewall, DDoS protection
2. **Application Layer**: JWT validation, role checking
3. **Database Layer**: Row Level Security (RLS)
4. **Data Layer**: Encryption at rest

### 6.3 Data Protection

**Encryption**:
- TLS 1.3 for data in transit
- AES-256 for data at rest
- Field-level encryption for sensitive data (SSN, credit cards)

**Access Control**:
- Role-based access control (RBAC)
- Attribute-based access control (ABAC)
- Principle of least privilege

---

## 7. Performance Optimization

### 7.1 Frontend Optimization

**Code Splitting**:
```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Patients = lazy(() => import('./pages/Patients'));
```

**Caching Strategy**:
- Static assets: 1 year cache
- API responses: 5 minutes cache
- User data: Session storage

**Bundle Optimization**:
- Tree shaking enabled
- Code minification
- Image optimization (WebP format)
- Lazy loading images

### 7.2 Backend Optimization

**Database Optimization**:
- Query optimization
- Connection pooling
- Read replicas for reporting
- Materialized views for complex queries

**Caching Strategy**:
```typescript
// Redis caching
const cacheKey = `patient:${patientId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const data = await db.query(...);
await redis.setex(cacheKey, 300, JSON.stringify(data));
return data;
```

---

## 8. Scalability

### 8.1 Horizontal Scaling

**Application Layer**:
- Stateless application servers
- Load balancer (Round-robin)
- Auto-scaling based on CPU/memory

**Database Layer**:
- Read replicas for read-heavy operations
- Connection pooling (PgBouncer)
- Partitioning for large tables

### 8.2 Vertical Scaling

**Resource Allocation**:
- Production: 8 vCPU, 32GB RAM
- Staging: 4 vCPU, 16GB RAM
- Development: 2 vCPU, 8GB RAM

---

## 9. Monitoring & Logging

### 9.1 Application Monitoring

**Metrics**:
- Response time (p50, p95, p99)
- Error rate
- Request rate
- Active users

**Tools**:
- Sentry for error tracking
- DataDog for APM
- Google Analytics for user analytics

### 9.2 Infrastructure Monitoring

**Metrics**:
- CPU utilization
- Memory usage
- Disk I/O
- Network throughput

**Alerts**:
- CPU > 80% for 5 minutes
- Memory > 90% for 5 minutes
- Error rate > 1% for 5 minutes
- Response time > 2s for 5 minutes

---

## 10. Disaster Recovery

### 10.1 Backup Strategy

**Database Backups**:
- Full backup: Daily at 2 AM
- Incremental backup: Every 6 hours
- Retention: 30 days
- Off-site backup: AWS S3

**Application Backups**:
- Code: Git repository
- Configuration: Encrypted in S3
- Secrets: HashiCorp Vault

### 10.2 Recovery Procedures

**RTO (Recovery Time Objective)**: 4 hours  
**RPO (Recovery Point Objective)**: 1 hour

**Recovery Steps**:
1. Assess damage and impact
2. Activate disaster recovery team
3. Restore from latest backup
4. Verify data integrity
5. Resume operations
6. Post-mortem analysis

---

## 11. Integration Architecture

### 11.1 Third-Party Integrations

| System | Protocol | Purpose |
|--------|----------|---------|
| Payment Gateway | REST API | Payment processing |
| SMS Provider | REST API | SMS notifications |
| Email Service | SMTP/API | Email notifications |
| Lab Equipment | HL7 | Lab results |
| Pharmacy System | FHIR | Prescription sync |

### 11.2 Integration Patterns

**Synchronous**:
- REST API calls
- GraphQL queries
- Direct database queries

**Asynchronous**:
- Message queues (RabbitMQ)
- Event streaming (Kafka)
- Webhooks

---

## 12. Development Standards

### 12.1 Code Standards

**TypeScript**:
- Strict mode enabled
- No implicit any
- ESLint + Prettier
- Naming conventions: camelCase for variables, PascalCase for components

**React**:
- Functional components only
- Custom hooks for logic reuse
- Props validation with TypeScript
- Component documentation

### 12.2 Git Workflow

**Branch Strategy**:
- `main` - Production
- `staging` - Staging environment
- `develop` - Development
- `feature/*` - Feature branches
- `hotfix/*` - Hotfix branches

**Commit Convention**:
```
feat: Add patient search functionality
fix: Resolve appointment booking bug
docs: Update API documentation
test: Add unit tests for billing module
```

---

**Approved By**:

Technical Lead: _________________ Date: _______  
DevOps Lead: _________________ Date: _______  
Security Officer: _________________ Date: _______
