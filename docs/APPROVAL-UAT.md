# Approval revision acceptance — 12 November 2026

Target: Supabase project `yqmcafgnryvsrvalbycz` (CRM-Product). The additive hierarchy/approval migration and whitespace-validation correction are deployed. Existing customer, product, document and Director records were not modified by acceptance fixtures.

- **94 application tests passed:** Auth-only login, bilingual UI, canonical label collisions, customer province/regency API/fallback behavior, approval/hierarchy UI, reminders and existing business/Knowledge Base flows.
- **188 SQL/RLS checks passed:** six migrations, 13 public business tables protected by RLS, booking/workflow/Knowledge Base regressions, supervisor review scope, immutable decision identity/time, no self-review, hierarchy cycles and whitespace-only rejection reasons.
- **5 deployment environment checks passed** and **TypeScript/Hostinger production build passed**.
- **40/40 hosted API checks passed**, completed **12 November 2026, 09:39 WIB**. Separate authenticated HTTP requests proved that opposite hierarchy edges admit only one edge and simultaneous approve/reject requests record only one decision. Unauthorized reviewers, owner/director self-review, unassigned admins, business-field mutation during approval, forged actor/time, blank/long notes and inactive supervisor tokens were rejected. Supervisor approval, Director fallback, explicit admin-supervisor assignment, reschedule/reset and rejection/resubmission worked.
- Cleanup verified **7 disposable Auth users, 7 profiles, 6 internal activities and 4 hierarchy rows** removed. Append-only audit events remain intentionally. The first acceptance attempt exposed the tab-only rejection-reason gap; the corrective migration was applied and the complete hosted suite then passed.

These backend/local results do not alone prove frontend deployment. Release acceptance also requires both GitHub Actions jobs to pass, exact source provenance in the Hostinger `/release.json`, HTTP checks, and a production UI inspection. Full real-team workflow acceptance and SMTP/onboarding remain separate from disposable fixture tests. Reminders run inside an open application; there is no background email/push service.

Operational instructions: [APPROVAL-REMINDERS.md](APPROVAL-REMINDERS.md). Earlier Knowledge Base and booking acceptance evidence remains dated in the existing UAT documents.
