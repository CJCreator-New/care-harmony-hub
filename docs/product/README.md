# Product Management Hub — CareSync AI
## AroCord Hospital Information Management System

This folder contains all product management documentation following the **Product Manager Toolkit** framework.

---

## Documents

| Document | Purpose | Audience | Updated |
|----------|---------|---------|---------|
| [PRD.md](./PRD.md) | Full product requirements — problem, solution, requirements, timeline | All stakeholders | 2025-07-17 |
| [ROADMAP.md](./ROADMAP.md) | Quarterly feature roadmap with epics, milestones, and dependencies | Team + Investors | 2025-07-17 |
| [OKRs.md](./OKRs.md) | Objectives, Key Results, and KPI tracking for FY 2025 | Leadership + Team | 2025-07-17 |
| [FEATURE_BACKLOG.md](./FEATURE_BACKLOG.md) | RICE-scored feature backlog with value/effort matrix and MoSCoW | PM + Engineering | 2025-07-17 |
| [USER_STORIES.md](./USER_STORIES.md) | User stories by role with acceptance criteria | Engineering + QA | 2025-07-17 |
| [CUSTOMER_DISCOVERY.md](./CUSTOMER_DISCOVERY.md) | Interview guides, synthesis framework, opportunity-solution tree | PM + Clinical Advisor | 2025-07-17 |
| [GO_TO_MARKET.md](./GO_TO_MARKET.md) | GTM strategy — segments, pricing, channels, launch phases, sales playbook | Leadership + Sales | 2025-07-17 |
| [RELEASE_NOTES.md](./RELEASE_NOTES.md) | Release history + template for future releases | All users | 2025-07-17 |
| [STAKEHOLDER_COMMS.md](./STAKEHOLDER_COMMS.md) | Stakeholder map, communication cadence, RACI, templates | PM + Leadership | 2025-07-17 |
| [FEATURE_BRIEF_TEMPLATE.md](./FEATURE_BRIEF_TEMPLATE.md) | Lightweight brief template for early-stage feature exploration | PM | 2025-07-17 |

---

## Skills Toolkit Reference

These documents were generated following the **[product-manager-toolkit](https://github.com/sickn33/antigravity-awesome-skills/tree/main/skills/product-manager-toolkit)** skill from Antigravity Awesome Skills, which includes:

- **RICE Prioritization Framework** (used in `FEATURE_BACKLOG.md`)
- **PRD Templates** — Standard, One-Page, Agile Epic, Feature Brief (used in `PRD.md` and `FEATURE_BRIEF_TEMPLATE.md`)
- **Customer Interview Framework** (used in `CUSTOMER_DISCOVERY.md`)
- **Discovery Frameworks** — Hypothesis Template, Opportunity-Solution Tree (used in `CUSTOMER_DISCOVERY.md`)
- **Metrics & Analytics** — North Star Metric, Funnel Analysis (used in `OKRs.md`)
- **Stakeholder Management Best Practices** (used in `STAKEHOLDER_COMMS.md`)
- **Go-to-Market Strategy Structure** (used in `GO_TO_MARKET.md`)

---

## Quick Links to Related Docs

- [HIPAA Compliance](../HIPAA_COMPLIANCE.md)
- [Database Architecture](../DATABASE.md)
- [Security Documentation](../SECURITY.md)
- [API Reference](../API.md)
- [Architecture Overview](../ARCHITECTURE.md)
- [Testing Guide](../TESTING.md)
- [Deployment Guide](../DEPLOYMENT.md)

---

## Workflows

### New Feature Request
1. Create a `BRIEF-XXX.md` in `docs/product/briefs/` using [FEATURE_BRIEF_TEMPLATE.md](./FEATURE_BRIEF_TEMPLATE.md)
2. Validate hypothesis with ≥ 2 customer interviews (see [CUSTOMER_DISCOVERY.md](./CUSTOMER_DISCOVERY.md))
3. Add to [FEATURE_BACKLOG.md](./FEATURE_BACKLOG.md) with RICE score
4. If approved: create full epic in [USER_STORIES.md](./USER_STORIES.md)
5. Add to [ROADMAP.md](./ROADMAP.md) in the appropriate quarter

### New Release
1. Update `RELEASE_NOTES.md` using the template in [RELEASE_NOTES.md](./RELEASE_NOTES.md)
2. Send release email to hospital admins using `STAKEHOLDER_COMMS.md` template
3. Update `ROADMAP.md` to mark shipped items as `✅ Done`
4. Update KPI tracking in `OKRs.md` with actuals

### Quarterly Planning
1. Score OKRs from previous quarter in [OKRs.md](./OKRs.md)
2. Update [ROADMAP.md](./ROADMAP.md) for next quarter
3. Re-rank [FEATURE_BACKLOG.md](./FEATURE_BACKLOG.md) by current RICE scores
4. Run stakeholder review per [STAKEHOLDER_COMMS.md](./STAKEHOLDER_COMMS.md) quarterly cadence
