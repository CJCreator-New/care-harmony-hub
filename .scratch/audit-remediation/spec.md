# Specification: CareSync HIMS Audit Remediation & Production Readiness

## Overview
This specification translates the findings from `docs/COMPREHENSIVE_AUDIT_REPORT.md` into an actionable, prioritized engineering backlog. The remediation work is structured into four distinct execution phases (P0 to P3) spanning clinical safety, security/HIPAA compliance, role-based access control (RBAC), database integrity (RLS), and DevOps quality gates.

## Core Objectives
1. **Clinical Safety & Zero Patient Harm**: Ensure all clinical decision support (CDS) features (allergy contraindication checks, drug-drug interaction alerts, pediatric dosing formulas, critical panic lab notifications) fail closed, enforce patient demographic parameters, and execute durable escalations.
2. **HIPAA Security Rule Compliance (§164.312)**: Eliminate arbitrary decryption vectors, patch cross-hospital object-level authorization (BOLA) leaks, deploy tamper-proof database audit trails, and transition from `localStorage` tokens to HttpOnly cookies.
3. **Unified Access Governance**: Eliminate discrepancies across the four divergent authorization engines (`src/types/rbac.ts`, `src/lib/permissions.ts`, `src/utils/abacManager.ts`, and per-role managers), enforce the strict separation of billing from clinical workflows (ADR-0002), and purge phantom role references (`super_admin`).
4. **DevOps & CI/CD Integrity**: Remove CI suppression flags (`|| true`), resolve 1,214 linter problems, remediate vulnerable dependencies, and scrub historical secrets from git history.

## Architecture Boundaries & ADRs
- **ADR-0001**: Supabase Native Backend (PostgreSQL 15+, RLS, Edge Functions).
- **ADR-0002**: Seven Canonical Roles and the Billing Boundary (Doctors and Nurses strictly forbidden from billing invoices).
- **ADR-0003**: Sequential Multi-Role Discharge Pipeline.
- **ADR-0004**: Strict Pharmacist-Gated Prescription Dispensing.
- **ADR-0005**: Unified Typed RBAC and Fail-Closed Clinical Safety.

## Phased Implementation Plan
- **Phase 0 (P0 - Immediate Blockers / 24-48h)**: Critical decryption oracle, allergy matching bypass, lab escalation queue, and edge function BOLA.
- **Phase 1 (P1 - Security & RLS Database Hardening / Week 1)**: Invoices RLS patch, active user verification in RLS, audit log append-only triggers, 2FA hardening, `super_admin` purge, stock checker scoping.
- **Phase 2 (P2 - CDS, Quality & RBAC Unification / Week 2)**: Frontend DDI hook integration, dynamic lab range age matching, pediatric dosing backend migration, `PharmacistRBACManager` check, unified RBAC manager, CI lint gate unmasking.
- **Phase 3 (P3 - Infrastructure, Sessions & Secrets / Weeks 3-4)**: Git secrets purge, HttpOnly cookie auth, removal of empty function stubs, regression test suites.
