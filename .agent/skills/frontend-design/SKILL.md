---
name: frontend-design
description: Create distinctive, production-grade healthcare frontend interfaces for CareSync HIMS with high design quality. Use this skill when the user asks to build web components, pages, dashboards, or clinical workflows (medication entry, vital signs, lab results, appointments). Generates creative, polished code and UI design that balances aesthetics with patient safety and clinical usability.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces for healthcare (CareSync HIMS) that avoid generic \"AI slop\" aesthetics while prioritizing clinical usability and patient safety. Implement real working code with exceptional attention to aesthetic details, accessibility, and clinical workflow.

For **CareSync HIMS**, healthcare-specific considerations override generic design principles:
- **Patient Safety**: Critical interfaces (medication entry, lab results, vital signs) require visual clarity & confirmation over fancy aesthetics
- **Clinical Workflow**: Forms must match how clinicians actually work (tablet-friendly, glove-operable buttons, one-handed use)
- **Accessibility**: WCAG AAA for critical clinical paths (colorblind-safe dosage entry, voice-command prescription, high contrast for pharmacy)
- **Role-Specific Layouts**: Doctor's dashboard ≠ Nurse's dashboard ≠ Pharmacist's queue view ≠ Receptionist's scheduler
- **Data Visualization**: Medical trends (vitals, labs) must be scannable in 3 seconds, abnormal values visually flagged
- **Time-Critical Contexts**: Emergency workflows prioritize speed over aesthetics (critical value alerts, medication conflicts)

## Design Thinking for CareSync

Before coding, understand the clinical context and commit to a design direction that serves patient safety first:
- **Clinical Purpose**: What medical workflow does this solve? (prescription, diagnosis, vital tracking, billing, referral)
- **User Role**: Who uses it? Doctor (complex data, fast decisions), Nurse (tactile, point-of-care, high-frequency actions), Pharmacist (approval queue, visual confirmation), Receptionist (high-volume scheduling), Patient (self-service, reassurance), Lab Tech (specimen tracking)
- **Urgency Context**: Is this critical-path? (medication entry, critical lab alerts = clarity over decoration; appointment reminder = standard; admin settings = can be fancier)
- **Tone**: Choose aesthetic appropriate to role. Clinical interfaces prefer minimal/utilitarian (data-focused) or warm/approachable (patient portal). For CareSync, recommending minimal clarity over maximalist decoration is usually correct.
- **Safety Constraints**: Colorblind-safe colors for dosage indication? Glove-operable buttons (48px+)? Irreversible actions (discharge, delete) require confirmation dialogs with role verification? Voice-command support for prescribing?
- **Differentiation**: What makes this interface **safe & trustworthy**? Visual confirmation before irreversible actions, abnormal value highlighting (red/alert coloring), clinical reference ranges visible, undo or reversal support where safe
- **Role-Specific Adaptation**: Same workflow, different layout (doctor sees full patient history, nurse sees current shift vitals, receptionist sees appointment queue depth)

The user provides frontend requirements: a component, page, dashboard, or clinical workflow to build. For CareSync, include:
- Which role uses this interface? (doctor, nurse, pharmacist, lab, receptionist, patient, admin)
- What clinical workflow does it support? (prescription order/verify/dispense, vital signs entry with trending, lab results with critical value flags, patient admission/discharge, appointment scheduling/cancellation)
- Any accessibility constraints? (colorblind-safe, voice-operable, mobile for bedside/point-of-care, high-contrast for night shift, large buttons for gloved use)
- Technical context: CareSync stack (React 18, TypeScript, Tailwind CSS, TanStack Query, Supabase RLS)

## Frontend Aesthetics Guidelines for CareSync

For healthcare interfaces, aesthetics serve clinical function first:
- **Typography**: Choose fonts that are readable at a glance. For doctors, sans-serif (clean, fast scanning). For patient portals, more personality is OK but readability first. Avoid delicate serif fonts for clinical data (hard to distinguish similar characters: 0 vs O, 1 vs l, 5 vs S).
- **Color & Theme**: Commit to a cohesive aesthetic aligned with role. Critical values (abnormal labs, medication conflicts) use red/orange with high contrast. Normal values use neutral colors. CareSync brand: trust (blues), attention (reds for alerts), calm (greens for normal). Dark mode for night-shift clinical users (reduces eye strain).
- **Motion**: Minimal motion in clinical interfaces (reduces cognitive load). Meaningful micro-interactions only: confirmation animations (checkmark on prescription verification), danger warnings (red pulse on critical value), loading states (spinner with estimated time). Avoid pure decorative animations during patient care.
- **Spatial Composition**: Clinical workflows need clear visual hierarchy. Prescription entry form: drug name large, dosage prominent, interaction warnings above form. Lab results: abnormal values highlighted, reference ranges adjacent, trending graph below. Vital signs: current reading large, historical trend graph, flags for out-of-range.
- **Backgrounds & Visual Details**: Minimal decorative textures in clinical interfaces (reduces distraction). Use subtle scrim layers for information hierarchy. Alert/attention regions can have subtle background color change (alert red = very subtle pink background, not bright red). For patient portals, more warmth and approachability is OK (soft rounded corners, gentle illustrations of health concepts).

