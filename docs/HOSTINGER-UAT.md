# Hostinger UAT — sanitized deployment evidence

Date / Tanggal: **11 November 2026, Asia/Jakarta**.  
Target: **https://cyan-oryx-350189.hostingersite.com**.  
Scope / Cakupan: initial deployment and frontend smoke tests; real director sign-in and automatic update proof remain pending.

## Provenance / Jejak release

| Item | Verified value / Nilai terverifikasi |
| --- | --- |
| Source branch | `main` |
| Source commit | `b4cebfd9578c2960e3ca40167a24b5905316fb6e` |
| GitHub Actions run | [`42971963802`](https://github.com/hamdanfaizworks-collab/CRM-Product/actions/runs/42971963802) — **SUCCESS** |
| CI jobs | verify + publish-hostinger succeeded |
| Static artifact branch | `hostinger` |
| Artifact commit | `f315da4e2da9c701ef4086771d76e480167b921d` |
| Existing Hostinger site type | PHP/HTML; Git deployment to `public_html` |
| Initial provider deployment | **Completed**, **13:24 WIB**, **3 seconds** |
| Public release metadata | [`/release.json`](https://cyan-oryx-350189.hostingersite.com/release.json), HTTPS **200**, source commit matches |

The existing domain/site was retained. GitHub Actions built React/Vite, and Hostinger deployed compiled static files from the artifact branch. No hosting password gate was added; the user approved a public frontend with invitation-only CRM authentication.

Domain/site yang ada dipertahankan. React/Vite dibangun di GitHub Actions, lalu Hostinger mengambil artifact static. Frontend publik disetujui; data bisnis tetap memerlukan login CRM dan profil aktif.

## Observed browser checks / Pemeriksaan browser teramati

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
| Real director authentication on Hostinger | **PENDING USER HANDOFF** | Previous Sites login was confirmed; this new origin still requires confirmation. |
| Auto-deploy setting | **ON / GREEN OBSERVED** | Setting enabled; a later push-to-origin update has not yet been proven. |
| Auth primary Site URL cutover | **PASS — 13:35 WIB** | Primary origin is Hostinger; both redirects retained, signup/anonymous disabled, minimum password 10. Exactly one property changed; post-push diff is zero. |
| SMTP, invitation/recovery and team rollout | **PENDING** | A live frontend does not prove email deliverability or full team onboarding. |

Screenshot deliverable: **`TTM-Hostinger-deployment.png`**. This record contains no passwords, tokens, administrative keys, session cookies, or real customer data. Do not add authentication screenshots containing credentials to the public repository.

## Remaining sign-off / Verifikasi berikutnya

1. Confirm director sign-in on this exact Hostinger origin and one authenticated business workflow.
2. Confirm the Auth Site URL cutover and retain allowed redirects for the intended origins.
3. Push a subsequent approved release, verify CI/artifact publication, then confirm the target release metadata changes without a manual provider deploy.
4. Complete SMTP/deliverability, team UAT and backup/restore acceptance before claiming full team go-live.

Status saat pencatatan: **frontend Hostinger live; login director origin baru dan verifikasi auto-update masih pending**. / Recorded status: **Hostinger frontend live; new-origin director login and automatic-update verification remain pending**.
