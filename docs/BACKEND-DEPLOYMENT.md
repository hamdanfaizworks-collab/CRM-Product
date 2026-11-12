# Backend deployment record — historical initial snapshot

> **Revisi 12 November 2026:** v1.4 menambahkan approval satu tahap, form hierarki, API wilayah pelanggan, pengingat agenda dan revisi label/login. [Panduan terbaru](APPROVAL-REMINDERS.md). Migrasi tambahan: `20261111205526_single_stage_activity_approval.sql`; koreksi `20261112023647_normalize_approval_note_whitespace.sql`; total setelah deployment: 6 migrasi / 13 tabel publik ber-RLS. Cocokkan source live melalui `/release.json` dan hasil CI. **Semua catatan bertanggal 11 November di bawah adalah histori rilis sebelumnya, bukan bukti deployment v1.4.**


**Current update, 11 November 2026:** the target has **four migrations and 12 RLS-protected business tables**, including deployed `20261111071649_product_knowledge_library`. The local SQL/RLS suite passed **109/109**, and hosted Knowledge Base API checks passed **39/39** with disposable fixtures removed and audit records retained. Both buckets are private: `activity-evidence` **10 MiB**, `product-knowledge` **25 MiB**. Use archive/restore for registered Knowledge Base materials; linked blobs and file identity are retained, and only an uploader's unlinked orphan can be cleaned up. See `KNOWLEDGE-UAT.md` for exact API coverage, signed-URL and CDN-cache verification limits.

**Existing release status remains:** Hostinger is live, automatic updates are proven, and the user confirmed successful Hostinger sign-in for the director pilot. That acceptance is not an agent-observed real-account business workflow. Auth primary Site URL cutover to Hostinger passed at 13:35 WIB with both redirects and existing protections retained. The KB deployment changed no Auth, SMTP, password or Edge Function settings. The historical leaked-password-protection warning is unchanged; KB added only three unused-index INFO notices to the recorded performance snapshot (21 to 24), with no new security finding. PITR is off and no hosted physical backup is available. The approved local business snapshot excludes Auth and Storage blobs. Team SMTP/onboarding, real-business-workflow UAT and backup/restore remain follow-ups.

Current migration history, matching local filenames:

| Version | Name |
| --- | --- |
| `20261110222856` | `ttm_crm_initial` |
| `20261110222904` | `ttm_crm_revoke_rls_auto_enable_execute` |
| `20261111015854` | `ttm_crm_policy_and_fk_indexes` |
| `20261111071649` | `product_knowledge_library` |

The KB deployment dry-run selected only its one additive migration; deployment used `--skip-vault`, `seeds=[]` and `roles=[]`. Its RLS/grants, private bucket, immutable-binding guard, audit/timestamp triggers and Storage FK `ON DELETE RESTRICT` were verified before the separate hosted API harness. No bootstrap, invitation or production sample documents were created by deployment.

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
