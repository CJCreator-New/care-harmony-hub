# Admin Page Development Plan
## Enhanced RBAC & Role-Specific Access System

**Version**: 1.0  
**Date**: January 2026  
**Focus**: Admin-only features with streamlined RBAC

---

## 1. Executive Summary

This plan focuses exclusively on admin functionality, removes non-admin content, implements a completely reworked RBAC system, and establishes separate login credentials with clearly defined roles.

### Key Objectives
- ✅ Admin-only dashboard and analytics
- ✅ Enhanced role-based access control (RBAC)
- ✅ Separate login credentials per role
- ✅ Clear role definitions and permissions
- ✅ Streamlined admin workflows

---

## 2. Enhanced RBAC System Architecture

### 2.1 Role Hierarchy

```
┌─────────────────────────────────────────┐
│         SUPER ADMIN (Level 5)           │
│  - Full system access                   │
│  - User management                      │
│  - System configuration                 │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│         ADMIN (Level 4)                 │
│  - Hospital operations                  │
│  - Analytics & reporting                │
│  - Staff management                     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│      DEPARTMENT HEAD (Level 3)          │
│  - Department analytics                 │
│  - Team performance                     │
│  - Resource allocation                  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│      CLINICAL STAFF (Level 2)           │
│  - Patient care                         │
│  - Clinical workflows                   │
│  - Documentation                        │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│         PATIENT (Level 1)               │
│  - Personal health records              │
│  - Appointments                         │
│  - Portal access                        │
└─────────────────────────────────────────┘
```

### 2.2 Role Definitions

#### Super Admin
**Login**: `superadmin@hospital.com`  
**Permissions**:
- Full system access
- Create/delete users
- Modify system settings
- Access all data
- Audit log access
- Security configuration

#### Admin
**Login**: `admin@hospital.com`  
**Permissions**:
- Hospital operations dashboard
- Analytics and reporting
- Staff management (non-admin)
- Department management
- Billing oversight
- Inventory management

#### Department Head (Doctor/Nurse/Pharmacy/Lab)
**Login**: `head.{department}@hospital.com`  
**Permissions**:
- Department-specific analytics
- Team performance metrics
- Resource requests
- Schedule management
- Quality metrics

#### Clinical Staff (Doctor/Nurse/Pharmacist/Lab Tech)
**Login**: `{role}.{name}@hospital.com`  
**Permissions**:
- Patient care workflows
- Clinical documentation
- Department resources
- Personal schedule

#### Receptionist
**Login**: `reception.{name}@hospital.com`  
**Permissions**:
- Patient registration
- Appointment scheduling
- Check-in/check-out
- Basic patient info

#### Patient
**Login**: `patient.{id}@portal.com`  
**Permissions**:
- Personal health records
- Appointment booking
- Prescription refills
- Lab results viewing

---

## 3. Admin Dashboard Components

### 3.1 Core Admin Features (Admin Only)

```typescript
// Admin Dashboard Structure
interface AdminDashboard {
  analytics: AnalyticsDashboard;
  userManagement: UserManagement;
  systemSettings: SystemSettings;
  auditLogs: AuditLogs;
  reports: ReportingSystem;
}

// Analytics Dashboard
interface AnalyticsDashboard {
  realTimeMetrics: {
    activeUsers: number;
    patientThroughput: number;
    systemLoad: number;
    errorRate: number;
  };
  financialMetrics: {
    dailyRevenue: number;
    pendingBills: number;
    insuranceClaims: number;
  };
  operationalMetrics: {
    bedOccupancy: number;
    staffUtilization: number;
    avgWaitTime: number;
  };
  qualityMetrics: {
    patientSatisfaction: number;
    errorRate: number;
    complianceScore: number;
  };
}
```

### 3.2 User Management (Admin Only)

```typescript
interface UserManagement {
  createUser: (userData: UserData) => Promise<User>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  assignRole: (userId: string, role: Role) => Promise<void>;
  managePermissions: (userId: string, permissions: Permission[]) => Promise<void>;
  resetPassword: (userId: string) => Promise<void>;
  suspendUser: (userId: string, reason: string) => Promise<void>;
}

interface UserData {
  email: string;
  role: 'super_admin' | 'admin' | 'dept_head' | 'doctor' | 'nurse' | 'pharmacist' | 'lab_tech' | 'receptionist' | 'patient';
  department?: string;
  permissions: Permission[];
  credentials: {
    temporaryPassword: string;
    mustChangePassword: boolean;
  };
}
```

---

## 4. Enhanced RBAC Implementation

### 4.1 Permission System

