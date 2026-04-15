# GitHub Project Board Setup - Phase 4 Execution Tracking
**Created**: April 10, 2026  
**Deployment**: May 10, 2026 (2 days before kickoff)  
**Purpose**: Visual tracking of Phase 4 Week 13-16 execution

---

## 🎯 Project Board Overview

**GitHub Project Name**: CareSync HIMS - Phase 4 Performance Optimization  
**URL**: github.com/caresync/hims/projects/4  
**Visibility**: Team (all developers + leads)  
**Status**: Ready for launch May 10

---

## 📋 Board Structure (4 Columns)

### Column 1: 📌 **BACKLOG** (Sprint prep)
**Purpose**: Work items not yet started or not yet scheduled

**Items**:
- Engineering optimization tasks
- Infrastructure configuration items
- Test suite configuration tasks
- Documentation updates

**Workflow**: New items created here → Moved to Sprint when assigned

---

### Column 2: 🔄 **IN PROGRESS** (Active work)
**Purpose**: Work currently being executed

**Items**:
- Query optimization (Week 13)
- Bundle size reduction (Weeks 14-15)
- K8s scaling setup (Weeks 14-15)
- Load test execution (Week 16)

**Workflow**: Pull from BACKLOG during daily standup → Move here → Work and update

**Automation**: 
- Auto-move when someone is assigned
- Auto-update when linked PR is created
- Close when all requirements met

---

### Column 3: 🔁 **IN REVIEW** (QA/validation)
**Purpose**: Work completed but waiting for verification

