# CareSync HIMS — Role Assignment Guide

This document describes how to assign and manage user roles in CareSync.

## Available Roles

| Role | Description |
|---|---|
| `admin` | Full system access; manages staff and hospital settings |
| `doctor` | Consultations, prescriptions, lab orders |
| `nurse` | Triage, vital signs, patient queue management |
| `pharmacist` | Prescription dispensing, drug inventory |
| `lab_technician` | Lab order processing and result entry |
| `receptionist` | Patient registration, appointment booking, billing |
| `patient` | Self-service portal access |

## Assigning a Role

1. Log in as an **admin**.
2. Navigate to **Staff Management** → **Invite Staff**.
3. Enter the staff member's email and select their role.
4. The staff member receives an invitation email with a setup link.

## Role Permissions Matrix

Permissions are enforced via the `ROLE_PERMISSIONS` map in `src/types/rbac.ts` and Supabase RLS policies. Each permission follows the format `<resource>:<action>` (e.g., `consultation:write`).

## Changing a Role

1. Navigate to **Staff Management** → **Active Staff**.
2. Find the staff member and click **Edit Role**.
3. Select the new role and confirm.

> **Note:** Role changes take effect on the user's next login session.

## Multi-Role Users

A user may be assigned at most one primary role. Contact a system administrator to adjust.