```typescript
// Permission Structure
enum Permission {
  // System Administration
  SYSTEM_FULL_ACCESS = 'system:*',
  SYSTEM_SETTINGS = 'system:settings',
  SYSTEM_AUDIT = 'system:audit',
  
  // User Management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_ASSIGN_ROLE = 'user:assign_role',
  
  // Analytics
  ANALYTICS_VIEW_ALL = 'analytics:view:all',
  ANALYTICS_VIEW_DEPT = 'analytics:view:department',
  ANALYTICS_EXPORT = 'analytics:export',
  
  // Patient Management
  PATIENT_CREATE = 'patient:create',
  PATIENT_READ_ALL = 'patient:read:all',
  PATIENT_READ_OWN = 'patient:read:own',
  PATIENT_UPDATE = 'patient:update',
  PATIENT_DELETE = 'patient:delete',
  
  // Clinical Operations
  CONSULTATION_CREATE = 'consultation:create',
  CONSULTATION_READ = 'consultation:read',
  PRESCRIPTION_CREATE = 'prescription:create',
  LAB_ORDER_CREATE = 'lab:order:create',
  
  // Financial
  BILLING_VIEW_ALL = 'billing:view:all',
  BILLING_CREATE = 'billing:create',
  BILLING_APPROVE = 'billing:approve',
  
  // Reporting
  REPORT_VIEW = 'report:view',
  REPORT_EXPORT = 'report:export',
  REPORT_SCHEDULE = 'report:schedule',
}

// Role-Permission Mapping
const rolePermissions: Record<string, Permission[]> = {
  super_admin: [Permission.SYSTEM_FULL_ACCESS],
  
  admin: [
    Permission.ANALYTICS_VIEW_ALL,
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.PATIENT_READ_ALL,
    Permission.BILLING_VIEW_ALL,
    Permission.BILLING_APPROVE,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.REPORT_SCHEDULE,
  ],
  
  dept_head: [
    Permission.ANALYTICS_VIEW_DEPT,
    Permission.USER_READ,
    Permission.PATIENT_READ_ALL,
    Permission.REPORT_VIEW,
  ],
  
  doctor: [
    Permission.PATIENT_READ_ALL,
    Permission.CONSULTATION_CREATE,
    Permission.PRESCRIPTION_CREATE,
    Permission.LAB_ORDER_CREATE,
  ],
  
  nurse: [
    Permission.PATIENT_READ_ALL,
    Permission.CONSULTATION_READ,
  ],
  
  pharmacist: [
    Permission.PATIENT_READ_OWN,
    Permission.PRESCRIPTION_CREATE,
  ],
  
  lab_tech: [
    Permission.PATIENT_READ_OWN,
    Permission.LAB_ORDER_CREATE,
  ],
  
  receptionist: [
    Permission.PATIENT_CREATE,
    Permission.PATIENT_READ_ALL,
    Permission.PATIENT_UPDATE,
  ],
  
  patient: [
    Permission.PATIENT_READ_OWN,
  ],
};
```

### 4.2 RBAC Middleware

```typescript
// Permission Check Middleware
export const checkPermission = (requiredPermission: Permission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userPermissions = rolePermissions[user.role] || [];
    
    // Check for full access
    if (userPermissions.includes(Permission.SYSTEM_FULL_ACCESS)) {
      return next();
    }
    
    // Check specific permission
    if (userPermissions.includes(requiredPermission)) {
      return next();
    }
    
    // Log unauthorized access attempt
    await logAuditEvent({
      userId: user.id,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      resource: requiredPermission,
      timestamp: new Date(),
    });
    
    return res.status(403).json({ error: 'Forbidden' });
  };
};

// Route Protection Example
app.get('/api/admin/analytics', 
  authenticate,
  checkPermission(Permission.ANALYTICS_VIEW_ALL),
  getAnalytics
);
```

---

## 5. Separate Login System

### 5.1 Login Credentials Structure

```typescript
interface LoginCredentials {
  email: string;
  password: string;
  role: string; // Used for routing after login
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: string;
    permissions: Permission[];
  };
  token: string;
  redirectUrl: string; // Role-specific dashboard
}

// Role-specific redirect URLs
const roleRedirects: Record<string, string> = {
  super_admin: '/admin/system',
  admin: '/admin/dashboard',
  dept_head: '/department/dashboard',
  doctor: '/clinical/consultations',
  nurse: '/clinical/patients',
  pharmacist: '/pharmacy/queue',
  lab_tech: '/laboratory/orders',
  receptionist: '/reception/checkin',
  patient: '/patient/portal',
};
```

### 5.2 Authentication Flow

