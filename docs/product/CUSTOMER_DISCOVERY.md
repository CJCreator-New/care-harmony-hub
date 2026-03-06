# Customer Discovery Guide — CareSync AI
## AroCord Hospital Information Management System

**Version**: 1.0  
**Last Updated**: 2025-07-17  
**Owner**: Product Team  
**Purpose**: Framework for conducting customer discovery interviews, synthesizing insights, and validating product decisions

---

## Discovery Philosophy

> "Fall in love with the problem, not the solution."  
> Talk to clinicians and administrators **before** building features. Their reality is always more complex and more interesting than our assumptions.

**Rules**:
1. Ask about past behavior, not hypothetical futures
2. Never pitch or sell during discovery interviews
3. "Why?" is always the next question
4. Document verbatim quotes — they are your most powerful evidence
5. Separate data collection from synthesis

---

## Interview Formats

| Type | Duration | When to Use | Participants |
|------|----------|-------------|--------------|
| **Problem Discovery** | 45 min | Pre-build; new feature areas | 1 PM + 1 Clinical Advisor |
| **Usability Testing** | 30 min | Post-prototype; pre-launch | 1 PM + 1 Designer |
| **Win/Loss Analysis** | 30 min | Post-sale or post-churn | 1 PM + 1 Sales |
| **Longitudinal Check-in** | 20 min | Monthly; active customers | 1 PM |
| **Shadowing Session** | 2–4 hrs | Deep workflow understanding | 1 PM + 1 Clinical Advisor |

---

## Interview Guide: Clinical Workflow Discovery

### Pre-Interview Checklist
- [ ] Consent form signed (or verbal consent recorded)
- [ ] Recording device / note-taking tool ready
- [ ] Background research on hospital type and size done
- [ ] Interview guide printed / open
- [ ] 3 open-ended "deprobing" questions prepared

---

### Section 1: Context & Warm-Up (5–8 min)

*Goal: Build rapport and understand the interviewee's context.*

1. "Can you tell me about your role and a typical day in your department?"
2. "How long have you worked in this hospital / in healthcare?"
3. "What technology tools do you currently use for patient care?"
4. "On a scale of 1–10, how satisfied are you with those tools today? What makes it that number?"

---

### Section 2: Problem Exploration (15–20 min)

*Goal: Identify real pain points — without leading the witness.*

**Clinical Records & Information Access**
- "Walk me through the last time you needed patient information urgently. What happened?"
- "Where does information get stuck or lost in your workflow?"
- "How do you currently communicate lab results to the ordering doctor? What goes wrong?"

**Coordination & Handoffs**
- "Tell me about a recent shift handoff. What information do you wish the incoming team had that they didn't?"
- "When a patient moves from OPD to ward, what information gaps create problems?"

**Medication & Pharmacy**
- "Describe the last time a medication error or near-miss occurred. What caused it?"
- "How do you currently check for drug interactions or allergies before dispensing?"

**Administrative & Billing**
- "How much time do you spend on documentation per patient? What does that cut into?"
- "What's your least favorite part of your paperwork or system interactions?"

---

### Section 3: Solution Validation (10–15 min)

*Goal: Test whether our proposed solutions address real needs — with neutrality.*

> ⚠️ **Do NOT ask** "Would you use this?" — people always say yes.  
> **DO ask** "When exactly would this have helped you in your workflow?"

**For EHR / Clinical Notes**
- "If you had instant access to the last 5 clinical notes on a patient you're seeing for the first time, when would that most change your care?"
- "What's the minimum information you'd need to feel confident treating a transferred patient?"

**For Lab Results**
- "If a lab result was auto-routed to you with a 1-sentence interpretation, how would that change your current process?"

**For Pharmacy Alerts**
- "Under what circumstances would a drug interaction alert be genuinely worth interrupting your workflow?"

---

### Section 4: Prioritization Exercise (5–8 min)

*Goal: Identify what they value most, not what they say sounds good.*

Present this grid (printed or shared screen):

```
STATEMENT                                    | Agree | Neutral | Disagree
---------------------------------------------|-------|---------|----------
"I'd pay more for a system that reduces      |       |         |
 medication errors, even if it's slower"     |       |         |
"Speed and simplicity matter more than       |       |         |
 comprehensive features"                     |       |         |
"I'd use a new system, even if it required   |       |         |
 2 weeks of training, if it was much better" |       |         |
"Offline access is more important to me      |       |         |
 than real-time sync"                        |       |         |
```

