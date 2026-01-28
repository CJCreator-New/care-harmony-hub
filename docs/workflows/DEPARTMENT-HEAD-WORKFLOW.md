# Department Head Workflow (2026)

## Overview
The Department Head oversees departmental staffing, approvals, quality, and performance. This workflow aligns with RBAC, hospital scoping (RLS), and the workflow automation layer.

**Back to consolidated:** [CONSOLIDATED_ROLE_WORKFLOWS.md](../CONSOLIDATED_ROLE_WORKFLOWS.md#department-head-workflow)

---

## 1. Login & Access
- Secure login (RBAC enforced), scoped to hospital and department
- Dashboard: staffing status, queue/load, SLA alerts, incident reports, role requests

## 2. Staff & Role Approvals
- Review pending role requests from department staff (submitted during Account Setup)
- Approve/decline and add notes; escalations route to System Administrator
- Ensure profiles are hospital-linked before approval

## 3. Scheduling & Coverage
- Review daily roster and appointment/queue load
- Rebalance coverage (doctor/nurse/pharmacy/lab) based on demand
- Coordinate with Reception for high-load periods and with Admin for staffing gaps

## 4. Quality & Compliance
- Monitor incident/variance reports and audit logs for the department
- Track turnaround SLAs (labs, pharmacy, consults) and initiate corrective actions
- Validate discharge completeness (instructions, follow-ups, medication reconciliation)

## 5. Operations & SLA Management
- Watch live metrics: wait times, lab TAT, prescription TAT, queue backlog
- Trigger workflow rules for escalations or task reassignments when SLAs breach
- Approve overtime/shift swaps within department policy

## 6. Collaboration & Escalations
- Communicate with Doctors/Nurses/Pharmacists/Lab Techs for bottlenecks
- Notify Reception on schedule changes and patient routing adjustments
- Escalate systemic issues to System Administrator (infrastructure, access, policy)

## 7. Documentation & Handoffs
- Record approvals/denials with rationale
- End-of-day summary: staffing changes, SLA breaches, incidents, pending actions
- Handoff to next-day lead and to Admin when cross-department support is needed

## Technical Notes
- RLS: All data/actions are hospital- and department-scoped; cross-hospital access is blocked.
- Workflow automation: department heads may trigger rules; tasks/notifications are filtered by `hospital_id` and role/department.
- Pending enhancements: richer staffing suggestions (AI), auto-rostered coverage, and automated SLA breach playbooks.
