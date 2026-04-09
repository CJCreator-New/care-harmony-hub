# Administrator Workflow Guide — CareSync HIMS

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**Audience**: System administrators, hospital IT staff, department managers, IT directors

---

## Table of Contents

1. [Role Overview](#role-overview)
2. [Admin Dashboard](#admin-dashboard)
3. [User Management](#user-management)
4. [Hospital Configuration](#hospital-configuration)
5. [Staff Scheduling](#staff-scheduling)
6. [Reporting & Analytics](#reporting--analytics)
7. [System Maintenance](#system-maintenance)
8. [Common Tasks](#common-tasks)

---

## Role Overview

**Primary Responsibilities**:
- Create and manage user accounts (all roles)
- Configure hospital settings and preferences
- Manage staff schedules and shift assignments
- Monitor system performance and logs
- Generate reports and dashboards
- Enforce compliance and audit trails
- Manage integrations with external systems
- Handle system backups and disaster recovery

**Permissions Held**:
- `users:create` - Create new user accounts
- `users:delete` - Deactivate/remove users
- `users:edit_role` - Assign roles to users
- `users:reset_password` - Reset user passwords
- `users:view_all` - See all users in hospital
- `hospital:configure` - Change hospital settings
- `staff:schedule` - Create and manage schedules
- `reports:generate` - Create custom reports
- `system:logs` - View audit logs
- `system:maintenance` - Perform system updates
- `integrations:manage` - Configure third-party APIs
- `backup:manage` - Manage system backups

**Cannot Do**:
- Create hospital accounts (only super-admin)
- Override RLS policies (only system architect)
- Access other hospitals' data
- Modify encryption keys
- Approve clinical decisions

---

## Admin Dashboard

### System Overview

```
Administration Portal — Tuesday, April 8, 2026, 9:00 AM

SYSTEM STATUS

Hospital: Metro Hospital (ID: hosp-123)
Current time: 9:00 AM - Operating hours
Uptime: 99.87% (SLA target: 99.9%)
Active users: 147 / 200 licensed

SERVER STATUS:
├─ API server: ✓ Online (2.45 sec avg response)
├─ Database: ✓ Healthy (89% disk usage)
├─ Realtime: ✓ Connected (5,234 subscriptions)
├─ Authentication: ✓ Running (3,401 active sessions)
└─ Backups: ✓ Recent (Last backup: 4 hrs ago)

ALERTS (3 items)
├─ ⚠️ Database disk usage: 89% (Action: Cleanup logs)
├─ 🔔 Staff schedule: 4 open shifts this week (Action: Assign)
└─ ℹ️ System update available (Action: Schedule maintenance)

QUICK ACTIONS
├─ [Create new user] - Onboard new staff
├─ [View user access] - Audit permissions
├─ [Generate report] - Hospital analytics
├─ [Manage schedules] - Staff assignment
└─ [View logs] - System audit trail

ACTIVE SESSIONS & LOGIN ATTEMPTS
├─ Doctor logins: 45 active sessions
├─ Nurse logins: 38 active sessions
├─ Pharmacy logins: 12 active sessions
├─ Admin logins: 3 active sessions
└─ Failed login attempts (last 24h): 8 (monitored)

BILLING & COMPLIANCE STATUS
├─ Outstanding claims: 34 (~$125K)
├─ Collections rate: 92.3% (target: >90%)
├─ Compliance violations: 0 in last 30 days ✓
└─ Patient complaints: 2 (resolved) ✓
```

---

## User Management

### Creating New User Account

```
HR Manager calls IT: "We're hiring a new doctor starting Monday.
Name: Dr. Lisa Wong, MD. Can you set up her account?"

Admin accesses system:

CREATE NEW USER ACCOUNT

STEP 1: PERSONAL INFORMATION

Full Name: Dr. Lisa Wong
Email: lisa.wong@metrohospital.net
Phone: (555) 234-5678
Department: Internal Medicine
Hospital: Metro Hospital (hosp-123)

Employment Info:
├─ Hire date: Monday, April 14, 2026
├─ License type: MD (Medical Doctor)
├─ License #: MD-789456
├─ License expiry: April 15, 2027
└─ Credentialing status: ✓ Verified

STEP 2: ROLE ASSIGNMENT

Role selection: [Doctor ▼]

Permissions for Doctor role:
├─ patients:view - View assigned patients
├─ patients:create - Register new patients
├─ consultations:create - Create consultations
├─ prescriptions:create - Write prescriptions
├─ lab_orders:create - Order lab tests
├─ prescriptions:approve - Approve others' scripts
├─ vitals:view - View patient vitals
└─ reports:view_patients - View patient analytics

Selected role: Doctor
[Confirm permissions]

STEP 3: DEPARTMENT/TEAM ASSIGNMENT

Department: Internal Medicine
Team: Primary Care Team A
Supervising doctor: Dr. James Lee

[Verify supervision chain]

STEP 4: CREDENTIALS & SECURITY

Email verification: lisa.wong@metrohospital.net
└─ [Send verification email]

Initial password option:
├─ Option A: Generate temporary password + send via email
├─ Option B: User creates password on first login
   
Selected: Option A

System generates temporary password: Temp#Pass2026$Wong
└─ Send email: "Your CareSync HIMS account is ready. 
               Temporary password: [sent separately]
               First login: https://...hims.metrohospital.net"

Security setup:
├─ Require 2FA on first login: Yes
├─ Enforce password change at first login: Yes
└─ Session timeout: 4 hours

STEP 5: REVIEW & CONFIRM

Summary:
├─ Name: Dr. Lisa Wong
├─ Email: lisa.wong@metrohospital.net
├─ Role: Doctor
├─ Department: Internal Medicine
├─ Permissions: 8 core doctor permissions + hospital-specific
├─ Status: Ready to activate
└─ Effective: April 14, 2026

[CREATE ACCOUNT]

System actions:
├─ Creates user record in database
├─ Assigns to hospital (hosp-123)
├─ Generates JWT signing key for user
├─ Sends welcome email with temporary password
├─ Logs creation: "User created by admin [name] at 9:15 AM"
├─ Records in audit trail (immutable)
└─ Notifies HR: "Account setup complete"

USER ACCOUNT CONFIRMATION

Email received by Dr. Wong:

Subject: Your CareSync HIMS Account is Ready

Hello Dr. Lisa Wong,

Your CareSync HIMS account has been created and is ready to use.

Hospital: Metro Hospital
Role: Doctor
Email: lisa.wong@metrohospital.net

LOGIN INSTRUCTIONS:
1. Go to: https://app.metrohospital.net/login
2. Enter email: lisa.wong@metrohospital.net
3. Enter temporary password: [sent in separate email]
4. You'll be required to:
   - Set up 2-factor authentication (2FA)
   - Create a new permanent password
   - Accept terms and conditions
5. Start using CareSync

Questions? Contact IT Support: it-support@metrohospital.net

–Admin Team

Dr. Wong on first login:
1. Enters email → temporary password
2. 2FA setup:
   ├─ Scan QR code with authenticator app
   ├─ Confirm backup codes stored securely
   └─ First login successful ✓

3. First actions:
   └─ Sets up profile, reviews patient list, explores interface
```

### Deactivating User Account (Offboarding)

```
Scenario: Dr. James Lee retiring on April 25, 2026

Admin receives notification from HR:
"Dr. Lee's last day is April 25. Need to deactivate his account."

Admin action in system:

OFFBOARDING WORKFLOW

User to deactivate: Dr. James Lee (ID: user-456)
Role: Doctor
Department: Internal Medicine
Last day: April 25, 2026

STEP 1: HANDOFF CHECKLIST

Before deactivation, ensure:
├─ ✓ All prescribed patients assigned to new doctor
├─ ✓ All pending consultations closed or reassigned
├─ ✓ Lab orders completed or reassigned
├─ ✓ Clinical notes finalized
└─ ✓ Device/credentials collected from employee

Handoff process:
├─ Dr. Lee's patients: 23 active patients
├─ Assign to: Dr. Sarah Chen (taking over his practice)
├─ Consultation in progress: 2 (reassigned to Dr. Chen)
├─ Lab orders pending results: 3 (reassigned)
└─ [Confirm all handoffs done before deactivating]

STEP 2: DATA PRESERVATION

Before deactivating, system preserves:
├─ All clinical notes written by Dr. Lee (immutable, cannot delete)
├─ All prescriptions authored (permanently recorded)
├─ All consultations (archived with full history)
├─ All audit trail records (permanent)
└─ Login history (preserved for compliance)

STEP 3: PERMISSION REVOCATION

Admin clicks: [DEACTIVATE USER]

System removes permissions:
├─ Revokes at: April 25, 2026, 5:00 PM (end of shift)
├─ Token invalidation: All active sessions ended
├─ API key: Deactivated
├─ 2FA: Disabled
├─ Password reset: Not allowed (account locked)
└─ Login access: Denied

STEP 4: SYSTEM ACCESS REMOVAL

Disable access to:
├─ Electronic Health Records (EHR) access denied at 5:01 PM
├─ Prescription writing privileges ended
├─ Lab order creation disabled
├─ Consultation creation disabled
├─ Database access revoked
└─ VPN access removed

STEP 5: ACCOUNT STATUS

Account status changed to: INACTIVE (not deleted)

Reasoning:
├─ Cannot delete user (breaks audit trail integrity)
├─ Clinical notes must remain attributed to original author
├─ Historical data must remain queryable
├─ Compliance/regulatory requirement (HIPAA, state law)

Account cannot be reactivated for:
├─ Same person (would create continuity issues)
├─ Different role (separate account needed)
├─ Different hospital (separate account needed)

DEACTIVATION LOG

System records:
├─ User: Dr. James Lee (ID: user-456)
├─ Deactivated by: Admin [Name]
├─ Deactivation time: April 25, 2026, 5:00 PM
├─ Reason: Retirement / End of employment
├─ Patient handoff: Completed to Dr. Sarah Chen
├─ Data preserved: Yes (all notes, orders, history)
├─ Login access: Permanently revoked
└─ Status: INACTIVE (permanent unless rehire scenario)
```

### Password Reset

```
Scenario: Dr. Wong forgot her password

Dr. Wong goes to login page:

LOGIN SCREEN

Email: lisa.wong@metrohospital.net
Password: [forgot password]
[FORGOT PASSWORD?] link

Dr. Wong clicks: [FORGOT PASSWORD?]

FORGOT PASSWORD FLOW

Email address: lisa.wong@metrohospital.net
[SEND RESET LINK]

Email received:

Subject: Reset Your CareSync Password

Hello Dr. Lisa Wong,

We received a request to reset your password.

[RESET PASSWORD] (link valid for 1 hour)

If you didn't request this, ignore this email.

---

Dr. Wong clicks link → Opens reset page (good for 1 hour):

RESET PASSWORD FORM

Old password: [required to confirm identity]
New password: [minimum 12 characters, complexity required]
Confirm password: [re-enter new password]

Password requirements:
├─ Min 12 characters
├─ Upper & lowercase letters
├─ Numbers & special characters
└─ Not previously used (history tracked)

Example: NewP@ss2026Lang

[RESET PASSWORD]

System validates:
├─ ✓ Email confirmed
├─ ✓ Reset token valid & not expired
├─ ✓ Old password correct (option 1: self-service)
├─ ✓ New password meets complexity
└─ ✓ Password changed successfully

Dr. Wong notified: "Password updated successfully.
                   You can now log in."

ADMIN-INITIATED PASSWORD RESET (User locked out)

Scenario: Dr. Wong completely locked out, can't reset herself

Dr. Wong calls: "I can't access my account"

Admin action:
1. Verify user identity (confirm employment, security question)
2. Generate temporary password
3. Send to verified email address
4. User logs in with temp password
5. Forced to set new permanent password on first login
6. Access restored
```

---

## Hospital Configuration

### System Settings

```
HOSPITAL CONFIGURATION PANEL

Hospital: Metro Hospital (ID: hosp-123)
Admin: Configure settings for entire hospital

GENERAL SETTINGS

Hospital name: Metro Hospital
Location: 123 Main Street, Citytown, ST 12345
Timezone: Eastern Time (ET)
Language: English (US)
Currency: USD ($)

[Save settings]

OPERATIONAL SETTINGS

Operating hours:
├─ Monday-Friday: 7:00 AM - 6:00 PM
├─ Saturday: 8:00 AM - 2:00 PM
└─ Sunday: Closed

Holidays (no scheduling):
├─ New Year: Jan 1
├─ Thanksgiving: Nov 28
├─ Christmas: Dec 25
└─ [Add more holidays]

APPOINTMENT SETTINGS

Appointment slot duration: 30 minutes
Advance booking window: 30 days ahead
Cancellation window: 24 hours before
No-show threshold: 2 no-shows = patient warning

[Save settings]

CLINICAL SETTINGS

Default vital sign ranges:
├─ Body temperature: 36.1-37.2°C (normal)
├─ Heart rate: 60-100 bpm
├─ Respiratory rate: 12-20 per minute
├─ Blood pressure: <120/80 mmHg
└─ Oxygen saturation: >95%

Alert thresholds:
├─ Fever: >38.5°C (trigger alert)
├─ Severe hypertension: >180/120 (escalate)
├─ Hypoxia: <90% O2 (escalate)
└─ [Customize by department]

[Save settings]

BILLING SETTINGS

Default insurance plans:
├─ Plan A: Co-pay $25 per visit
├─ Plan B: Co-pay $50 per visit
├─ Plan C: Deductible $500/year
└─ Uninsured: Self-pay (discount 10%)

Tax rate: 8.5%
Currency: USD

[Save settings]

SECURITY SETTINGS

Session timeout: 4 hours (after 4 hours inactive, logout)
Password policy:
├─ Min length: 12 characters
├─ Complexity: Uppercase, lowercase, number, symbol required
├─ Expiry: 90 days (must change)
└─ History: Cannot reuse last 5 passwords

2FA enforcement:
├─ Required for: All users
├─ Method: TOTP (authenticator app) or SMS
└─ Backup codes: 10 generated per user

[Save settings]
```

---

## Staff Scheduling

### Weekly Schedule Management

```
STAFF SCHEDULING

Week: April 14-20, 2026
Department: Internal Medicine
Current team: 8 doctors, 12 nurses, 4 receptionists

WEEKLY SCHEDULE VIEW

Monday, April 14:
  Doctors:      Dr. James Lee, Dr. Sarah Chen, Dr. Michael Wong
  Nurses:       Jane (6am-2pm), Tom (2pm-10pm), Sarah (10pm-6am)
  Reception:    Alice (8am-5pm), Bob (9am-6pm)
  Pharmacy:     Susan, Robert (8am-5pm)

Tuesday, April 15:
  [Similar format]

...

Friday, April 18:
  Doctors:      Dr. Lisa Wong (NEW), Dr. James Lee, Dr. Sarah Chen
  Nurses:       Jane, Tom, Susan, Jessica  
  Reception:    [2 staff scheduled]
  Pharmacy:     [Coverage OK]

OPEN SHIFTS (Alert: Need to fill)
├─ Friday evening shift (2pm-10pm): Nurse needed
├─ Saturday (Partial): Receptionist needed for front desk
└─ [3 other open shifts]

SCHEDULE CREATION

Admin clicks: [Create Weekly Schedule]

1. Set coverage requirements:
   ├─ Doctors: Minimum 2 per shift
   ├─ Nurses: Minimum 3 per shift
   ├─ Receptionists: Minimum 2 per shift
   └─ Pharmacists: Minimum 1 per operating hour

2. Assign staff to shifts:
   ├─ Drag Dr. Lisa Wong to Monday 9am-5pm
   ├─ Assign Jane to Tuesday morning (6am-2pm)
   ├─ Assign Tom to night shift Thursday (10pm-6am)
   └─ [Fill all required positions]

3. Conflict checking:
   ├─ Check: No double-booking (same staff in 2 places)
   ├─ Check: Max hours per week (40-50 hours typical for full-time)
   ├─ Check: Minimum rest (8 hours between shifts)
   └─ Check: Supervisor coverage rules

4. Staff availability:
   ├─ Jane: Can't work Friday (pre-approved leave)
   ├─ Tom: Prefers evenings (marked as preference)
   ├─ Dr. Lee: Max 10 patients per day (workload limit)
   ├─ Dr. Wong: New hire, limit to 5 patients first week
   └─ [Other constraints]

5. Publish schedule:
   └─ [PUBLISH TO STAFF]

   System notifications:
   ├─ Each staff member sees their schedule (app notification)
   ├─ Changed shifts flagged
   ├─ Conflicts flagged to staff for resolution
   └─ Email sent with final schedule

SCHEDULE CONFLICT EXAMPLE

Conflict detected: Jane scheduled Friday evening, but marked as leave

System warning:
"Error: Jane marked unavailable (pre-approved leave) but 
 scheduled for Friday 2pm-10pm. Remove from schedule or 
 cancel leave approval."

Admin action:
├─ Option A: Assign different staff to Friday evening
├─ Option B: Cancel Jane's leave if emergency coverage needed
└─ Selected: Option A → Assign Tom to Friday evening
```

---

## Reporting & Analytics

### Dashboard Reports

```
ANALYTICS & REPORTING PORTAL

Hospital: Metro Hospital
Time period: April 1-8, 2026 (Week 1 of April)

EXECUTIVE DASHBOARD

PATIENT METRICS
├─ New patients this week: 156
├─ Total active patients: 3,847
├─ Return visit rate: 68% (good)
├─ Average patient satisfaction: 4.6/5.0 stars ✓
└─ No-show rate: 3.2% (acceptable)

FINANCIAL METRICS
├─ Revenue this week: $127,400
├─ Average billing per visit: $285
├─ Collections rate: 92.3% (target >90%) ✓
├─ Outstanding claims: 34 (~$42,500)
├─ Days in accounts receivable: 34 days
└─ Net revenue (after costs): $89,320

CLINICAL METRICS
├─ Total consultations: 412
├─ Average consultation time: 18 minutes
├─ Prescription volume: 568 filled
├─ Lab orders completed: 203
├─ Critical alerts: 2 processed (both escalated appropriately)
└─ Patient readmission rate (30-day): 1.2% (excellent)

STAFFING METRICS
├─ Staff utilization: 87% (doctors), 91% (nurses), 80% (admin)
├─ Sick leave used: 3.4% of scheduled hours
├─ Overtime hours: 24 hours (over-time cost: $1,440)
├─ New hires this month: 2 (Dr. Lisa Wong, Nurse Maria)
└─ Staff satisfaction survey: 4.2/5.0 (April data pending)

CUSTOM REPORT: DOCTOR PERFORMANCE

Doctor: Dr. Sarah Chen
Period: April 1-8, 2026

Performance metrics:
├─ Patient consultations: 67
├─ Average satisfaction: 4.8/5.0 ⭐⭐⭐⭐⭐
├─ Prescriptions written: 89
├─ Lab orders created: 34
├─ Average consultation time: 17 minutes
├─ Referrals made: 4 (to specialists)
├─ Follow-up appointment requests: 12
└─ Patient outcome: 96% improved or stable (2% declined)

Billing analytics:
├─ Total billings: $18,520
├─ Collections: $17,450 (94.2% collection rate)
├─ Standing charges: $1,070 (not yet collected)
└─ Average charge per patient: $276

Comparison to hospital average:
├─ Consultations: 67 vs avg 51 (↑ 31% above average)
├─ Patient satisfaction: 4.8 vs avg 4.6 (↑ above average)
├─ Collection rate: 94.2% vs avg 92.3% (↑ above average)
└─ Overall: Dr. Chen is top performer this week

[Export report to PDF] [Email report] [Print]
```

---

## System Maintenance

### Database Maintenance & Backups

```
SYSTEM MAINTENANCE PANEL

Current status: Normal operations

DATABASE MAINTENANCE

Last full backup: Today, 4:00 AM  
Last incremental backup: Today, 8:00 AM (automated every 4 hours)
Next scheduled backup: Today, 12:00 PM

Backup status:
├─ Database size: 125 GB
├─ Compressed backup: 28 GB
├─ Storage available: 500 GB (89% used)
├─ Retention: 30 days rolling backup
└─ Recovery test: Passed 3/15/2026 ✓

Backup schedule:
├─ Full backup: Daily at 4:00 AM (off-peak)
├─ Incremental: Every 4 hours during day
├─ Retention: 30-day rolling window
├─ Geo-redundancy: Yes (backup stored in 2 locations)
└─ Recovery RTO: <4 hours, RPO: <1 hour

DISK MANAGEMENT

Database disk usage: 89% utilized
Storage alert threshold: >85% (currently triggered)

Action needed:
├─ Archive old patient records
├─ Delete old log files (>90 days)
├─ Compress lab result images
└─ [CLEAN UP DISK] (safe to run during low-traffic period)

Disk cleanup estimate:
├─ Old logs: ~15 GB recoverable
├─ Archives: ~12 GB (move to cold storage)
├─ Compressed images: ~8 GB recoverable
└─ Total: ~35 GB freed (bringing disk to 75% used)

[SCHEDULE CLEANUP TASK] - Run: Tonight 2:00 AM

LOG MANAGEMENT

System logs size: 18 GB (last 30 days)
⚠️ Alert: Logs growing faster than expected

Log rotation policy:
├─ Keep: 30 days active logs
├─ Archive: 30-90 days (move to cold storage)
├─ Delete: >90 days (unless compliance requires longer retention)
└─ Compression: Gzip compression on archived logs

Delete old logs older than 90 days?
├─ Records to delete: ~8 GB of logs
├─ Compliance check: HIPAA requires 7-year retention for clinical records
│  (But operational logs >90 days OK to delete)
└─ [APPROVE DELETION]

SECURITY UPDATES

Available updates:
├─ OS patches: 3 available (security priority)
├─ Database patches: 2 available (important)
├─ Application patches: 1 available (routine)
└─ SSL certificate: Expires in 45 days (renew soon)

Update schedule:
├─ Critical security patches: Deploy within 24 hours
├─ Important patches: Deploy within 1 week
├─ Routine patches: Deploy monthly (next scheduled: May 1)

Maintenance window needed:
├─ Estimated downtime: 45 minutes
├─ Scheduled: Saturday 2:00 AM (low-traffic)
├─ Notification: Staff notified Friday
└─ Rollback: Test completed, verified safe

[SCHEDULE UPDATE] - Saturday 2:00 AM
```

---

## Common Tasks

### Task: Audit Login Access for Compliance

```
Compliance requirement: Review who accessed patient data for
patient John Smith during his hospitalization.

Regulation: HIPAA requires identifying all access to specific
patient records for audit purposes.

Admin action:

PATIENT ACCESS AUDIT REPORT

Patient: John Smith (ID: hosp-123-pat-999)
Date range: April 1-6, 2026 (hospitalization period)

[GENERATE AUDIT REPORT]

System returns:

COMPREHENSIVE ACCESS LOG

Patient: John Smith
Medical record #: MR-045789
Hospitalization: April 1-6, 2026

All accesses to patient record:

Monday, April 1:
├─ 8:15 AM - Dr. Sarah Chen (doctor) - Viewed entire record
├─ 8:20 AM - Jane (nurse) - Viewed vitals, entered readings
├─ 8:45 AM - Dr. Lee (supervisor) - Reviewed consultation note
├─ 2:30 PM - Susan (pharmacist) - Viewed medications
└─ 3:00 PM - Admin (IT) - System maintenance access

Tuesday, April 2:
├─ 7:00 AM - Jane (nurse) - Updated vital signs
├─ 9:15 AM - Dr. Sarah Chen - Reviewed lab results
├─ 1:45 PM - Tom (IT support) - Patient portal access test
│  (Note: No actual data changed, IT testing only)
└─ 4:30 PM - Billing staff - Reviewed insurance info

[Continue through discharge...]

COMPLIANCE FINDINGS

Total accesses: 24 over 6-day hospitalization

Categorized by role:
├─ Clinical (doctors, nurses): 14 accesses ✓ (expected)
├─ Pharmacy: 2 accesses ✓ (expected)
├─ Billing: 2 accesses ✓ (expected)
├─ Administrative: 6 accesses (need to evaluate)
└─ IT Support: 1 access (test environment)

Red flags identified: None

Unusual access?
├─ Tom (IT) on April 2 - Note: System testing (documented, approved)
├─ Admin access (6 times) - Note: Routine maintenance tasks
└─ Result: All accesses documented, justified, within policy

Conclusion: ✓ Compliant - All accesses documented, justified, 
           and within expected range for hospitalized patient.

Report generated: April 8, 2026, 10:30 AM
Audit trail: Immutable (cannot be modified)
```

### Task: Revoke Permissions from Doctor (Scope Decrease)

```
Scenario: Dr. James Lee had some disciplinary action.
The hospital restricts his ability to approve other doctors' prescriptions.

Admin needs to remove 1 permission: `prescriptions:approve`

But continue allowing him: patient consultations, prescriptions for own patients,
etc.

Admin action:

MODIFY USER PERMISSIONS

User: Dr. James Lee (ID: user-456)
Current role: Doctor

Current permissions:
├─ patients:view ✓
├─ patients:create ✓
├─ consultations:create ✓
├─ prescriptions:create ✓
├─ lab_orders:create ✓
├─ prescriptions:approve ✓ (to be revoked)
└─ vitals:view ✓

[EDIT PERMISSIONS]

PERMISSION MODIFICATION FORM

Permissions to modify:

☑ patients:view - Keep enabled
☑ patients:create - Keep enabled
☑ consultations:create - Keep enabled
☑ prescriptions:create - Keep enabled
☑ lab_orders:create - Keep enabled
☐ prescriptions:approve - DISABLE (uncheck)
☑ vitals:view - Keep enabled

Reason for modification (required):
"Disciplinary action on 4/7/2026 - Cannot approve other 
 doctors' prescriptions pending peer review completion. 
 Can still prescribe for own patients."

Effective date: April 8, 2026
Supervisor approval: Dr. Medical Director (recorded)

[SAVE CHANGES]

System updates:
├─ Permission revoked timestamp: April 8, 2026, 10:32 AM
├─ Audit log: "User admin-name removed prescriptions:approve 
   permission from Dr. James Lee. Reason: Disciplinary action."
├─ Effective: Immediate (Dr. Lee can no longer approve scripts)
├─ System behavior: Any attempt to approve prescription now denied
└─ Notification: Dr. Lee notified of permission change?
   [NO - maintains confidentiality during disciplinary process]

Next, admin schedules peer review completion date:
├─ Peer review due: April 30, 2026
├─ System reminder: Calendar alert set
├─ Upon completion: Can restore permission if approved
└─ Document: Stored in personnel file
```

---

**Key Contacts**:
- System Architect: For RLS policy modifications
- Database Administrator: For emergency database issues
- Security Officer: For access control reviews
- Hospital Director: For major policy changes

**Related Documentation**:
- [SYSTEM_ARCHITECTURE.md](../product/SYSTEM_ARCHITECTURE.md) - For user role hierarchy
- [RBAC_PERMISSIONS.md](../product/RBAC_PERMISSIONS.md) - For complete permissions reference
- See [API_REFERENCE.md](../product/API_REFERENCE.md) for API user management endpoints