---

### Section 5: Wrap-Up (3–5 min)

1. "Is there anything about your workflow or pain points we haven't covered?"
2. "If you could change one thing about how information flows in your hospital — the ONE thing — what would it be?"
3. "Is there a colleague who has the opposite experience to yours? Could you connect me?"
4. "Would you be open to a follow-up in 2 weeks once we have a prototype to show you?"

---

## Synthesis Framework

### After Each Interview (within 24h)

```markdown
## Interview Summary — [Hospital Name] — [Date]

**Interviewee Role**: [Role]
**Duration**: [X minutes]
**Interviewer**: [Name]

### Top 3 Pain Points
1. [Pain] — Severity: 🔴 High / 🟡 Medium / 🟢 Low
2. [Pain] — Severity: ...
3. [Pain] — Severity: ...

### Verbatim Quotes (Gold)
- "[Exact quote that captures something real]"
- "[Quote]"

### Feature Requests Mentioned
- [Request] — Implied by problem or directly stated
- [Request]

### Jobs to Be Done
- When [situation], I want to [motivation], so I can [expected outcome].
- When [situation], ...

### Surprises / Assumption Violations
- We assumed X but actually Y
- [Insight that changed our thinking]

### Unmet Needs to Validate
- [Need] → Hypothesis: [Feature] would address this
- [Need]

### Follow-Up Actions
- [ ] Share prototype of [X] with this interviewee by [date]
- [ ] Validate [assumption] with 2 more interviewees
```

---

## Hypothesis Template

```
We believe that [building X feature]
For [user persona in specific context]
Will [achieve this behavior/outcome]
We'll know we're right when [we see this metric or behavior change]
```

**Example**:
```
We believe that adding drug interaction alerts during prescription review
For pharmacists reviewing prescriptions in a busy hospital queue
Will reduce medication override errors by at least 60%
We'll know we're right when pharmacist-initiated prescription holds increase by >20% in the first month
```

---

## Opportunity Solution Tree

```
Desired Outcome: Reduce preventable medication errors by 60%
│
├── Opportunity 1: Pharmacists lack real-time allergy data during dispensing
│   ├── Solution A: Allergy summary displayed in prescription review UI
│   └── Solution B: System requires allergy acknowledgment before dispense
│
├── Opportunity 2: Doctors prescribe without seeing current medication list
│   ├── Solution A: Medication list auto-loaded in EHR note context panel
│   └── Solution B: Prescribing form shows drug interaction warning inline
│
└── Opportunity 3: Paper prescriptions are illegible
    ├── Solution A: Digital prescription-to-pharmacy routing
    └── Solution B: Structured dosage form with dropdown selections
```

---

## Discovery Tracker

| Hospital | Date | Role interviewed | Key pain found | Feature hypothesis | Validated? |
|----------|------|-----------------|----------------|-------------------|------------|
| Pilot A | Jan 2025 | Head Pharmacist | Paper prescriptions cause delays + errors | Digital Rx routing | ✅ Confirmed |
| Pilot A | Jan 2025 | Doctor (Internist) | Lab results arrive 4+ hours late | Critical lab notifications | ✅ Confirmed |
| Pilot B | Feb 2025 | Nurse | Vitals not visible to ward doctor in real-time | Vitals timeline in EHR | 🔄 Testing |
| Pilot B | Feb 2025 | Admin | No way to see hospital-wide bed occupancy | Bed occupancy dashboard | ⏳ Not tested |
| Prospect C | Mar 2025 | CEO | Budget approval delays IT projects | ROI calculator / case study | ⏳ Not tested |

---

## Competitive Analysis Notes

| Competitor | Strengths | Weaknesses | Notes for CareSync |
|-----------|-----------|-----------|-------------------|
| **Epic** | Deep EHR, USA dominance | $1M+ setup cost, US-centric | We win on price + emerging markets |
| **Meditech** | Hospital breadth | Complex UI, slow deployment | Our UX is significantly better |
| **OpenMRS** | Open-source, global | Requires IT team, outdated UX | We offer SaaS vs self-hosted |
| **Vezeeta** | Appointment scheduling (Africa) | Scheduling only, no EHR | We complement or replace |
| **Helium Health** | Pan-African HIS | Limited analytics, basic EHR | Closest competitor — segment by enterprise |
