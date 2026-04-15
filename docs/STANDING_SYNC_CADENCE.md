# Standing Sync Cadence Template - Phase 4 & Beyond
**Established**: April 10, 2026  
**Effective**: May 13, 2026 (Phase 4 Week 13)  
**Duration**: Ongoing through Phase 6 (July 1)

---

## 📅 Sync Meeting Schedule

### 🟦 **Daily Standups** (Async via Slack)

**Channel**: #phase4-performance  
**Time**: 9:15 AM UTC (Post standup in Slack thread)  
**Attendees**: All team members across all workstreams  
**Duration**: 1 message per person (async, not live meeting)

**Format** (One-liner per workstream):
```
[Workstream Name]: [X]/[Y] tests passing | [Key metric] | [Blockers if any]

Example:
Backend: 32/50 tests passing | Avg query time 165ms (target <200ms) | No blockers
Frontend: 28/50 tests passing | Bundle 325KB (target <300KB) | Need WebP optimization specialist
Infrastructure: 40/50 tests passing | K8s scaling to 7 pods | No blocker discovered, on track
```

**Rules**:
- Post by 9:30 AM UTC (don't wait for whole team)
- Keep to 1-2 lines max
- Include: Progress | Key metric | Any blocker
- Use emoji for quick scanning (✅ good | ⚠️ warning | 🚨 blocker)

---

### 🟨 **Weekly Syncs - Phase 4 Weeks 13-16**

**Channel**: Slack #phase4-performance + Video (optional)  
**Day**: Fridays 10 AM UTC  
**Attendees**: Workstream owners (4) + Project Lead (5 people)  
**Duration**: 30 minutes  
**Meeting Link**: [TBD - added to calendar]

**Agenda** (30 min):

1. **Week Summary** (10 min, Workstream Owners rotate)
   - Owner 1: Backend results (Week 13)
   - Owner 2: Frontend results (Week 14-15)
   - Owner 3: Infrastructure results (Week 14-15)
   - Owner 4: Load testing insights (Week 16)
   - **Format**: 2 min per owner (slides optional)
   - **Content**: What was done | Metrics | Blockers

2. **Blockers & Escalations** (8 min, Project Lead)
   - Any blockers from the week?
   - Urgency assessment
   - Mitigation plan or escalation
   - **Format**: Quick discussion (2-3 min per blocker max)

3. **Gate Review** (7 min, Project Lead)
   - Are we on track for week gate?
   - Week 13 Gate: 80%+ <200ms? (Fri May 17)
   - Week 14-15 Gate: Frontend/Infra targets? (Fri May 24)
   - Week 16 Gate: <500ms p95? <1% errors? (Mon Jun 3)
   - **Format**: GO / NO-GO / CONDITIONAL assessment

4. **Next Week Planning** (5 min, Project Lead)
   - What's coming next
   - Any prep needed
   - Confirm team availability

**Outcomes**:
- [ ] Minutes recorded in Slack thread
- [ ] Gate decision documented
- [ ] Action items assigned and tracked
- [ ] Escalations recorded

---

### 🟩 **Gate Reviews** (When gates trigger)

**When**: End of each workstream week (Fri 5 PM or designated time)  
**Attendees**: Relevant workstream owner + Project Lead + optional CTO  
**Duration**: 15-30 minutes (sync if blocker, async if pass)  
**Purpose**: Pass/Fail/Conditional decision on proceeding to next phase

**Gate 1**: Friday May 17 (Backend Week 13) - 5 PM UTC
- **Decision**: 80%+ queries <200ms? → Proceed to Week 14?
- **Outcome**: GO / CONDITIONAL / STOP

**Gate 2**: Friday May 24 (Frontend+Infra Weeks 14-15) - 5 PM UTC
- **Decision**: Bundle <300KB? LCP <2.5s? K8s scaling? → Proceed to Week 16?
- **Outcome**: GO / CONDITIONAL / STOP

**Gate 3**: Monday Jun 3 6 PM UTC (Load Test Week 16) - 
- **Decision**: <500ms p95? <1% errors? >95% login? → Proceed to Phase 5?
- **Outcome**: GO / CONDITIONAL (Phase 5 with constraints) / BLOCKED

---

### 🟪 **Bi-Weekly Executive Syncs** (Starting May 13)

**Channel**: Conference Room / Teams  
**Day**: Bi-weekly on Mondays 2 PM UTC  
**Attendees**: Project Lead + CTO + Clinical Lead (optional)  
**Duration**: 20 minutes  
**Purpose**: Executive oversight and escalation

**Agenda** (20 min):
1. **2-Week Summary** (10 min, Project Lead)
   - Progress: # of gates passed
   - Metrics vs targets
   - Team morale/engagement
   - Any escalations?

2. **Risk Assessment** (5 min, Project Lead)
   - On track for July 1 launch?
   - Any path-blocking risks?
   - Contingency plans if needed?

3. **Decisions Needed** (5 min, CTO)
   - Any executive decisions blocking progress?
   - Resource requests?
   - Timeline adjustments needed?

**Outcomes**:
- [ ] Executive aware of progress
- [ ] Decisions made quickly
- [ ] Escalations resolved

---

## 🎯 Meeting Templates

### **Daily Standup Template**
```
✅ Backend: [28]/50 tests passing | Query p95: 185ms (trend: ↓ improving) | 0 blockers
✅ Frontend: [35]/50 tests passing | Bundle: 298KB (trend: ↓ improving) | 0 blockers
⚠️ Infrastructure: [42]/50 tests passing | K8s scaling to 8 pods (target 10) | Reviewing memory limits
✅ Load Test: Ready for staging dry-run next week
```

### **Weekly Sync Agenda Template**
```
# Phase 4 Week [X] Sync
📅 Date: Friday May [X], 10 AM UTC
👥 Attendees: [Owners], [Project Lead]

## 1. Weekly Results (10 min)
- Backend: [30]/50 tests, [progress%] complete
- Frontend: [35]/50 tests, [progress%] complete
- Infrastructure: [42]/50 tests, [progress%] complete
- Load Test: [Status]

## 2. Blockers (8 min)
- [Blocker 1] → Status: [Investigating]
- [Blocker 2] → Status: [Escalated to CTO]

## 3. Gate Review (7 min)
- Week [X] Gate: [GO/CONDITIONAL/BLOCKED]
- Decision: [Proceed to week X+1 / Remediation plan]

## 4. Next Week (5 min)
- Everyone ready for week [X+1]?
- Any prep needed?
```

### **Gate Review Template**
```
# Phase 4 Week [X] Gate Review

## Gate Criteria
- Target 1: [Metric] target [Value]
- Target 2: [Metric] target [Value]
- Target 3: [Metric] target [Value]

## Results
- Target 1: [Achieved] ✅ / [Not met] ❌
- Target 2: [Achieved] ✅ / [Not met] ❌
- Target 3: [Achieved] ✅ / [Not met] ❌

## Gate Decision
☑️ GO (proceed as planned)
☐ CONDITIONAL (proceed with constraints: [list])
☐ BLOCKED (need remediation, delay by [duration])

## Sign-Off
Workstream Owner: _________________ Date: ______
Project Lead: ____________________ Date: ______
```

---

## 📊 Tracking & Metrics

**What We Track Weekly**:
- [ ] Tests passing (by workstream)
- [ ] Key metrics (query time, bundle size, K8s pods, p95 response)
- [ ] Blockers (count, severity, resolution status)
- [ ] Trend (improving, stable, degrading?)
- [ ] Gate status (GO/NO-GO)

**How We Report**:
- Slack daily (async standup)
- Friday 30-min sync (all owners)
- Gate decision (written with signatures)
- Monthly retrospective (lessons learned)

---

## 🎓 Communication Norms

### ✅ **What Works**
- Short, frequent updates (daily standup)
- Async by default (Slack), video for complex topics
- Data-driven decisions (metrics, not opinions)
- Fast escalation (blockers within 4 hours)
- Clear ownership (each workstream has owner)

### ❌ **What Doesn't Work**
- Long email summaries (use Slack threads instead)
- Delaying escalation until Friday
- Vague status ("fine" instead of specific metrics)
- Missing meetings or blocking meetings
- Surprises (communicate early and often)

---

## 📞 Escalation Protocol

**Blocker Found** (During day):
1. Slack alert in #phase4-performance (tag @ProjectLead)
2. Format: "🚨 [Workstream] [Blocker description] → [Proposed mitigation]"
3. Project Lead responds within 2 hours
4. Decision: Fix now / Delay to next week / Escalate higher
5. Update GitHub issue with label `phase4-blocker`

**Escalation to CTO** (Gate at risk):
1. Project Lead calls with workstream owner (live sync)
2. Present data: metrics vs targets, recommendation
3. CTO decision: GO / NO-GO / CONDITIONAL
4. Communicate result to team within 1 hour

**Emergency Escalation** (Patient safety or security):
1. Immediate Slack alert in #caresync-all-hands
2. Tag CTO + appropriate leads
3. Live video call (don't wait for Friday sync)
4. Decision and action plan within 30 minutes

---

## 📋 Frequency vs Intensity Matrix

| Meeting | Frequency | Attendees | Intensity | Purpose |
|---------|-----------|-----------|-----------|---------|
| Daily Standup | Every day | All (async) | Low | Awareness |
| Weekly Sync | Once/week | 5 people | Medium | Coordination |
| Gate Review | 3 times (weekly) | 3 people | High | Go/No-Go |
| Bi-Weekly Exec | Every 2 weeks | 3 people | Low | Oversight |

---

## 🎯 Success Metrics for Cadence

**Good Sync Cadence Has**:
- ✅ Daily updates so no surprises
- ✅ Weekly meetings keep team aligned
- ✅ Gate reviews make clear decisions
- ✅ Blockers escalated fast (within 4 hours)
- ✅ No duplicate meetings
- ✅ Action items tracked and closed
- ✅ Decisions logged and communicated
- ✅ Team engagement high (attendance 100%)

---

## 🚀 Cadence Implementation Checklist

**By May 13 (Kickoff)**:
- [ ] Calendar invites sent for all standing meetings
- [ ] Slack channel #phase4-performance created and pinned
- [ ] Gate review dates added to master calendar
- [ ] Templates posted in Slack pinned messages
- [ ] Team trained on standup format
- [ ] Backup days/times defined in case conflicts

**Weekly (Every Friday)**:
- [ ] Weekly sync completed
- [ ] Gate decision documented
- [ ] Action items assigned
- [ ] Next week's priorities confirmed

**Ongoing**:
- [ ] Adapt cadence if needed (add/remove meetings)
- [ ] Retrospective: Did sync cadence help or hinder?
- [ ] Continuous improvement (feedback loop)

---

## 📞 Calendar Template

```
Sun/Mon/Tue/Wed/Thu (Daily)  → No meetings (execution)
Friday 10 AM UTC             → Weekly Sync (30 min, ALL owners + Project Lead)
Friday 5 PM UTC              → Potential Gate Review (if gate day, 15-30 min)

+ Week 13 Gate: Friday May 17 @ 5 PM
+ Week 14-15 Gate: Friday May 24 @ 5 PM  
+ Week 16 Gate: Monday Jun 3 @ 6 PM

+ Bi-weekly Monday 2 PM UTC: Executive Sync (20 min)
  May 13, May 27, Jun 10, ...
```

---

## ✅ Cadence Approved

**Established**: April 10, 2026  
**Starts**: May 13, 2026  
**Ends**: July 1, 2026 (or continues into Phase 5/6)  
**Review Frequency**: Weekly (adaptive)

**Owner**: Project Lead  
**Escalation**: CTO if cadence changes needed

---

**Document Ready**: April 10, 2026  
**Implementation**: May 13, 2026  
**Feedback Loop**: Weekly retrospectives

