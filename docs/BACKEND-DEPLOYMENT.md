# Backend deployment record — historical initial snapshot

**Current update, 11 November 2026:** the target now has **three migrations**, including `20261111015854_ttm_crm_policy_and_fk_indexes`; 23 hosted API checks passed. **Hostinger is live, automatic updates are proven, and the user explicitly confirmed successful Hostinger sign-in; the release is ready for the director pilot.** This user acceptance is not an agent-observed real-account workflow. Auth primary Site URL cutover to Hostinger passed at 13:35 WIB: only `auth.site_url` changed, post-push diff is zero, both redirects and signup/anonymous/password protections remain. The latest Auth advisor warns about leaked-password protection; the zero-finding result below was an earlier snapshot. PITR is off and no hosted physical backup is available. An approved local business snapshot excludes Auth and Storage blobs. SMTP/team onboarding, real-business-workflow UAT and backup/restore remain follow-ups. See `BACKEND.md`, `HOSTED-UAT.md`, `HOSTINGER-UAT.md`, and `RELEASE.md` for current evidence.

The following paragraphs preserve the **initial deployment record**; their pending Auth/bootstrap items and original performance findings are historical, not the current status.

Deployed through `supabase-deploy` to the confirmed target: `https://yqmcafgnryvsrvalbycz.supabase.co`. Initial inspection found no public tables or migrations. The read-only server was untouched.

Exact remote migration history:

| Version | Name |
|---|---|
| `20261110222856` | `ttm_crm_initial` |
| `20261110222904` | `ttm_crm_revoke_rls_auto_enable_execute` |

Use these remote-generated versions to align local migration filenames.

Completed and verified:

- Applied the entire unchanged initial SQL.
- Verified `public.rls_auto_enable()` as an RLS event-trigger helper; revoked EXECUTE from PUBLIC, anon and authenticated. Its body and event trigger remain unchanged.
- Executed the entire seed: **87 products**, all with matching provenance across **24 source pages**: 4, 6, 8, 10, 12–31.
- All **11 CRM tables have RLS enabled**; anonymous table privileges are absent.
- Audit INSERT/UPDATE/DELETE/TRUNCATE privileges are absent for anon/authenticated. All eight CRM helper functions reside in `private`, with no counterparts in `public`.
- `activity-evidence` is **private (`public=false`)**, limited to **10 MiB**, allowing PDF, PNG, JPEG and DOCX.
- Deployed exact `team-admin` source: **version 1, ACTIVE**, entrypoint `index.ts`, **`verify_jwt=true`**.

Security advisors now return **zero findings**; both pre-existing helper-execution warnings were resolved. New performance findings remain: **2 [multiple-policy warnings](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)**, **12 [unindexed-FK notices](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)** and **22 [unused-index notices](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)**.

Pending because no supported Auth configuration or administration tools are exposed:

- Disable public and anonymous signup.
- Set Site URL and allowed redirect to `https://ttm-product-workspace.hamdanfaiz.chatgpt.site`.
- Bootstrap administrator `hamdanfaizworks@gmail.com`.

No remote deployment errors or rejected actions occurred. No accounts, invitations or emails were created. **Authenticated end-to-end testing remains separate; this is not go-live.**
