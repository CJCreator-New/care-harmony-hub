# Product Strategy Session Skill — Usage Guide

## What This Skill Does

The **product-strategy-session** skill helps teams develop and execute healthcare product strategies. It provides:

- **Market Analysis** — TAM sizing, competitive landscape, clinical trends
- **Strategic Positioning** — Differentiation, value proposition, positioning
- **Roadmap Planning** — Phased feature prioritization with clinical milestones
- **Go-to-Market Strategy** — Launch planning, pricing, customer acquisition
- **Business Case Development** — Financial models, ROI projections, investment theses
- **Risk Management** — Regulatory, competitive, execution risk mitigation

## Typical Use Cases

### 1. Product Launch Planning
```
/product-strategy-session — Create go-to-market strategy for our new telemedicine platform
```
**Produces**: 
- Launch timeline (soft, beta, general availability)
- Target customer segments (primary care, specialists, urgent care)
- Pricing model and packaging
- Channel strategy (direct, partnerships, enterprise)
- Marketing messaging and positioning

### 2. Feature Prioritization
```
/product-strategy-session — Prioritize clinical features for our next release based on market demand
```
**Produces**:
- Impact/effort matrix for each feature
- Clinical validation requirements
- Dependency mapping
- Release sequencing
- Risk assessment per feature

### 3. Competitive Positioning
```
/product-strategy-session — Analyze the competitive landscape for AI-powered clinical decision support
```
**Produces**:
- Competitive matrix (features, pricing, positioning)
- Market gaps and opportunities
- Our unique value proposition
- Positioning statement and messaging
- Differentiation strategy

### 4. Business Case Development
```
/product-strategy-session — Build business case for healthcare data analytics platform
```
**Produces**:
- Market opportunity analysis
- Revenue model options
- Financial projections (3-5 year)
- Unit economics
- Break-even analysis
- Risk-adjusted ROI

### 5. Stakeholder Alignment
```
/product-strategy-session — Develop strategy and alignment plan for hospital administration
```
**Produces**:
- Executive summary (one-pager)
- Vision and mission
- Key metrics and success criteria
- Stakeholder communication plan
- Governance structure

## Healthcare Product Categories

The skill is optimized for:

| Category | Examples | Key Considerations |
|----------|----------|-------------------|
| **Clinical Software** | EHR, CPOE, CDS | Workflow integration, clinical validation |
| **Telemedicine** | Video visits, remote monitoring | Reimbursement, licensing across state lines |
| **Patient Engagement** | Apps, patient portals, education | User adoption, data security |
| **Healthcare Analytics** | BI tools, population health, risk stratification | HIPAA, data governance |
| **Hospital Operations** | Scheduling, staffing, supply chain | IT integration, change management |
| **Healthcare Marketplaces** | Telehealth platforms, provider networks | Trust/credibility, network effects |
| **Medical Devices** | Connected devices, wearables | FDA classification, reimbursement |

## Output Quality

Each strategy deliverable includes:

✅ **Executive Summary** (1 page)
- Opportunity size
- Positioning
- 90-day action plan
- Key risks
- Success metrics

✅ **Strategic Framework** (5-10 pages)
- Market analysis (TAM/SAM/SOM)
- Competitive landscape
- Positioning and differentiation
- Value proposition
- Success metrics and KPIs

✅ **Roadmap** (Product timeline)
- Phase 1: Foundation (MVP features)
- Phase 2: Expansion (adjacent workflows)
- Phase 3: Optimization (performance, compliance)
- Phase 4: Scale (enterprise, multi-tenant)

✅ **Financial Model**
- Revenue assumptions
- Unit economics
- 3-year projections
- Break-even timeline
- Sensitivity analysis

✅ **Risk Matrix**
- Regulatory/compliance risks
- Market/execution risks
- Mitigation strategies
- Contingency plans

## Invocation Examples

### Example 1: Telemedicine Platform Strategy
```
/product-strategy-session

I'm building a telemedicine platform focused on mental health therapy. 
We're targeting individual practice therapists initially, with ambitions 
to reach group practices and employers.

Please help me:
1. Size the market (TAM/SAM/SOM)
2. Analyze competitors like Talkspace, MDLive, Amwell
3. Define our positioning and differentiation
4. Create a 18-month roadmap
5. Build financial projections for Series A
```

