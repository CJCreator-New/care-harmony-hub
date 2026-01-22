# Role Assignment User Guide

## Quick Start: Adding Staff Members

### Method 1: Admin Role Setup Page (During Hospital Setup)

1. **Navigate to Staff Assignment**
   - Go to Admin Dashboard → Step 3: Assign Staff Roles
   - Or access directly: `/hospital/admin-role-setup`

2. **Add Staff Member**
   - Click "Add Staff" button
   - Enter staff details:
     - First Name
     - Last Name
     - Email Address
     - Select Role (Administrator, Doctor, Nurse, Receptionist, Pharmacist, Lab Technician)

3. **Review & Send**
   - Review the pending staff list
   - Click "Send Invitations & Continue"
   - Staff will receive email invitations

### Method 2: Staff Onboarding Wizard (Anytime)

1. **Open Wizard**
   - Click "Invite Staff Member" button in Admin Dashboard
   - Or use: `StaffOnboardingWizard` component

2. **Complete 3-Step Process**
   
   **Step 1: Basic Information**
   - Enter First Name
   - Enter Last Name
   - Enter Email Address
   - Click "Next"

   **Step 2: Role Selection**
   - Select one or multiple roles
   - Click role cards to toggle selection
   - View permissions for each role
   - Click "Next"

   **Step 3: Review & Confirm**
   - Review staff details
   - Confirm assigned roles
   - Check permissions summary
   - Click "Send Invitation"

3. **Confirmation**
   - Success message shows number of roles assigned
   - Staff receives email with invitation link

---

## Role Descriptions

| Role | Responsibilities | Key Permissions |
|------|------------------|-----------------|
| **Administrator** | System management, staff oversight, settings | Full system access, manage staff, system settings |
| **Doctor** | Patient consultations, prescriptions, lab orders | View patients, create consultations, order labs |
| **Nurse** | Patient care, vitals, triage | Record vitals, assist consultations, patient prep |
| **Receptionist** | Front desk, appointments, check-in | Register patients, schedule appointments, billing |
| **Pharmacist** | Medication dispensing, inventory | View prescriptions, dispense meds, manage inventory |
| **Lab Technician** | Lab tests, sample collection, results | Process orders, enter results, sample tracking |

---

## Validation Rules

### Email Requirements
- Must be valid email format (example@domain.com)
- Cannot be duplicated in pending staff list
- Case-insensitive duplicate check

### Name Requirements
- First Name: Required, non-empty
- Last Name: Required, non-empty

### Role Requirements
- At least one role must be selected
- Multiple roles can be assigned to one staff member

---

## Common Tasks

### ✅ Add a Doctor
1. Click "Add Staff"
2. Enter name and email
3. Select "Doctor" role
4. Click "Add Staff Member"
5. Click "Send Invitations & Continue"

### ✅ Add Multiple Roles to One Person
1. Open "Invite Staff Member" wizard
2. Enter basic info (Step 1)
3. Select multiple roles (Step 2) - click each role card
4. Review permissions (Step 3)
5. Send invitation

### ✅ Remove Staff from Pending List
1. Find staff member in pending list
2. Click trash icon
3. Staff member removed (can re-add later)

### ✅ Resend Invitation
1. If staff didn't receive email, use wizard again
2. Enter same email address
3. System will create new invitation
4. Staff receives new email

---

## Troubleshooting

### "Invalid Email" Error
**Problem**: Email format not recognized  
**Solution**: Check email format - should be `name@domain.com`

### "Duplicate Email" Error
**Problem**: Email already in pending list  
**Solution**: Use different email or remove existing entry first

### "Missing Fields" Error
**Problem**: One or more required fields empty  
**Solution**: Fill in First Name, Last Name, and Email

### "No Roles Selected" Error
**Problem**: Didn't select any role in Step 2  
**Solution**: Click at least one role card to select it

### Staff Didn't Receive Email
**Problem**: Invitation email not arriving  
**Solution**: 
1. Check spam/junk folder
2. Verify email address is correct
3. Resend invitation using wizard

---

## After Staff Joins

Once staff member accepts invitation and creates account:

1. **Account Created**: Staff can login with their credentials
2. **Roles Activated**: All assigned roles become active
3. **Permissions Granted**: Staff can access role-specific features
4. **Dashboard Available**: Staff sees role-appropriate dashboard

---

## Best Practices

✅ **Do**
- Verify email addresses before sending invitations
- Assign appropriate roles based on job function
- Use multiple roles for staff with cross-functional duties
- Keep staff list updated

❌ **Don't**
- Assign admin role to non-administrative staff
- Use test/temporary email addresses
- Forget to send invitations after adding staff
- Assign roles without understanding permissions

---

## Support

For issues or questions:
1. Check this guide's troubleshooting section
2. Contact your system administrator
3. Review role permissions documentation

---

**Last Updated**: January 22, 2026  
**Version**: 1.0
