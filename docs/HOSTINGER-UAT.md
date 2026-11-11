# Hostinger UAT — sanitized deployment evidence

## Current verified feature deployment / Deployment fitur terkini

**LIVE — DEFAULT ENGLISH + PRODUCT KNOWLEDGE BASE**, **11 November 2026**.

| Item | Verified result / Hasil terverifikasi |
| --- | --- |
| Hostinger target | [https://cyan-oryx-350189.hostingersite.com](https://cyan-oryx-350189.hostingersite.com) |
| Feature source | [`b8396896966c0c123ecac06001f1a0852ee3c12f`](https://github.com/hamdanfaizworks-collab/CRM-Product/commit/b8396896966c0c123ecac06001f1a0852ee3c12f) |
| CI run | [`43014085080`](https://github.com/hamdanfaizworks-collab/CRM-Product/actions/runs/43014085080) — **SUCCESS**, verify + publish |
| Static artifact | `hostinger` commit **`349fdec5acde88f06a6b70289990d029fc4ab086`** |
| Live metadata | HTTPS `/release.json` matches feature source `b8396896966c0c123ecac06001f1a0852ee3c12f` |
| HTTP smoke | **13/13 PASS, 18:43 WIB** |
| Connected director UI | `#knowledge` page loads without MODE DEMO; English UI and upload modal opened; 12 tables loaded and 0 Knowledge Base documents at inspection |
| Write boundary | Read/form inspection only: **no production file upload and no customer-data writes** |
| Evidence image | Sanitized deliverable **`TTM-Knowledge-Base.png`** |
| Local verification | **68 app tests, 109 SQL/RLS checks, 5 environment checks, production build PASS** |
| Knowledge Base hosted API | **39/39 PASS**, fixtures cleaned; audit retained and original user data unchanged |

Native browser production-preview QA separately passed fresh English default, Indonesian toggle, demo file upload → reload → download with identical hash, catalog product shortcut/filter, file-size validation, and no horizontal page overflow. Preview storage tests and the connected production page/form inspection have distinct boundaries.

Pemeriksaan hosted awal mempunyai satu false failure karena harness menguji object melalui GET/CDN cache. Harness diperbaiki untuk memeriksa Storage listing; rerun final **39/39 PASS**. Fixture yang dibersihkan: 5 Auth users, 4 profiles, 2 tracked document IDs dan 3 object paths. Audit tetap dipertahankan. Laporan teknis sanitized: **`TTM-Knowledge-Hosted-UAT.json`**. Ini bukan kegagalan produk yang dibiarkan terbuka.

The feature is complete and live. Full team business-workflow UAT, SMTP/invitation/recovery delivery and backup/restore acceptance remain separate. This evidence names the deployed feature source; it does not claim the outcome of any subsequent documentation commit or CI run. See [the Knowledge Base guide](KNOWLEDGE-BASE.md) and [release status](RELEASE.md).

## Historical Hostinger evidence / Bukti Hostinger sebelumnya

**The record below is preserved as earlier-release history. Its source, counts, defaults and user-confirmation boundary describe that previous snapshot, not the current feature verification above.**

Date / Tanggal: **11 November 2026, Asia/Jakarta**.
Target: **https://cyan-oryx-350189.hostingersite.com**.
Status / Status: **READY FOR DIRECTOR PILOT**. Hostinger is live, automatic updates are proven, and the user explicitly confirmed successful Hostinger sign-in. Team SMTP, real-business-workflow UAT and backup/restore remain follow-ups. User confirmation is not an agent-observed authenticated dashboard/workflow.

### Provenance / Jejak release

| Item | Verified value / Nilai terverifikasi |
| --- | --- |
| Source branch | `main` |
| Latest verified application source | `630bf0762c5c76944d926b688d2b2b9c2219f6d0` |
| GitHub Actions run | [`42973665518`](https://github.com/hamdanfaizworks-collab/CRM-Product/actions/runs/42973665518) — **SUCCESS**, both jobs |
| CI jobs | verify + publish-hostinger succeeded |
| Static artifact branch | `hostinger` |
| Artifact commit | `b41f3ce05110d9dfab3258e4a92faa41400676e3` |
| Existing Hostinger site type | PHP/HTML; Git deployment to `public_html` |
| Initial provider deployment | **Completed**, **13:24 WIB**, **3 seconds** |
| Proven automatic update | **Completed**, **13:37 WIB**, **4 seconds**, no Redeploy click |
| Public release metadata | [`/release.json`](https://cyan-oryx-350189.hostingersite.com/release.json), HTTPS **200**, source commit matches |
| HTTP verification | **13/13 PASS**, **13:38 WIB**; sanitized deliverable `TTM-Hostinger-checks.json` |

Initial deployment history: source `b4cebfd9578c2960e3ca40167a24b5905316fb6e` → CI `42971963802` SUCCESS → artifact `f315da4e2da9c701ef4086771d76e480167b921d` → initial manual deployment Completed 13:24 WIB (3 seconds). The later source/CI/artifact above updated the same origin automatically at 13:37 WIB without a Redeploy click. The live release metadata changed to the later source commit. This proves the update cycle; it does not predict the result of an upcoming documentation commit or a future CI run.

The existing domain/site was retained. GitHub Actions built React/Vite, and Hostinger deployed compiled static files from the artifact branch. No hosting password gate was added; the user approved a public frontend with invitation-only CRM authentication.

Domain/site yang ada dipertahankan. React/Vite dibangun di GitHub Actions, lalu Hostinger mengambil artifact static. Frontend publik disetujui; data bisnis tetap memerlukan login CRM dan profil aktif.

### Observed browser checks / Pemeriksaan browser teramati

| Check / Pemeriksaan | Result / Hasil | Boundary / Batas |
| --- | --- | --- |
| Public root serves CRM over HTTPS | PASS | The old root content is replaced by the CRM login screen. |
| Login screen in Indonesian and English | PASS | UI rendering only; no director credential used by the agent. |
| Language preference after reload | PASS | Tested on the actual Hostinger origin. |
| Demo Dashboard | PASS | Browser sandbox; not operational Supabase data. |
| Demo Catalog | PASS | 87 catalog entries visible. |
| Demo Calendar | PASS | Navigation/rendering smoke test. |
| Demo Reports | PASS | Reports render on the Hostinger origin. |
| English CSV download | PASS | Download observed; no real customer export was required. |
| Director sign-in acceptance on Hostinger | **USER CONFIRMED** | User explicitly stated “login Hostinger berhasil”. The agent did not observe a real-account authenticated dashboard or business workflow. |
| Automatic update | **PROVEN** | Source `630bf076…` reached live metadata through CI/artifact and hPanel Completed 13:37 WIB without a Redeploy click. |
| Auth primary Site URL cutover | **PASS — 13:35 WIB** | Primary origin is Hostinger; both redirects retained, signup/anonymous disabled, minimum password 10. Exactly one property changed; post-push diff is zero. |
| SMTP, invitation/recovery and team rollout | **PENDING** | A live frontend does not prove email deliverability or full team onboarding. |

The 13 HTTP checks at 13:38 WIB passed, including HTTP→HTTPS 301 redirection, asset MIME types, `nosniff`, PRD HTTP 200, `.env`/`.git` HTTP 403, SPA HTTP 200, and missing-asset HTTP 404. These are public-origin checks; they do not claim real-business-workflow UAT. Sanitized results are in the separate `TTM-Hostinger-checks.json` deliverable.

Screenshot deliverable: **`TTM-Hostinger-deployment.png`**. This record contains no passwords, tokens, administrative keys, session cookies, or real customer data. Do not add authentication screenshots containing credentials to the public repository.

### Remaining sign-off / Verifikasi berikutnya

1. Complete one authenticated business workflow with the director's real account/data; successful login has already been accepted by the user.
2. Retain the verified Auth cutover and redirects; test invitation/recovery after email configuration is ready.
3. Keep source/CI/artifact/live-metadata evidence for every later release. Automatic updates are already proven for source `630bf076…`.
4. Complete SMTP/deliverability, team UAT and backup/restore acceptance before claiming full team go-live.

Status saat pencatatan: **siap pilot director; frontend Hostinger live, auto-update terbukti, login dikonfirmasi pengguna**. / Recorded status: **ready for the director pilot; Hostinger live, automatic updates proven, sign-in user-confirmed**.

### Rollback yang didokumentasikan / Documented rollback

Revert the source change through GitHub `main` while preserving history; let CI rebuild and publish the `hostinger` branch, then verify the provider result and live `release.json`. Do not reset the production database. No unobserved hPanel rollback feature is assumed. Release archives are separated: source from the final source HEAD, static output from the verified `origin/hostinger`; the local business-data snapshot is excluded from both.