**What you'll get**:
- Market analysis (addressable market for virtual therapy)
- Competitive comparison matrix
- Positioning statement and messaging
- Feature roadmap with clinical validation milestones
- Go-to-market strategy
- 3-year financial projections

### Example 2: Clinical Decision Support Strategy
```
/product-strategy-session

We have proprietary AI for sepsis detection in ICUs. We've validated 
with 2 ICUs (100% sensitivity, 85% specificity). Now we need to:

1. Validate commercial opportunity
2. Understand regulatory pathway (FDA, HIPAA)
3. Build go-to-market strategy
4. Price the platform
5. Create investor pitch deck outline
```

**What you'll get**:
- Addressable market and CAGR
- FDA regulatory strategy (510(k) vs. non-exempt pathway)
- HIPAA/security compliance checklist
- Pricing models (per-patient, per-hospital, SaaS)
- Go-to-market channels (direct, integrators, cloud vendors)
- Investor pitch framework

### Example 3: Feature Prioritization
```
/product-strategy-session

Our hospital scheduling product has 50 feature requests from 40 customers.
Our team can build 6 features this quarter. Help us prioritize based on:

1. Customer impact across our segments (large hospitals, ambulatory, specialty)
2. Implementation effort and technical risk
3. Regulatory/compliance implications
4. Competitive pressure
5. Revenue impact

Feature list: [provide JSON or CSV of features with metadata]
```

**What you'll get**:
- Prioritized backlog with scoring rationale
- Release sequencing across quarters
- Effort estimates and resource planning
- Clinical validation requirements per feature
- Risk assessment
- Customer communication plan

## Best Practices

### Before You Start
- ✅ Gather market data (market reports, customer interviews, competitive analysis)
- ✅ Get executive alignment on strategy scope
- ✅ Identify key stakeholders for the strategy
- ✅ Define success metrics

### During Strategy Development
- ✅ Validate assumptions with market data
- ✅ Involve clinical advisors for healthcare workflow insights
- ✅ Consider regulatory environment early
- ✅ Plan for change management, not just features

### After Strategy Is Complete
- ✅ Share strategy with full team
- ✅ Create quarterly strategy reviews
- ✅ Build dashboards for success metrics
- ✅ Establish feedback loops with customers and clinicians

## Healthcare Context

The skill understands:

- **Clinical Workflows**: How clinicians actually work (EMR navigation, handoffs, interruptions)
- **Regulatory Requirements**: HIPAA, FDA 510(k), state licensing, HIPAA BAAs
- **Economics**: Patient reimbursement, group purchasing, hospital budgets, private pay
- **Adoption Patterns**: Technology adoption in healthcare is slower; enterprises need proof, integration support
- **Key Stakeholders**: Clinicians, nursing, IT, privacy/compliance, finance, operations

## Skill Statistics

- Typical strategy development: **1-2 hours**
- Roadmap coverage: **12-18 months** (detailed phase 1, outlined beyond)
- Financial projection depth: **3-5 years** with sensitivity analysis
- Competitive analysis: **Top 5-10 direct competitors** + 3-5 adjacent competitors
- Success metric coverage: **8-15 KPIs** tied to business strategy

## Related Workflows

Create a complete product strategy using multiple skills:

1. **This Skill** → Develop market strategy and roadmap
2. **Business Requirements Analyst** → Document detailed requirements from roadmap features
3. **Workflow Creator** → Design clinical and admin workflows for each roadmap phase
4. **Frontend Design** → Create prototypes for key workflow interactions
5. **Code Implementation** → Build features in priority order

## Notes

- Base strategy on real market data, not assumptions
- Always involve clinical advisors for healthcare products
- Plan for longer enterprise sales cycles (6-12 months)
- Build in time for HIPAA compliance and data security validation
- Consider ecosystem partners (EHR vendors, cloud platforms, integrators)

Strategy is not a document; it's a living plan. Review quarterly and adjust based on market feedback.
