# Backend Development Guide — CareSync HIMS

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**Audience**: Backend developers, Node.js engineers, API architects

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [API Architecture](#api-architecture)
3. [Database Layer](#database-layer)
4. [Authentication & Authorization](#authentication--authorization)
5. [Error Handling](#error-handling)
6. [Service Layer Patterns](#service-layer-patterns)
7. [Middleware & Interceptors](#middleware--interceptors)
8. [Testing Backend Code](#testing-backend-code)

---

## Project Structure

### Directory Organization

```
backend/
├── src/
│   ├── routes/                 # API route handlers
│   │   ├── auth.routes.ts      # /auth/* endpoints
│   │   ├── patients.routes.ts  # /patients/* endpoints
│   │   ├── appointments.routes.ts
│   │   ├── consultations.routes.ts
│   │   ├── prescriptions.routes.ts
│   │   ├── lab-orders.routes.ts
│   │   └── admin.routes.ts
│   │
│   ├── controllers/            # Request handlers (thin layer)
│   │   ├── auth.controller.ts
│   │   ├── patient.controller.ts
│   │   ├── appointment.controller.ts
│   │   └── ...
│   │
│   ├── services/               # Business logic (domain-specific)
│   │   ├── auth/
│   │   │   ├── authentication.service.ts
│   │   │   ├── password-reset.service.ts
│   │   │   └── 2fa.service.ts
│   │   ├── patient/
│   │   │   ├── patient.service.ts
│   │   │   └── patient-registry.service.ts
│   │   ├── clinical/
│   │   │   ├── consultation.service.ts
│   │   │   ├── prescription.service.ts
│   │   │   └── drug-interaction.service.ts
│   │   ├── notification/
│   │   │   ├── email.service.ts
│   │   │   ├── sms.service.ts
│   │   │   └─

ş notification.service.ts
│   │   └── audit/
│   │       └── audit-trail.service.ts
│   │
│   ├── repositories/           # Database access layer (DAL)
│   │   ├── patient.repository.ts
│   │   ├── appointment.repository.ts
│   │   ├── prescription.repository.ts
│   │   └── base.repository.ts  # Generic patterns
│   │
│   ├── middleware/             # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── error-handler.middleware.ts
│   │   ├── logging.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── rls-enforcement.middleware.ts
│   │
│   ├── validators/             # Input validation schemas
│   │   ├── patient.validator.ts
│   │   ├── prescription.validator.ts
│   │   └── common.validator.ts
│   │
│   ├── dto/                    # Data Transfer Objects (DTOs)
│   │   ├── patient.dto.ts
│   │   ├── appointment.dto.ts
│   │   ├── request.dto.ts
│   │   └── response.dto.ts
│   │
│   ├── lib/                    # Utilities (no business logic)
│   │   ├── supabase.client.ts  # Supabase config
│   │   ├── sanitize.ts         # PHI sanitization
│   │   ├── encryption.ts       # AES encryption utils
│   │   ├── hl7-parser.ts       # HL7 parsing
│   │   ├── logger.ts           # Structured logging
│   │   ├── jwT-handler.ts      # JWT operations
│   │   ├── formatters.ts       # Data formatting
│   │   └── validators.ts       # Reusable validation
│   │
│   ├── types/                  # TypeScript types
│   │   ├── index.ts            # Common types
│   │   ├── patient.types.ts
│   │   ├── api.types.ts        # Request/response shapes
│   │   └── database.types.ts   # Database entity types
│   │
│   ├── migrations/             # Database migrations
│   │   ├── 001_create_users.sql
│   │   ├── 002_create_patients.sql
│   │   └── 003_add_audit_trail.sql
│   │
│   ├── seeds/                  # Database seeds (test data)
│   │   ├── users.seed.ts
│   │   ├── patients.seed.ts
│   │   └── seed-runner.ts
│   │
│   ├── jobs/                   # Background jobs (Bull queues)
│   │   ├── send-appointment-reminder.job.ts
│   │   ├── process-lab-results.job.ts
│   │   └── generate-reports.job.ts
│   │
│   ├── events/                 # Event handlers (pub/sub)
│   │   ├── prescription-created.event.ts
│   │   ├── lab-result-reported.event.ts
│   │   └── event-bus.ts
│   │
│   ├── config/                 # Configuration
│   │   ├── env.ts              # Environment variables
│   │   ├── database.ts         # DB connection config
│   │   └── cache.ts            # Redis config
│   │
│   ├── __tests__/              # Unit & integration tests
│   │   ├── unit/
│   │   │   ├── services/
│   │   │   └── repositories/
│   │   └── integration/
│   │       └── api.test.ts
│   │
│   └── app.ts                  # Express app setup

KEY PRINCIPLES:
├─ routes/ = Thin request handlers
├─ controllers/ = HTTP concerns (parsing, status codes)
├─ services/ = Business logic (can be tested independently)
├─ repositories/ = Database queries (abstract DB from services)
├─ middleware/ = Cross-cutting concerns (auth, logging, errors)
└─ lib/ = Pure utilities (no dependencies on app context)
```

---

## API Architecture

### RESTful Endpoint Patterns

```
RESOURCE HIERARCHY:

/api/v1/
├─ /auth
│  ├─ POST /login
│  ├─ POST /logout
│  ├─ POST /refresh-token
│  └─ POST /2fa/verify
│
├─ /patients
│  ├─ GET / (list all)
│  ├─ POST / (create)
│  ├─ GET /:id (details)
│  ├─ PATCH /:id (update)
│  ├─ DELETE /:id (soft delete)
│  │
│  ├─ /:id/appointments (nested resource)
│  │  ├─ GET / (patient's appointments)
│  │  └─ POST / (create appointment)
│  │
│  └─ /:id/medical-records
│     ├─ GET / (family history, allergies, etc.)
│     └─ PATCH / (update)
│
├─ /appointments
│  ├─ GET / (list, filterable)
│  ├─ POST / (create)
│  ├─ GET /:id
│  └─ PATCH /:id/status
│
├─ /consultations
│  ├─ GET / (by doctor, patient, by date)
│  ├─ POST / (create)
│  ├─ GET /:id
│  ├─ PATCH /:id (update notes)
│  └─ POST /:id/finalize (lock consultation)
│
├─ /prescriptions
│  ├─ GET / (list)
│  ├─ POST / (create)
│  ├─ GET /:id
│  ├─ POST /:id/approve
│  ├─ POST /:id/reject
│  └─ POST /:id/transmit-to-pharmacy
│
├─ /lab-orders
│  ├─ GET / (list)
│  ├─ POST / (create)
│  ├─ POST /:id/import-results
│  └─ GET /:id/results (linked results)
│
└─ /admin
   ├─ /users
   │  ├─ GET /
   │  ├─ POST /
   │  └─ PATCH /:id
   └─ /reports
      └─ GET / (analytics)

QUERY PARAMETERS (Filtering, Sorting, Pagination):

GET /api/v1/patients
  ?hospital_id=hosp-123     # Filter by hospital (RLS enforced)
  &status=active            # Filter by status
  &search=John              # Search by name
  &sort=-created_at         # Sort by field (- for desc)
  &page=1                   # Pagination (1-indexed)
  &limit=20                 # Items per page

Response format:
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total_count": 127,
    "has_next_page": true
  }
}

FILTERING LOGIC:

// Example: ListPatientsQuery
interface ListPatientsQuery {
  hospital_id: string;        // Required, enforced by RLS
  status?: 'active' | 'inactive';
  search?: string;
  sort?: string;              // '-created_at' means DESC
  page?: number;
  limit?: number;
}

async function listPatients(query: ListPatientsQuery) {
  let q = supabase
    .from('patients')
    .select('*', { count: 'exact' })
    .eq('hospital_id', query.hospital_id);

  // Apply filters
  if (query.status) {
    q = q.eq('status', query.status);
  }

  if (query.search) {
    q = q.or(
      `first_name.ilike.%${query.search}%,last_name.ilike.%${query.search}%`
    );
  }

  // Sorting
  const [field, direction] = (query.sort || 'created_at').split('-');
  q = q.order(field, { ascending: !query.sort?.startsWith('-') });

  // Pagination
  const page = query.page || 1;
  const limit = query.limit || 20;
  const offset = (page - 1) * limit;
  q = q.range(offset, offset + limit - 1);

  const { data, count, error } = await q;
  
  return {
    data,
    meta: {
      page,
      limit,
      total_count: count,
      has_next_page: (page * limit) < (count || 0)
    }
  };
}
```

### Request/Response Handlers

```
CONTROLLER PATTERN:

// controllers/patient.controller.ts
import { Request, Response, NextFunction } from 'express';
import { PatientService } from '@/services/patient/patient.service';
import { ListPatientsQuery } from '@/types/api.types';
import { sendSuccess, sendError } from '@/lib/response-handlers';

export class PatientController {
  constructor(private patientService: PatientService) {}

  async listPatients(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Extract hospital from auth token (enforced by middleware)
      const hospitalId = req.user!.hospital_id;

      // Parse & validate query
      const query: ListPatientsQuery = {
        hospital_id: hospitalId,
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
        sort: req.query.sort as string | undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(
          parseInt(req.query.limit as string) || 20,
          100  // Max 100 per page
        )
      };

      const result = await this.patientService.listPatients(query);

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);  // Pass to error middleware
    }
  }

  async getPatient(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const hospitalId = req.user!.hospital_id;

      const patient = await this.patientService.getPatient(id);

      // RLS: Verify patient belongs to user's hospital
      if (patient.hospital_id !== hospitalId) {
        return sendError(res, 'Patient not found', 404);
      }

      sendSuccess(res, patient, 200);
    } catch (error) {
      next(error);
    }
  }

  async createPatient(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const hospitalId = req.user!.hospital_id;
      const userId = req.user!.id;

      // Validate request body
      const patient = await validatePatientInput(req.body);

      // Service call with hospital scope
      const newPatient = await this.patientService.createPatient({
        ...patient,
        hospital_id: hospitalId,
        created_by: userId
      });

      sendSuccess(res, newPatient, 201);
    } catch (error) {
      next(error);
    }
  }
}

// Route setup
import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import { PatientController } from '@/controllers/patient.controller';
import { PatientService } from '@/services/patient/patient.service';

const router = Router();
const service = new PatientService();
const controller = new PatientController(service);

router.use(requireAuth);  // All these routes require auth

router.get('/', (req, res, next) =>
  controller.listPatients(req, res, next)
);

router.post('/', (req, res, next) =>
  controller.createPatient(req, res, next)
);

router.get('/:id', (req, res, next) =>
  controller.getPatient(req, res, next)
);

export default router;

RESPONSE HANDLERS:

// lib/response-handlers.ts
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200
) {
  res.status(statusCode).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = 400,
  details?: any
) {
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: getErrorCode(statusCode),
      details: details || undefined  // Omit if undefined
    },
    timestamp: new Date().toISOString()
  });
}

// Usage
sendSuccess(res, patient, 200);
sendError(res, 'Invalid input', 400, { field: 'email', reason: 'already exists' });
```

---

## Database Layer

### Repository Pattern

```
BASE REPOSITORY (Generic patterns):

// repositories/base.repository.ts
export abstract class BaseRepository<T> {
  constructor(
    protected supabase: SupabaseClient,
    protected tableName: string
  ) {}

  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error?.code === 'PGRST116') return null;  // Not found
    if (error) throw error;
    return data as T;
  }

  async findMany(
    filters: Record<string, any> = {},
    options: { limit?: number; offset?: number; orderBy?: string } = {}
  ): Promise<T[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*');

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value);
      }
    });

    // Sorting
    if (options.orderBy) {
      const [field, direction] = options.orderBy.split(':');
      query = query.order(field, { ascending: direction !== 'desc' });
    }

    // Pagination
    if (options.limit) {
      query = query.limit(options.limit);
      if (options.offset) {
        query = query.range(options.offset, options.offset + options.limit - 1);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as T[];
  }

  async insert(entity: Omit<T, 'id' | 'created_at'>): Promise<T> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert([entity])
      .select()
      .single();

    if (error) throw error;
    return data as T;
  }

  async update[id: string, updates: Partial<T>): Promise<T> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as T;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

SPECIFIC REPOSITORY (Domain-specific queries):

// repositories/patient.repository.ts
import { BaseRepository } from './base.repository';
import { Patient } from '@/types/patient.types';

export class PatientRepository extends BaseRepository<Patient> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'patients');
  }

  // Domain-specific query
  async findByEmailAndHospital(
    email: string,
    hospitalId: string
  ): Promise<Patient | null> {
    const { data, error } = await this.supabase
      .from('patients')
      .select('*')
      .eq('email', email)
      .eq('hospital_id', hospitalId)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data as Patient;
  }

  // Complex query with joins
  async findWithAppointments(
    patientId: string
  ): Promise<Patient & { appointments: Appointment[] }> {
    const { data, error } = await this.supabase
      .from('patients')
      .select(`
        *,
        appointments (
          id,
          date,
          time,
          status,
          doctor:created_by(id, name)
        )
      `)
      .eq('id', patientId)
      .single();

    if (error) throw error;
    return data as any;
  }

  // Search with full-text using Postgres
  async search(hospitalId: string, query: string): Promise<Patient[]> {
    const { data, error } = await this.supabase
      .rpc('search_patients', {  // PostgreSQL function
        p_hospital_id: hospitalId,
        p_search_query: query
      });

    if (error) throw error;
    return data as Patient[];
  }
}

RLS ENFORCEMENT:

// All queries automatically scoped via Row Level Security
// Database enforces: 
// - Users can only see patients in their hospital
// - Patients can only see their own data
// - Doctors can see assigned patients

Example RLS policy:

CREATE POLICY "doctors_see_assigned_patients"
  ON patients
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT created_by FROM doctors 
      WHERE doctor_id = auth.uid()
    ) AND
    hospital_id = (
      SELECT hospital_id FROM users 
      WHERE id = auth.uid()
    )
  );
```

### Query Optimization

```
N+1 QUERY PROBLEM (anti-pattern):

// ❌ BAD - N+1 queries
const patients = await getPatients(hospitalId);
for (const patient of patients) {
  patient.lat_appointment = await getLatestAppointment(patient.id);
}
// Result: 1 + N queries!

// ✅ GOOD - Single query with join
const patientsWithAppointments = await this.supabase
  .from('patients')
  .select(`
    *,
    appointments!inner(*)
  `)
  .eq('hospital_id', hospitalId)
  .limit(1)
  .order('appointments.created_at', { ascending: false });

QUERY CACHING:

// service/patient.service.ts
import NodeCache from 'node-cache';

export class PatientService {
  private cache = new NodeCache({ stdTTL: 600 });  // 10 min TTL

  async getPatient(id: string) {
    const cachedPatient = this.cache.get(`patient:${id}`);
    if (cachedPatient) return cachedPatient;

    const patient = await this.patientRepository.findById(id);
    this.cache.set(`patient:${id}`, patient);

    return patient;
  }

  async updatePatient(id: string, updates: Partial<Patient>) {
    const result = await this.patientRepository.update(id, updates);

    // Invalidate cache
    this.cache.del(`patient:${id}`);

    return result;
  }
}

INDEXES (Database optimization):

Migrations should create indexes on frequently queried fields:

-- Create an index for hospital_id (used in every query)
CREATE INDEX idx_patients_hospital_id 
  ON patients(hospital_id);

-- Composite index for common filters
CREATE INDEX idx_patients_hospital_status
  ON patients(hospital_id, status);

-- Full-text search index
CREATE INDEX idx_patients_search_name
  ON patients USING GIN (
    to_tsvector('english', first_name || ' ' || last_name)
  );

-- Time-range queries
CREATE INDEX idx_appointments_created_date
  ON appointments(hospital_id, created_at DESC);
```

---

## Authentication & Authorization

### JWT & Token Management

```
JWT FLOW:

1. User logs in
   POST /auth/login
   {
     "email": "doctor@hospital.net",
     "password": "..."
   }

2. Backend validates credentials
   ├─ Hash password & compare
   ├─ Fetch user + roles/permissions
   └─ Load hospital info

3. Generate tokens:

// lib/jwt-handler.ts
export function generateTokens(user: User) {
  // Access token (short-lived, 1 hour)
  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      hospital_id: user.hospital_id,
      permissions: user.permissions
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Refresh token (long-lived, 7 days)
  const refreshToken = jwt.sign(
    { sub: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): DecodedToken {
  try {
    return jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    throw new Error('Invalid token');
  }
}

4. Return tokens to client:

{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "usr-123",
      "email": "doctor@hospital.net",
      "role": "doctor",
      "hospital_id": "hosp-123"
    }
  }
}

5. Client stores tokens
   ├─ Access token: Memory or httpOnly cookie
   ├─ Refresh token: httpOnly cookie (more secure)
   └─ Frontend sends access token in Authorization header

6. Subsequent requests
   GET /api/v1/patients
   Authorization: Bearer eyJhbGc...

REFRESH TOKEN ROTATION:

// When access token expires:
POST /auth/refresh
{
  "refreshToken": "eyJhbGc..."
}

Backend:
├─ Validate refresh token
├─ Check if token in blacklist (logged out?)
├─ Generate new access token & new refresh token
├─ Rotate refresh token (security practice)
└─ Return new token pair

export function handleTokenRefresh(refreshToken: string) {
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    ) as { sub: string };

    // Check if token is blacklisted (user logged out)
    if (isTokenBlacklisted(refreshToken)) {
      throw new Error('Token has been revoked');
    }

    // Fetch fresh user data
    const user = await getUserById(decoded.sub);

    // Generate new tokens
    const newTokens = generateTokens(user);

    // Add old refresh token to blacklist
    blacklistToken(refreshToken);

    return newTokens;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}
```

### Role-Based Access Control (RBAC)

```
PERMISSION MATRIX:

// lib/permissions.ts
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  'doctor': [
    'patients:view',
    'patients:create',
    'consultations:create',
    'prescriptions:create',
    'prescriptions:view',
    'lab_orders:create',
    'notes:create',
    'reports:view'
  ],
  'nurse': [
    'patients:view',
    'vitals:record',
    'notes:create',
    'consultations:view'
  ],
  'pharmacist': [
    'prescriptions:view',
    'prescriptions:approve',
    'medications:dispense',
    'drug_interactions:check'
  ],
  'admin': [
    'users:create',
    'users:delete',
    'hospital:configure',
    'reports:view',
    'reports:admin'
  ],
  'patient': [
    'records:view',
    'appointments:view',
    'appointments:book', 
    'appointments:cancel'
  ]
};

CHECK PERMISSION IN MIDDLEWARE:

// middleware/auth.middleware.ts
export function checkPermission(requiredPermission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = req.user?.permissions || [];

    if (!userPermissions.includes(requiredPermission)) {
      return sendError(res, 'Insufficient permissions', 403);
    }

    next();
  };
}

// Usage in routes
router.post(
  '/',
  checkPermission('prescriptions:create'),
  (req, res, next) => controller.createPrescription(req, res, next)
);

ATTRIBUTE-BASED ACCESS CONTROL (ABAC):

For complex rules beyond simple roles, use ABAC:

// Can doctor approve prescription?
const canApprovePrescription = (
  { role, id }: User,
  prescription: Prescription
) => {
  // Only pharmacists can approve
  if (role !== 'pharmacist') return false;

  // Only from their hospital
  if (prescription.hospital_id !== user.hospital_id) return false;

  // Must be unreviewed
  if (prescription.status !== 'pending') return false;

  // Prescription not older than 30 days
  const ageInDays = daysAgo(prescription.created_at);
  if (ageInDays > 30) return false;

  return true;
};

// Usage in service
export class PrescriptionService {
  async approvePrescription(
    prescriptionId: string,
    user: User
  ) {
    const prescription = await this.repo.findById(prescriptionId);

    if (!canApprovePrescription(user, prescription)) {
      throw new ForbiddenError('Cannot approve this prescription');
    }

    // Proceed with approval
    return this.repo.update(prescriptionId, { status: 'approved' });
  }
}
```

---

## Error Handling

### Error Hierarchy

```
ERROR TYPES:

// lib/errors.ts
export abstract class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = 'ERROR'
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: Record<string, string>) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(401, message, 'AUTH_ERROR');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Unauthorized') {
    super(403, message, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super(429, 'Too many requests', 'RATE_LIMITED');
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(500, message, 'INTERNAL_ERROR');
  }
}

USAGE:

if (!email) {
  throw new ValidationError('Email is required', {
    email: 'field_missing'
  });
}

if (!user) {
  throw new NotFoundError('User');
}

if (!canAccess) {
  throw new ForbiddenError('Cannot access patient data from other hospital');
}
```

### Global Error Handler

```
// middleware/error-handler.middleware.ts
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error (with sanitization for PHI)
  const sanitized = sanitizeForLog(error);
  logger.error({
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    timestamp: new Date()
  });

  // Known app error
  if (error instanceof AppError) {
    return sendError(
      res,
      error.message,
      error.statusCode,
      { code: error.code }
    );
  }

  // Supabase errors
  if (error instanceof PostgrestError) {
    // Handle database constraint violations
    if (error.code === '23505') {  // Unique constraint
      return sendError(res, 'Record already exists', 409);
    }
    if (error.code === '23503') {  // Foreign key
      return sendError(res, 'Related record not found', 404);
    }
  }

  // Unknown error - generic response (don't leak details)
  sendError(
    res,
    'An unexpected error occurred',
    500,
    process.env.NODE_ENV === 'development' 
      ? { error: error.message }
      : undefined
  );
}

// Apply middleware
app.use(errorHandler);

ASYNC ERROR WRAPPER:

Helper to catch async errors in route handlers:

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Usage
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const patient = await createPatient(req.body);
    sendSuccess(res, patient, 201);
  })
);
```

---

## Service Layer Patterns

### Business Logic Organization

```
SERVICE: Drug Interaction Checking

// services/clinical/drug-interaction.service.ts
export class DrugInteractionService {
  private interactionDatabase: DrugInteractionDB;

  constructor() {
    this.interactionDatabase = new DrugInteractionDB();  // Loaded once
  }

  async checkInteractions(
    patientId: string,
    newDrug: Drug
  ): Promise<Interaction[]> {
    // Get patient's current medications
    const currentMeds = await this.getCurrentMedications(patientId);

    const interactions: Interaction[] = [];

    // Check new drug against each current medication
    for (const med of currentMeds) {
      const interaction = this.interactionDatabase.lookup(
        med.drug_id,
        newDrug.id
      );

      if (interaction) {
        interactions.push({
          drug1: med.name,
          drug2: newDrug.name,
          severity: interaction.severity,  // MAJOR, MODERATE, MINOR
          description: interaction.description,
          management: interaction.management
        });
      }
    }

    // Check for age/kidney/liver contraindications
    const patient = await this.getPatientHealthProfile(patientId);
    const contraindications = this.checkContraindications(newDrug, patient);

    return [...interactions, ...contraindications];
  }

  private async getCurrentMedications(patientId: string): Promise<PatientMedication[]> {
    //Query active medications from database
    const { data, error } = await supabase
      .from('patient_medications')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'active');

    if (error) throw error;
    return data;
  }

  private checkContraindications(
    drug: Drug,
    patient: PatientHealthProfile
  ): Interaction[] {
    const contraindications: Interaction[] = [];

    // Age check
    if (drug.contraindications?.min_age && patient.age < drug.contraindications.min_age) {
      contraindications.push({
        drug1: drug.name,
        drug2: 'Age',
        severity: 'MAJOR',
        description: `${drug.name} not recommended for patients under ${drug.contraindications.min_age}`,
        management: 'Consider alternative' 
      });
    }

    // Renal function check
    if (drug.renally_cleared && patient.creatinine_clearance < 30) {
      contraindications.push({
        drug1: drug.name,
        drug2: 'Renal function',
        severity: 'MAJOR',
        description: `${drug.name} requires dose adjustment with eGFR < 30`,
        management: 'Reduce dose or choose alternative'
      });
    }

    return contraindications;
  }

  private async getPatientHealthProfile(patientId: string) {
    const { data, error } = await supabase
      .from('patients')
      .select('age, creatinine_clearance, liver_function_status')
      .eq('id', patientId)
      .single();

    if (error) throw error;
    return data;
  }
}

SERVICE USAGE IN CONTROLLER:

// controllers/prescription.controller.ts
export class PrescriptionController {
  constructor(
    private rxService: PrescriptionService,
    private interactionService: DrugInteractionService
  ) {}

  async createPrescription(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId, drugId, dose } = req.body;

      // First: Check for interactions
      const drug = await this.drugService.getDrug(drugId);
      const interactions = await this.interactionService.checkInteractions(
        patientId,
        drug
      );

      // If major interactions found, alert doctor
      const majorInteractions = interactions.filter(i => i.severity === 'MAJOR');
      if (majorInteractions.length > 0) {
        return sendError(
          res,
          'Major drug interactions detected',
          400,
          { interactions: majorInteractions, action_required: true }
        );
      }

      // Second: Create prescription (minor interactions OK with caution)
      const prescription = await this.rxService.createPrescription({
        patient_id: patientId,
        drug_id: drugId,
        dose,
        created_by: req.user!.id,
        warnings: interactions  // Include minor interactions as warnings
      });

      // Third: Trigger notifications
      await this.notificationService.notifyPharmacist(prescription);

      sendSuccess(res, prescription, 201);
    } catch (error) {
      next(error);
    }
  }
}
```

---

## Middleware & Interceptors

### Authentication Middleware

```
// middleware/auth.middleware.ts
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing authorization token');
    }

    const token = authHeader.slice(7);  // Remove "Bearer "

    // Verify token
    const decoded = verifyAccessToken(token);

    // Load user data (for current role/permissions)
    const user = await getUserWithPermissions(decoded.sub);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Attach to request
    req.user = user;
    next();

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return sendError(res, 'Token expired', 401, { code: 'TOKEN_EXPIRED' });
    }
    return sendError(res, 'Unauthorized', 401);
  }
}

// Applied globally or per route
app.use('/api/v1/', requireAuth);

OPTIONAL AUTH MIDDLEWARE:

// For public endpoints that also accept auth
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      req.user = verifyAccessToken(token);
    }
    next();
  } catch (error) {
    // Ignore auth errors, continue as unauthenticated
    next();
  }
}

MULTI-TENANCY ENFORCEMENT:

// middleware/hospital-scoping.middleware.ts
export async function enforceHospitalScoping(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Extract hospital from authenticated user
  const hospitalId = req.user?.hospital_id;

  // Add to request for services to use
  req.hospital_id = hospitalId;

  // Verify all query params respect hospital scope
  if (req.query.hospital_id && req.query.hospital_id !== hospitalId) {
    throw new ForbiddenError('Cannot access data from other hospitals');
  }

  next();
}

app.use('/api/v1/', requireAuth, enforceHospitalScoping);
```

### Logging Middleware

```
// middleware/logging.middleware.ts
import { Logger } from '@/lib/logger';

const logger = new Logger('API');

export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();

  // Log request
  logger.info({
    event: 'http_request_start',
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req.user?.id,
    hospitalId: req.user?.hospital_id,
    ip: req.ip
  });

  // Intercept response
  const originalSend = res.send.bind(res);
  res.send = function(data: any) {
    const duration = Date.now() - startTime;

    // Log response
    logger.info({
      event: 'http_request_complete',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration_ms: duration,
      userId: req.user?.id
    });

    // Don't log sensitive data in response
    return originalSend(data);
  };

  next();
}

app.use(loggingMiddleware);
```

### Rate Limiting

```
// middleware/rate-limit.middleware.ts
import RedisStore from 'rate-limit-redis';
import redis from '@/lib/redis';

const limiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rate-limit:',
    expiry: 60  // 1 minute window
  }),
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => req.user?.role === 'admin',  // Exempt admins
  message: 'Too many requests, please try again later'
});

// Per-endpoint limits
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 5,  // 5 requests max
  keyGenerator: (req) => req.user?.id || req.ip
});

// Apply
app.use('/api/v1/', limiter);
app.post('/auth/login', strictLimiter, loginHandler);  // 5 attempts/min
```

---

## Testing Backend Code

### Unit Testing Services

```
// __tests__/unit/services/drug-interaction.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DrugInteractionService } from '@/services/clinical/drug-interaction.service';
import * as supabaseModule from '@/lib/supabase.client';

describe('DrugInteractionService', () => {
  let service: DrugInteractionService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
    };

    vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue(mockSupabase);
    service = new DrugInteractionService();
  });

  it('should detect major drug interactions', async () => {
    // Setup mock data
    mockSupabase.single.mockResolvedValue({
      data: [
        { id: 'med-1', drug_id: 'warfarin', name: 'Warfarin' },
        { id: 'med-2', drug_id: 'aspirin', name: 'Aspirin' }
      ]
    });

    const newDrug = { id: 'aspirin', name: 'Aspirin' };

    // Call method
    const interactions = await service.checkInteractions('pat-123', newDrug);

    // Assert
    expect(interactions).toHaveLength(1);
    expect(interactions[0].severity).toBe('MAJOR');
    expect(interactions[0].description).toContain('bleeding risk');
  });

  it('should not flag interactions for compatible drugs', async () => {
    mockSupabase.single.mockResolvedValue({
      data: [{ id: 'med-1', drug_id: 'lisinopril', name: 'Lisinopril' }]
    });

    const newDrug = { id: 'metformin', name: 'Metformin' };

    const interactions = await service.checkInteractions('pat-123', newDrug);

    expect(interactions).toHaveLength(0);
  });

  it('should check age contraindications', async () => {
    // Patient too young for drug
    const service = new DrugInteractionService();
    const drugWithAgeLimit = { id: 'drug-xyz', contraindications: { min_age: 18 } };
    const youngPatient = { age: 16, creatinine_clearance: 90 };

    const contraindications = service['checkContraindications'](
      drugWithAgeLimit,
      youngPatient
    );

    expect(contraindications).toHaveLength(1);
    expect(contraindications[0].severity).toBe('MAJOR');
  });
});
```

### Integration Testing

```
// __tests__/integration/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '@/app';
import { seedTestData, cleanupTestData } from '@/seeds';

describe('Prescription API', () => {
  let authToken: string;
  let testDoctor: any;
  let testPatient: any;

  beforeAll(async () => {
    // Seed test data
    const data = await seedTestData();
    testDoctor = data.doctor;
    testPatient = data.patient;

    // Get auth token
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testDoctor.email,
        password: testDoctor.password
      });

    authToken = response.body.data.accessToken;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('should create prescription with valid data', async () => {
    const response = await request(app)
      .post('/api/v1/prescriptions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        patient_id: testPatient.id,
        drug_id: 'drug-metformin',
        dose: 500,
        frequency: 'daily',
        duration: 30,
        refills: 3
      });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBeDefined();
    expect(response.body.data.status).toBe('pending');
  });

  it('should reject prescription with major drug interaction', async () => {
    // Patient already on warfarin
    await assignPatientMedication(testPatient.id, 'warfarin');

    const response = await request(app)
      .post('/api/v1/prescriptions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        patient_id: testPatient.id,
        drug_id: 'drug-aspirin',  // Conflicts with warfarin
        dose: 500,
        frequency: 'daily'
      });

    expect(response.status).toBe(400);
    expect(response.body.error.details.interactions).toBeDefined();
  });

  it('should enforce hospital scoping in list', async () => {
    // Try to list patients from different hospital
    const response = await request(app)
      .get('/api/v1/patients')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ hospital_id: 'different-hospital' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});

// Test database clearing
async function cleanupTestData() {
  await supabase
    .from('test_data')
    .delete()
    .eq('created_by_test', true);
}
```

---

**Related Documentation**:
- [DEVELOPMENT_STANDARDS.md](DEVELOPMENT_STANDARDS.md) - Code style & naming conventions
-[TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing patterns & CI/CD
- See [API_REFERENCE.md](API_REFERENCE.md) for endpoint specifications

**Technology Stack**:
- Express.js: https://expressjs.com
- Supabase: https://supabase.io
- Zod: https://zod.dev
- Vitest: https://vitest.dev
- Supertest: https://github.com/visionmedia/supertest