```typescript
// Login Service
export const loginService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // 1. Validate credentials
    const user = await validateCredentials(credentials);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // 2. Check if user is active
    if (user.status !== 'active') {
      throw new Error('Account is suspended');
    }
    
    // 3. Get user permissions
    const permissions = rolePermissions[user.role];
    
    // 4. Generate JWT token
    const token = generateToken({
      userId: user.id,
      role: user.role,
      permissions,
    });
    
    // 5. Log login event
    await logAuditEvent({
      userId: user.id,
      action: 'LOGIN',
      timestamp: new Date(),
    });
    
    // 6. Return auth response with role-specific redirect
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions,
      },
      token,
      redirectUrl: roleRedirects[user.role],
    };
  },
};
```

---

## 6. Admin-Only Features

### 6.1 System Analytics Dashboard

```typescript
// Admin Analytics Component
export const AdminAnalyticsDashboard = () => {
  return (
    <div className="admin-dashboard">
      {/* Real-time Metrics */}
      <MetricsGrid>
        <MetricCard title="Active Users" value={activeUsers} />
        <MetricCard title="Patient Throughput" value={throughput} />
        <MetricCard title="System Load" value={systemLoad} />
        <MetricCard title="Error Rate" value={errorRate} />
      </MetricsGrid>
      
      {/* Financial Overview */}
      <FinancialDashboard>
        <RevenueChart data={revenueData} />
        <BillingQueue items={pendingBills} />
        <InsuranceClaims claims={claims} />
      </FinancialDashboard>
      
      {/* Operational Metrics */}
      <OperationalDashboard>
        <BedOccupancyChart data={bedData} />
        <StaffUtilization data={staffData} />
        <WaitTimeAnalysis data={waitTimeData} />
      </OperationalDashboard>
      
      {/* Quality Metrics */}
      <QualityDashboard>
        <PatientSatisfaction score={satisfaction} />
        <ErrorRateChart data={errors} />
        <ComplianceScore score={compliance} />
      </QualityDashboard>
    </div>
  );
};
```

### 6.2 User Management Interface

```typescript
// User Management Component (Admin Only)
export const UserManagementPanel = () => {
  return (
    <div className="user-management">
      {/* User List */}
      <UserTable
        users={users}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSuspend={handleSuspend}
      />
      
      {/* Create User Form */}
      <CreateUserModal
        onSubmit={handleCreateUser}
        roles={availableRoles}
        departments={departments}
      />
      
      {/* Role Assignment */}
      <RoleAssignmentPanel
        user={selectedUser}
        onAssignRole={handleAssignRole}
        onUpdatePermissions={handleUpdatePermissions}
      />
      
      {/* Audit Log */}
      <UserAuditLog
        userId={selectedUser?.id}
        events={auditEvents}
      />
    </div>
  );
};
```

---

## 7. Database Schema for Enhanced RBAC

```sql
-- Roles Table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  level INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions Table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role Permissions Mapping
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- User Roles (Enhanced)
CREATE TABLE user_roles (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  department TEXT,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- Login Credentials (Separate from profiles)
CREATE TABLE login_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  must_change_password BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log (Enhanced)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  resource TEXT,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Session Management
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. Implementation Files

### Files to Create:

**Services**:
- `src/services/rbacService.ts` - RBAC logic
- `src/services/authService.ts` - Enhanced authentication
- `src/services/adminAnalytics.ts` - Admin analytics
- `src/services/userManagement.ts` - User CRUD operations

**Components**:
- `src/components/admin/AdminDashboard.tsx` - Main admin dashboard
- `src/components/admin/AnalyticsDashboard.tsx` - Analytics view
- `src/components/admin/UserManagement.tsx` - User management
- `src/components/admin/SystemSettings.tsx` - System configuration
- `src/components/admin/AuditLogViewer.tsx` - Audit logs

**Hooks**:
- `src/hooks/useRBAC.ts` - Permission checking
- `src/hooks/useAdminAnalytics.ts` - Analytics data
- `src/hooks/useUserManagement.ts` - User operations

**Middleware**:
- `src/middleware/rbacMiddleware.ts` - Permission checks
- `src/middleware/auditMiddleware.ts` - Audit logging

---

## 9. Implementation Timeline

| Week | Task | Status |
|------|------|--------|
| 1 | Database schema & RBAC setup | Pending |
| 2 | Authentication system | Pending |
| 3 | Admin dashboard UI | Pending |
| 4 | User management interface | Pending |
| 5 | Analytics dashboard | Pending |
| 6 | Testing & refinement | Pending |

---

**Approved By**:

Technical Lead: _________________ Date: _______  
Security Officer: _________________ Date: _______  
Project Manager: _________________ Date: _______