**Items**:
- Query optimization results (waiting for metrics verification)
- Bundle size validation (waiting for confirmation it's <300KB)
- K8s scaling confirmation (waiting for test run)

**Workflow**: Move here when work is done → Reviewer validates → Move to DONE or back to IN PROGRESS

---

### Column 4: ✅ **DONE** (Completed & verified)
**Purpose**: Work that is complete and verified

**Items**:
- Confirmed query optimizations
- Verified bundle size reductions
- Validated infrastructure changes
- Completed test runs with results

**Workflow**: Final column → Week retrospective includes all DONE items

---

## 🏷️ Labels (For Categorization & Filtering)

| Label | Color | Use Case | Example |
|-------|-------|----------|---------|
| `phase4-backend` | 🔵 Blue | Backend workstream tasks | Query optimization, indexing |
| `phase4-frontend` | 🟣 Purple | Frontend workstream tasks | Bundle optimization, code splitting |
| `phase4-infrastructure` | 🟠 Orange | Infrastructure workstream tasks | K8s scaling, caching |
| `phase4-loadtest` | 🔴 Red | Load testing tasks | k6 execution, metrics collection |
| `week13` | 🟡 Yellow | Week 13 tasks (May 13-17) | Backend sprint |
| `week14-15` | 🟡 Yellow | Weeks 14-15 tasks (May 20-27) | Frontend+Infra |
| `week16` | 🟡 Yellow | Week 16 tasks (Jun 3) | Load test |
| `blocker` | 🚨 Red | Blocking issues | Path-blocking problems |
| `stretch-goal` | 💡 Light Blue | Nice-to-have if time | Performance patterns doc |
| `documentation` | 📚 Gray | Documentation tasks | Guides, reports |

---

## 👥 Assignees (By Workstream Owner)

**Backend (Week 13)**:
- `@BackendLead` - Owner
- `@Backend1` - Team member
- `@Backend2` - Team member
- `@DBA` - Database specialist

**Frontend (Weeks 14-15)**:
- `@FrontendLead` - Owner
- `@Frontend1` - Team member
- `@Frontend2` - Team member
- `@BuildSpecialist` - Build optimization

**Infrastructure (Weeks 14-15)**:
- `@DevOpsLead` - Owner
- `@DevOps1` - Team member
- `@DevOps2` - Team member
- `@SRESpecialist` - Infrastructure expert

**Load Testing (Weeks 15-16)**:
- `@QALead` - Owner
- `@QA1` - Performance tester
- `@Analyst1` - Metrics analyst

**Overall**:
- `@ProjectLead` - Coordination & gates

---

## 📊 Initial Issues to Create (Sprint 1 - Week 13)

### Backend Optimization Track (Week 13)
```
Issue 1: Baseline query performance measurement
  Assignee: @BackendLead @DBA
  Labels: phase4-backend, week13
  Description: Run npm run test:performance:backend to establish baseline
  Success: All query timings recorded, baseline established

Issue 2: Identify slow queries (>200ms)
  Assignee: @BackendLead @Backend1
  Labels: phase4-backend, week13
  Description: Analyze baseline results; identify queries taking >200ms
  Success: List of 5-10 slow queries with execution plans

Issue 3: Database indexing strategy
  Assignee: @DBA
  Labels: phase4-backend, week13
  Description: Develop indexing strategy for identified slow queries
  Success: Index creation plan reviewed and approved

Issue 4: Create and test database indexes
  Assignee: @DBA @Backend2
  Labels: phase4-backend, week13
  Description: Create planned indexes; verify improvement
  Success: Indexes created; query times improved 20%+

Issue 5: Connection pool tuning
  Assignee: @Backend-Lead @Backend1
  Labels: phase4-backend, week13
  Description: Review and optimize database connection pool config
  Success: No pool exhaustion errors; 50-pool max confirmed

Issue 6: Week 13 gate decision
  Assignee: @BackendLead
  Labels: phase4-backend, week13
  Description: Verify 80%+ queries <200ms; decide to proceed to Week 14
  Success: Gate passed OR blockers identified with remediation
```

---

## 📊 Monitoring & Metrics Links

**Add to Project Description**:
```
📊 Key Resources:
- Weekly Metrics: [Shared Google Sheet]
- K8s Dashboard: [Grafana link]
- Performance Logs: [CloudWatch/ELK link]
- Slack Channel: #phase4-performance
```

---

## 🔄 Automation Rules (Configure in GitHub)

### Auto-Close Resolved Issues
```
Trigger: PR merged tagged with issue number
Action: Auto-move issue to DONE, close issue
```

### Auto-Assign Reviewers
```
Trigger: New PR created with label "phase4-*"
Action: Assign relevant workstream owner as reviewer
```

### Auto-Move to In Progress
```
Trigger: Issue assigned
Action: Move from BACKLOG to IN PROGRESS
```

---

## 📝 Issue Template for Phase 4 Tasks

```markdown
# [Task Title]

## Workstream
- [ ] Backend  
- [ ] Frontend
- [ ] Infrastructure
- [ ] Load Testing
- [ ] Documentation

## Week
- [ ] Week 13 (May 13-17)
- [ ] Week 14-15 (May 20-27)
- [ ] Week 16 (Jun 3)

## Description
[What needs to be done?]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Resources
- Playbook: [Link to PHASE4_EXECUTION_GUIDE.md section]
- Checklist: [Link to PHASE4_TEST_EXECUTION_CHECKLIST.md section]
- Related: [Link to related issues]

## Success Metrics
- [Metric 1]: [Target value]
- [Metric 2]: [Target value]

## Potential Blockers
- [Blocker 1 & mitigation]
- [Blocker 2 & mitigation]
```

---

## 🎯 Using the Board During Execution

### Daily (All Team Members)
1. Check #phase4-performance Slack for any blocker alerts
2. Update assigned issues with progress
3. If issue is done → Move to IN REVIEW
4. If blocked → Tag as blocker, notify reviewer

### Daily Standup (Workstream Owner)
1. Review IN PROGRESS issues
2. Check for any blockers (labeled `blocker`)
3. One-line update: "Backend: [X] tests passing | Query optimization 60% done | No blockers"
4. Move completed work to IN REVIEW

### Weekly (Friday EOD - Workstream Owner)
1. Move all validated items from IN REVIEW to DONE
2. Create summary of completed work
3. Identify any Week 14+ prep items needed
4. Close week with gate decision OR blockers identified

### Weekly Sync (Fridays 10 AM UTC - All Owners + Project Lead)
1. Review DONE column for each workstream
2. Discuss any blockers still in IN PROGRESS
3. Make gate decision (go/no-go to next week)
4. Celebrate completions, identify learnings

---

## 📊 Reporting & Visibility

### Daily Burndown (Auto-Generated)
- GitHub shows: Cards per column per day
- Visual: How many items moving from IN PROGRESS → DONE?

### Weekly Velocity Report (Project Lead)
```
Week 13 Velocity: [X issues started] → [Y issues completed]
Backend completion: 75% of planned work
Frontend start: May 20 (on track)
Blockers: [0 / 1 / None if 0]
Path: [On track / At risk / Blocked]
Gate: [Passed / Pending / Failed] 
```

### Phase 4 Summary (Week 16)
```
Total Issues: [200+]
Total Completed: [X]
Completion Rate: [Y%]
Blockers Resolved: [Count]
Gates Passed: [4/4 ✅]
Production Readiness: [Start Phase 5 ✅]
```

---

## 🔧 Setup Checklist (Admin - Project Lead)

**Due: May 10, 2026**

- [ ] Create GitHub Project: "CareSync HIMS - Phase 4 Performance"
- [ ] Add 4 columns: BACKLOG, IN PROGRESS, IN REVIEW, DONE
- [ ] Create all labels (phase4-*, week*, blocker, etc.)
- [ ] Add 20+ initial issues from template list above
- [ ] Configure automation rules (auto-move, auto-close)
- [ ] Set project visibility: Team (all devs)
- [ ] Add metrics/resources links to project description
- [ ] Configure GitHub Actions to comment on PRs with phase4 labels
- [ ] Create weekly burndown views
- [ ] Test all functionality
- [ ] Share board link in Slack #phase4-performance
- [ ] Send "Project Board Ready!" notification to team

---

## 📲 Board Access & Permissions

**Who Can Access**:
- All developers (read/write)
- All team leads (read/write + admin)
- Project Lead (admin)
- CTO (read-only)
- GitHub Issues/PRs: Public to internal team

**Permissions**:
- Move issues between columns: All developers
- Create issues: All developers
- Add labels: All developers
- Change automation: Project Lead only
- Archive/delete: Project Lead only

---

## 🎯 Success Metrics for the Board

**Good Project Board Has**:
- ✅ Daily activity (issues updated daily)
- ✅ Clear flow (items moving BACKLOG → IN PROGRESS → DONE)
- ✅ Minimal WIP (< 15 items in IN PROGRESS at once)
- ✅ Fast cycle time (items done in 1-3 days)
- ✅ Blockers visible (labeled and tagged early)
- ✅ Sprint tracking (week-by-week completion visible)
- ✅ Retrospective ready (DONE column tells the story)

**Board Launch Readiness**:
- ✅ All 4 columns created
- ✅ Labels configured
- ✅ Initial 20+ issues created
- ✅ Automation working
- ✅ Team trained on usage
- ✅ Slack integration active
- ✅ First sprint (Week 13) pre-loaded
- ✅ Accessible and permissions set

---

## 📚 Team Training (Quick Overview - 5 min)

**Tell team before May 13**:
```
"Our Phase 4 work is tracked on GitHub Project Board.

How to use it:
1. Open: github.com/caresync/hims/projects/4
2. Find your workstream (label: phase4-*)
3. Pick an issue from BACKLOG
4. Assign to yourself → auto-moves to IN PROGRESS
5. Work on it, update progress daily
6. When done → Move to IN REVIEW
7. Workstream owner verifies → Moves to DONE

Blockers?
- Add 'blocker' label + tag @ProjectLead in comment
- We will help you resolve within 4 hours

Questions? Ask in #phase4-performance"
```

---

**Project Board Ready**: May 10, 2026  
**Go-Live**: May 13, 2026 (Week 13 kickoff)  
**Closes**: June 3, 2026 (Week 16 gate)  
**Archive**: June 10, 2026 (Phase 5 starts)

