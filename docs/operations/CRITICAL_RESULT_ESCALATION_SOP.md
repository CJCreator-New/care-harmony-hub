# Critical lab result escalation: interim telephone procedure

Status: interim, in force until roadmap task S0-08 is signed off (automatic escalation verified in staging).
Owner: Laboratory lead and Medical Director. Review weekly while in force.

## Why this exists

The automatic escalation ladder (notify the primary clinician at 0 min, on-call at 5 min, Emergency Department at 10 min) does not work in the current release. See audit findings EDGE-03 and CLIN-10 in `docs/repository-audit/`. **No one is paged, texted or emailed automatically.** Until it is fixed, the telephone procedure below is the escalation mechanism, and the in-app banner is only a reminder.

## The in-app safeguard

- Every dashboard page shows a red banner, titled "Unacknowledged critical lab results", for any lab order flagged critical whose read-back has not been recorded.
- **Who sees it:**
  - **From 0 min:** the ordering clinician, laboratory staff and administrators.
  - **From 5 min:** every doctor and nurse in the hospital.
  - **From 10 min:** the same people, and the banner asks them to escalate to the ED.
- It cannot be dismissed. It clears for everyone only when the laboratory records the clinician read-back (Laboratory → Record Clinician Read-Back).
- A clinician's "I have reviewed this result" hides it for that clinician only, and is written to the activity log. It does **not** replace the laboratory's read-back.
- If the banner shows "Critical-result safeguard unavailable", the app cannot load critical results. Use the telephone procedure for every critical result, and tell IT.
- The banner checks every 30 seconds. It works only while someone is signed in, so it does not replace the phone calls.

## Procedure (laboratory staff)

1. **0 min: result verified as critical.** Phone the ordering clinician immediately. Read the result and ask the clinician to repeat it back. Record the read-back in the app with the clinician's name and role, and the time.
2. **5 min: ordering clinician not reached.** Phone the on-call doctor for the ward or service. Use the posted on-call rota; the app has no on-call list yet. Record the read-back with the on-call doctor's name.
3. **10 min: on-call not reached.** Phone the Emergency Department lead or charge nurse. Record the read-back.
4. **15 min: still not acknowledged.** Phone the Medical Director or administrator on duty, and file an incident report.

At every step, write in the lab order's result notes who you called, at what time, and the outcome, including unanswered calls.

## Procedure (clinicians)

- If the banner shows a result for your patient, review the patient and phone the laboratory to complete the read-back. Logging receipt in the app is not enough.
- If you are on call and see a banner at the 5-minute or 10-minute stage, treat it as a page.

## Ending this procedure

Retire this SOP only after the S0-08 Definition of Done is met in staging: an unacknowledged critical result escalates to on-call at 5 minutes and to the ED at 10 minutes, with audit rows, and a manual drill has passed. Record the sign-off date here.
