Here is a comprehensive list of all issues found across every module in CareSync HIMS as the **Administrator** role:

***

## 🔴 Critical / Broken Pages

### 1. Kiosk — 404 Page Not Found [localhost](http://localhost:8080/kiosk)
- **Route:** `/kiosk` (linked from the sidebar under Business Operations)
- The Kiosk sidebar link navigates to `/kiosk` which throws a 404. The page doesn't exist or is mapped to a wrong route.

### 2. Workflow Dashboard — Incorrect URL Guess Gives 404 [localhost](http://localhost:8080/workflow)
- **Route:** `/workflow` results in 404. The actual correct route is `/integration/workflow`.
- The URL structure is inconsistent — all other modules use top-level routes, but Workflow Dashboard is nested under `/integration/`.

***

## 🟠 Data / Logic Inconsistencies

### 3. Dashboard — Active Staff Showing 0 [localhost](http://localhost:8080/dashboard)
- "Active Staff: 0" is shown on the dashboard even though consultations reference doctor names (e.g., Dr. Sarah Wilson), implying staff exist in the system.
- Staff Management also shows "Total Staff: 0" with "No staff members found" — yet consultations and patient records reference assigned doctors. Staff are not being surfaced through the Staff Management module.

### 4. Dashboard — Queue Waiting vs Queue Management Page Mismatch [localhost](http://localhost:8080/queue)
- Dashboard shows **Queue Waiting: 2** and **In Service: 6**, but when you navigate to the Queue Management page, all counters display **0** — the queue data does not persist or render correctly on the Queue Management page. [localhost](http://localhost:8080/dashboard)

### 5. Dashboard — Today's Appointments = 0 Despite Seeded Data [localhost](http://localhost:8080/dashboard)
- The system has 50 patients and historical data, but **Today's Appointments = 0** and the Appointments calendar shows no appointments at all for April 2026.
- The test data seeder creates appointments in the past; none fall on the current date (Apr 24, 2026), which is a data seeding gap.

### 6. Consultations — Stale "Active" Consultations [localhost](http://localhost:8080/consultations)
- Two consultations are marked **Active** — one started **Mar 28** and another on **Apr 7** — meaning they've been "open" for weeks/months with no resolution.
- "Today's Total: 0" even though 2 consultations are marked active, suggesting the date filter logic for "Today's" counts is wrong.

### 7. Staff Management — Total Staff = 0 vs Pending Invitations = 2 [localhost](http://localhost:8080/settings/staff)
- Staff Management shows **0 Total Staff** and **0 Pending Invitations**, but clicking the "Invitations" tab shows "(2)" in the button label — a contradiction on the same page.
- There is no way for the system to function with doctors assigning consultations if there are truly 0 staff.

### 8. Staff Performance — All Zeros / No Data [localhost](http://localhost:8080/settings/performance)
- Patients Seen Today: 0, Appointments Today: 0, Consultations Today: 0, Top Performer: "No data"
- All 0s despite existing consultations and patient data in the system.

### 9. Billing — Unrealistically Low Invoice Amount [localhost](http://localhost:8080/billing)
- The only invoice in the system is for **₹2.00** (INV-000001, Thomas Anderson), which is a seed data quality issue.
- Monthly Revenue on dashboard shows **₹0.0K** — it should reflect at least ₹0.002K or be rounded/displayed more meaningfully.

### 10. Laboratory — Missing Category Field [localhost](http://localhost:8080/laboratory)
- CBC lab order for John Davis shows **"--"** in the Category column, indicating a missing or null value for the lab category field.

### 11. Dashboard — All Performance Metrics at 0.0 [localhost](http://localhost:8080/dashboard)
- Check-in to Nurse: 0.0 min, Lab Turnaround: 0.0 min, Patient Throughput: 0.0/day, No-Show Rate: 0.0% — all metrics are zero, even though consultations and lab orders exist in the system.

***

## 🟡 UI / UX Issues

### 12. Appointments Page — List View Toggle Non-Functional [localhost](http://localhost:8080/appointments)
- The "List" toggle on the Appointments page does not change the view from the Calendar layout. Clicking "List" has no visible effect — the layout remains as a calendar with a right panel.

### 13. Patient Details — Tabs Hidden / Scrollable Tab Bar Not Intuitive [localhost](http://localhost:8080/patients/28ea84a1-17cf-430d-a1d1-2b6deaf910e0)
- The Patient detail page has tab scrolling arrows (suggesting more tabs like Insurance, Medications, etc.), but there's no clear indication to users that more tabs exist beyond "Clinical History, Vitals, Documents." The tab overflow is not discoverable.

### 14. Reports Page — Renders in Mobile/Narrow Layout [localhost](http://localhost:8080/reports?start=2026-04-18&end=2026-04-24)
- Navigating to `/reports` causes the page to render in a **collapsed mobile layout** (sidebar disappears, hamburger menu appears), and this mobile mode **persists** across the entire application even after navigating to other pages.
- This is a **session-level responsive layout bug** — once triggered, the entire app is stuck in mobile mode until refreshed.

### 15. Voice Clinical Notes — Disconnected State [localhost](http://localhost:8080/voice-clinical-notes)
- Voice Input shows **"disconnected"** status immediately on load with "No active session — press Start Recording to begin transcription." No context is given about why it's disconnected or if a backend service is missing. There is no error message — just a silent disconnection.

### 16. Dashboard — Real-time Monitoring Shows 0ms API Performance & 0 DB Connections [localhost](http://localhost:8080/dashboard)
- The Real-time Monitoring tab on the Dashboard shows 0ms for API performance and 0 database connections, which appears to be either placeholder data or a failed metrics fetch.

### 17. Dashboard — "+0 this month" Patient Growth Metric [localhost](http://localhost:8080/dashboard)
- "Total Patients: 50 (+0 this month)" — no growth is recorded this month for 50 patients, suggesting that registration dates for all seeded patients fall in prior months. The "+0 this month" label is misleading and looks like a bug to real users.

***

## 🔵 Navigation / Routing Issues

### 18. Inconsistent URL Structure [localhost](http://localhost:8080/integration/workflow)
- Most routes follow `/module-name` (e.g., `/patients`, `/pharmacy`, `/laboratory`) but Workflow Dashboard is at `/integration/workflow` — the inconsistent nesting makes it impossible to guess URLs and breaks direct linking.

### 19. No Redirect from `/administration` — Shows App-Level 404 [localhost](http://localhost:8080/administration)
- Typing `/administration` directly gives a generic app 404. Since "Administration" in the sidebar is a category header (not a link), it should either redirect to its first sub-item or be clearly non-clickable. Currently it behaves like a dead end.

***

## Summary Table

| # | Module | Issue | Severity |
|---|--------|--------|----------|
| 1 | Kiosk | 404 — broken sidebar link | 🔴 Critical |
| 2 | Workflow Dashboard | Wrong URL in sidebar | 🔴 Critical |
| 3 | Staff Management | Total Staff = 0, contradicts consultant assignments | 🟠 High |
| 4 | Queue Management | Dashboard shows 2+6, Queue page shows 0 | 🟠 High |
| 5 | Appointments | No appointments for today despite 50 patients | 🟠 High |
| 6 | Consultations | Stale active consultations (weeks old); Today = 0 logic bug | 🟠 High |
| 7 | Staff Management | Invitations count mismatch on same page | 🟠 High |
| 8 | Reports | App-wide mobile layout stuck after visiting Reports | 🟠 High |
| 9 | Billing | Seed invoice at ₹2 — unrealistic test data | 🟡 Medium |
| 10 | Laboratory | Missing Category field (shows "--") | 🟡 Medium |
| 11 | Dashboard | All performance metrics = 0 | 🟡 Medium |
| 12 | Appointments | List view toggle doesn't work | 🟡 Medium |
| 13 | Patient Details | Hidden tabs not discoverable | 🟡 Medium |
| 14 | Voice Notes | Disconnected on load — no error context | 🟡 Medium |
| 15 | Dashboard | Real-time monitoring shows 0ms / 0 DB connections | 🟡 Medium |
| 16 | Dashboard | "+0 this month" growth metric always 0 | 🟡 Medium |
| 17 | Staff Performance | All zeros despite existing consultation data | 🟡 Medium |
| 18 | Routing | Inconsistent URL structure for Workflow Dashboard | 🔵 Low |
| 19 | Routing | `/administration` gives 404 instead of redirect | 🔵 Low |