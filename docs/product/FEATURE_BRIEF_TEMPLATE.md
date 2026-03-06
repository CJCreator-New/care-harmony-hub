# Feature Brief Template — CareSync AI
## AroCord Hospital Information Management System

**Purpose**: Lightweight 1-page brief for exploring new features before committing to a full PRD.  
Use this template when you have an idea worth investigating but haven't yet validated it with customers or engineering.

---

## When to Use a Feature Brief (vs Full PRD)

| Situation | Use Feature Brief | Use Full PRD |
|-----------|-----------------|-------------|
| Early-stage idea; hypothesis not yet validated | ✅ | — |
| Small feature (< 1 week eng effort) | ✅ | — |
| Exploration / spike (technical or design) | ✅ | — |
| Feature ready for sprint planning | — | ✅ |
| Feature touching HIPAA/security/RLS | — | ✅ (mandatory) |
| Feature with cross-team dependencies | — | ✅ |
| Feature with >3 acceptance criteria sets | — | ✅ |

---

## Feature Brief Template

Copy the section below and create a new file in `docs/product/briefs/` named `BRIEF-[FEATURE-SLUG].md`.

---

```markdown
# Feature Brief: [Feature Name]

**ID**: BRIEF-XXX  
**Date**: YYYY-MM-DD  
**Author**: [PM Name]  
**Status**: Draft | Under Review | Approved | Declined  
**Estimated Size**: XS (< 1 day) | S (1–3 days) | M (1 week) | L (2 weeks) | XL (1+ month)

---

## Context
*Why are we considering this? What triggered this idea?*

[2–3 sentences. Include: customer feedback, usage data, internal observation, or strategic direction.]

---

## Problem
*What specific problem does this solve? For whom?*

[Describe the pain point clearly. Include:
- Who experiences it (role + context)
- How frequently
- What they do today as a workaround]

---

## Hypothesis
We believe that **[building X]**  
For **[user role in specific situation]**  
Will **[produce this outcome or behavior change]**  
We'll know we're right when **[we see this metric/signal]**.

---

## Proposed Solution
*High-level approach — not a full spec*

[2–4 sentences describing what we'd build. Include:
- What UI change or new screen is involved
- What backend/data change is required
- What integrations are needed, if any]

---

## Effort Estimate
| Dimension | Estimate | Confidence |
|-----------|----------|-----------|
| Frontend | [XS/S/M/L/XL] | High/Med/Low |
| Backend | [XS/S/M/L/XL] | High/Med/Low |
| Design | [XS/S/M/L/XL] | High/Med/Low |
| QA | [XS/S/M/L/XL] | High/Med/Low |
| **Total** | **[XS/S/M/L/XL]** | |

---

## RICE Score (Rough)
| Factor | Value | Notes |
|--------|-------|-------|
| Reach | [# users/quarter] | |
| Impact | [Massive 3x / High 2x / Medium 1x / Low 0.5x] | |
| Confidence | [High 100% / Medium 80% / Low 50%] | |
| Effort | [person-months] | |
| **RICE Score** | **[(R × I × C) / E]** | |

---

## Key Risks
1. [Risk] — Mitigation: [Plan]
2. [Risk] — Mitigation: [Plan]

---

## HIPAA / Security Notes
- [ ] Does this feature touch PHI? → If yes, `useHIPAACompliance()` required
- [ ] Does this feature add new RLS policies? → Tag BE engineer
- [ ] Does this add a new external integration? → Security review required

---

## Next Steps
- [ ] Validate hypothesis with [# of] customer interviews by [date]
- [ ] Design exploration (wireframe or Figma sketch) by [date]
- [ ] Engineering spike: [specific technical question] by [date]
- [ ] Stakeholder review: [who] by [date]
- [ ] Decision: Promote to PRD / Decline / Defer by [date]
```

---

## Sample Completed Brief

```markdown
# Feature Brief: Drug Interaction Alert During Prescription Review

**ID**: BRIEF-042  
**Date**: 2025-03-15  
**Author**: Product Team  
**Status**: Approved  
**Estimated Size**: S (2–3 days)

---

## Context
During a shadowing session at Pilot Hospital A, we observed a pharmacist dispensing a medication without realizing the patient had an allergy listed in the paper chart (not visible in the digital system). No harm occurred, but the near-miss was reported.

## Problem
Pharmacists reviewing prescriptions in CareSync AI cannot currently see the patient's allergy or active medication list in the same view. They must navigate to the patient record separately — adding ~3 minutes of context-switching per prescription.

## Hypothesis
We believe that **surfacing patient allergy and current medication data inline in the prescription review screen**  
For **pharmacists reviewing incoming prescriptions**  
Will **reduce medication contradiction errors and speed up prescription verification**  
We'll know we're right when **pharmacists report the context panel is "very useful" (≥ 4/5) and prescription hold rates increase by > 15%** (indicating real risk detection).

## Proposed Solution
Add a collapsible "Patient Safety Context" panel to the pharmacy prescription review sidebar that shows: allergies (red badges), current active medications, and pending prescriptions (to catch duplicate orders). Data fetched from existing patient record via TanStack Query with hospital-scoped cache.

## Effort Estimate
| Dimension | Estimate | Confidence |
|-----------|----------|-----------|
| Frontend | S | High |
| Backend | XS (existing API) | High |
| Design | XS | High |
| QA | S | Medium |
| **Total** | **S** | High |

## RICE Score
| Factor | Value |
|--------|-------|
| Reach | 80 pharmacists/quarter |
| Impact | 3x (Massive — patient safety) |
| Confidence | 90% |
| Effort | 1 person-week (0.25 months) |
| **RICE Score** | **80 × 3 × 0.9 / 0.25 = 864** |

## Key Risks
1. Slow render if patient has many medications → Mitigation: TanStack Query cache + lazy load
2. Privacy: patient allergy visible to pharmacy — already authorized per HIPAA treatment exception

## HIPAA / Security Notes
- [x] Touches PHI (allergies, medication list) → uses existing `useHIPAACompliance()` hook
- [ ] No new RLS policies needed — uses existing patient read policy for pharmacy role
- [ ] No external integrations

## Next Steps
- [x] Validated with 2 pharmacists at Pilot A (2025-03-10) — both rated it 5/5 in mock test
- [ ] Design: wireframe in Figma by 2025-03-20
- [ ] Promote to PRD and add to Q2 sprint by 2025-03-25
```

---

## Brief Index

| ID | Feature | Author | Status | RICE | Quarter |
|----|---------|--------|--------|------|---------|
| BRIEF-001 | Drug interaction alert (Pharmacy) | PM | ✅ Approved | 864 | Q2 |
| BRIEF-002 | Critical lab value notification | PM | ✅ Approved | 216 | Q2 |
| BRIEF-003 | Patient portal — view own records | PM | ✅ Approved | 240 | Q1 |
| BRIEF-004 | QR code patient check-in | PM | 🔄 Under Review | 80 | Q2 |
| BRIEF-005 | AI triage v1 (chief complaint → level) | PM | 🔵 Research | 40 | Q3 |
| BRIEF-006 | Telemedicine MVP | PM | ❌ Declined | 12 | Backlog |
| BRIEF-007 | Bed occupancy status board | PM | ⏳ Draft | 40 | Q3 |
| BRIEF-008 | Offline vitals entry (mobile) | PM | ⏳ Draft | 48 | Q4 |