### CareSync Color Palette Recommendations
```css
--alert-red: #DC2626    /* Critical values, medication conflicts, blocked actions */
--warning-orange: #F97316 /* Caution, needs verification, review required */
--success-green: #059669 /* Normal range, verified, dispensed */
--info-blue: #3B82F6   /* Informational, help text, appointments */
--neutral-gray: #6B7280 /* Normal data, neutral actions */
--bg-light: #FFFFFF     /* Day shift interfaces */
--bg-dark: #1F2937      /* Night shift interfaces */
```

### CareSync Component Patterns
- **Medication Entry**: Large clear dosage input, adjacent drug interaction warnings with red background, allergy check indicator (green/red), dispensing quantity adjuster
- **Lab Results**: Abnormal values in red/bold, normal values neutral, reference range in parentheses, trending 30-day graph, critical value alert (red box above)
- **Vital Signs**: Large current value, historical trend indicator (↑ ↓ →), out-of-range warning, abnormal color coding (red > 140 systolic BP)
- **Appointment Queue**: Patient name, appointment time, status (waiting/in-progress/complete), role labels (doctor, nurse visibility differences), cancellation (confirmation required)
- **Patient Discharge**: Multi-step form with progress indicator, confirmation checkboxes (patient acknowledged medications, discharge instructions, follow-up date), timestamp, discharge summary auto-fill
- **Pharmacy Dispensing Queue**: Prescription card with medication highlighted, dosage clear, patient allergy flags (red alert if present), interaction warnings, pharmacist approval checkbox, dispensed quantity counter

NEVER in clinical interfaces:
- ❌ Decorative animations that distract from clinical data
- ❌ Very small fonts for critical information (dosage, patient name, lab values)
- ❌ Color-only indicators for abnormal values (must include visual + text, for colorblind users)
- ❌ Hover-dependent information (mobile/tablet users with gloves can't hover)
- ❌ Irreversible actions (discharge, delete prescription) without explicit confirmation from user's verified role

For generic/admin/patient portal interfaces, you can be more creative with aesthetics. But for clinical workflows (prescriptions, vital signs, lab results), patient safety > aesthetics.

**IMPORTANT**: Match implementation complexity to clinical need, not pure aesthetics. A medication entry form may look minimal but needs robust validation, clear error states, and accessibility. Always include WCAG AAA compliance for critical-path clinical features, fallback colors for colorblind users, and keyboard-navigable + mobile-operable interfaces.

Remember: Healthcare interfaces must be trustworthy & safe first, beautiful second. But beautiful UI that is also safe & functional is achievable - that's the CareSync design bar.

## Design Thinking (with Healthcare Priority)

Before coding, understand the context and commit to a design direction that serves the functional goal first:
- **Purpose & Clinical Context**: What problem does this interface solve? Who uses it? (doctor, nurse, patient, lab tech, pharmacist, receptionist, admin). Is it critical-path clinical (medication, vital signs, lab results) or secondary (scheduling, reporting)?
- **User Workflow**: How do they actually work? (tablet at bedside with gloves? Desktop in pharmacy queue? Mobile patient checking appointment? High-frequency actions like prescription entry vs. setup screens?)
- **Tone**: Professional & trustworthy. For clinical workflow interfaces, minimal/utilitarian recommended (clarity > decoration). For patient portals, can add warmth & approachability. For admin dashboards, can be more creative.
- **Constraints**: Technical requirements (React 18, TypeScript, Tailwind, Supabase RLS). Accessibility requirements (WCAG AAA for critical paths, colorblind-safe indicators, voice-operable, mobile/glove-friendly). Safety requirements (confirmations for irreversible actions, visual warnings for abnormal values, undo support where possible).
- **Differentiation**: What makes this interface **safe, fast, and trustworthy**? (clear data hierarchy, confirmation before critical actions, obvious error states, visual emphasis on abnormal values, role-specific views)

**CRITICAL for Healthcare**: Choose a design direction focused on clinical safety & usability first, aesthetics second. Bold minimalism (data-focused) and refined clarity (warm patient-facing) both work. The key is intentionality: every visual choice should serve the clinical workflow, not distract from it.

Then implement working code (React, TypeScript, Tailwind CSS) that is:
- Production-grade, functional, and clinically safe
- Visually clear and scannable (data-dense interfaces can still look intentional)
- Cohesive with a clear point-of-view aligned to role (doctor ≠ patient)
- Meticulously refined in every detail (especially critical-path workflows)

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.
