# CareSync HIMS — Feature Overview

## Core Clinical Features

### AI Clinical Support
AI-powered clinical decision support including differential diagnosis suggestions, drug interaction checks, and evidence-based treatment recommendations integrated directly into the consultation workflow.

### Real-time Notifications
Event-driven notification system that broadcasts alerts across roles in real time. Nurses, doctors, pharmacists, and lab technicians receive instant updates when patient status changes, lab results arrive, or prescriptions are ready.

### Role-based Access Control
Fine-grained RBAC enforces what each staff member can see and do. Permissions are scoped per role (admin, doctor, nurse, pharmacist, lab_technician, receptionist, patient) and enforced via Supabase RLS policies and the `usePermissions` hook.

## Patient Management

- Patient registration with MRN auto-generation
- HIPAA-compliant PHI encryption for sensitive fields
- Consent record tracking
- Full audit trail for every data change

## Appointment & Queue Management

- Smart scheduler with conflict detection
- Walk-in queue with real-time status updates
- Automated reminder notifications

## Clinical Workflow

- Electronic consultation notes with SOAP structure
- Vital signs recording and trending
- Prescription creation and pharmacist dispensing
- Lab order lifecycle from ordering to result delivery

## Billing & Finance

- Invoice generation with itemized line items
- Payment recording and partial payment support
- Insurance claim tracking

## Pharmacy & Inventory

- Prescription queue for pharmacist review
- Drug inventory management with low-stock alerts
- Dispensing records tied to patient visits

## Laboratory

- Lab order management with priority flags
- Sample collection tracking
- Critical result flagging with instant notifications

## Administration

- Staff management and role assignment
- Hospital-scoped data isolation (multi-tenancy)
- Comprehensive audit logs and activity tracking
- Telemedicine consultation support
