# Release Notes Template — CareSync AI
## AroCord Hospital Information Management System

---

## How to Use This Template

1. Copy the `## vX.Y.Z — YYYY-MM-DD` section below for each release
2. Categorize changes under the correct heading (New Features, Improvements, Bug Fixes, Security, Breaking Changes)
3. Include customer-facing language — avoid technical jargon
4. Link to related documentation updates where applicable
5. Publish to: in-app release banner + website changelog + email to hospital admins

---

## Release Notes Format

```markdown
## vX.Y.Z — YYYY-MM-DD
**Type**: Major | Minor | Patch | Hotfix
**Impact**: All users | [Role] only | Admins only
**Migration**: Required | None

### ✨ New Features
Brief description of what was built and what value it delivers.

- **[Module]**: [Feature name] — [1-sentence description of what it does and why it matters]
- **[Module]**: [Feature name] — [description]

### 🔧 Improvements
Enhancements to existing functionality.

- **[Module]**: [What improved] — [Benefit to users]

### 🐛 Bug Fixes
Issues resolved in this release.

- Fixed: [Brief description of the bug and impact]
- Fixed: [Brief description]

### 🔒 Security Updates
Security patches and compliance improvements.

- [Description of security improvement — avoid disclosing exploit details]

### ⚠️ Breaking Changes
Changes that require action from hospital administrators.

> **Action required**: [What admins need to do before/after update]
- [Change description and migration path]

### 📖 Documentation Updates
- Updated [document name]: [what changed]

### 🙏 Acknowledgements
Thanks to [pilot hospital] for reporting [issue / suggesting feature].
```

---

## Release History

### v1.2.0 — 2025-07-17
**Type**: Minor  
**Impact**: All users  
**Migration**: None

#### ✨ New Features
- **UX**: Dark mode now fully supported across all dashboards with WCAG AA contrast ratios for all badge types
- **Navigation**: Page titles now update dynamically as you navigate, making it easier to identify your current location in the system
- **Sign-Up**: Mobile users now see a visual step progress indicator when creating their hospital account
- **Role Selection**: Your preferred role is now remembered between sessions — no need to re-select each login

#### 🔧 Improvements
- **Sidebar**: Tooltip popups in the collapsed sidebar now have a small delay to prevent accidental triggers during navigation
- **Sidebar**: Keyboard users can now press `Escape` to close the mobile navigation drawer
- **Forms**: Multi-step forms now preserve your entered data if you accidentally navigate away
- **Stats**: Large numbers on summary cards now display in compact format (e.g., "1.2k" instead of "1200")
- **Toast Notifications**: Alert toasts moved to top-right corner so they no longer block form fields at the bottom of the screen

#### 🐛 Bug Fixes
- Fixed: Login error messages were not read aloud by screen readers — now announces with `aria-live`
- Fixed: Hero panels on login/signup pages had invisible white text in dark mode
- Fixed: Google Fonts caused a flash of unstyled text (FOUT) on first load
- Fixed: Sidebar group separators appeared incorrectly in collapsed mode

#### 🔒 Security Updates
- All PHI field encryption confirmed at 100% coverage across patient records module
- RLS policy audit passed — no cross-hospital data leakage paths identified

---

### v1.1.0 — 2025-06-15
**Type**: Minor  
**Impact**: All users  
**Migration**: None

#### ✨ New Features
- **Auth**: Role selection screen on login — staff now explicitly choose their role when logged into multiple roles
- **Dashboard**: Doctor dashboard now loads patient queue in real-time using Supabase Realtime
- **Patients**: Patient registration form with HIPAA-compliant PHI encryption

#### 🔧 Improvements
- Improved loading performance for patient list (TanStack Query cache with hospital-scoped keys)
- Appointment scheduling now shows doctor availability in real-time

#### 🐛 Bug Fixes
- Fixed: Doctor dashboard failed to load for users with hyphenated names in their profile
- Fixed: Dynamically imported `LoginPage.tsx` caused "Failed to fetch" error on slow connections

---

### v1.0.0 — 2025-05-01
**Type**: Major  
**Impact**: All users  
**Migration**: Initial release — no prior state

#### ✨ New Features
- Initial platform launch for pilot hospitals
- Core authentication with Supabase (email/password)
- Hospital admin dashboard
- Patient registration (demographics)
- Basic appointment scheduling
- Role-based access: Admin, Doctor, Nurse, Receptionist, Pharmacist, Lab Tech, Patient

---

## Upcoming Releases

| Version | Target Date | Theme | Key Features |
|---------|------------|-------|-------------|
| v1.3.0 | Q2 2025 | Clinical Notes | SOAP EHR notes, ICD-10 integration, vitals entry |
| v1.4.0 | Q2 2025 | Pharmacy | Prescription queue, drug interaction alerts, dispensing |
| v1.5.0 | Q2 2025 | Laboratory | Lab orders, sample tracking, result entry, critical alerts |
| v2.0.0 | Q4 2025 | Platform Scale | Analytics, Billing, Mobile app, Multi-tenant |

---

## Versioning Policy

CareSync AI follows [Semantic Versioning](https://semver.org/):

| Version Bump | When | Example |
|-------------|------|---------|
| **Patch** (X.Y.Z+1) | Bug fixes, security patches | 1.2.0 → 1.2.1 |
| **Minor** (X.Y+1.0) | New features (backward-compatible) | 1.2.0 → 1.3.0 |
| **Major** (X+1.0.0) | Breaking changes, architecture shifts | 1.x → 2.0.0 |
| **Hotfix** | Critical security or patient safety fix | Out-of-band |

**Hotfix Policy**: Any bug affecting patient safety, PHI exposure, or inability to dispense medications is classified as a hotfix and released within 24 hours of identification.
