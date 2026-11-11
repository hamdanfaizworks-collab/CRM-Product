# Status release / Release status — TTM Product CRM

Tanggal / Date: **11 November 2026, Asia/Jakarta**.

**Status:** **frontend Hostinger live**; verifikasi login director pada origin baru dan bukti auto-update masih pending. Backend, pilot director di Sites, dan validasi release bilingual telah diverifikasi. / **The Hostinger frontend is live**; director sign-in on the new origin and automatic-update verification remain pending. The backend, Sites director pilot, and bilingual release validation are verified.

## Bukti terkini / Current evidence

| Area | Status | Bukti dan batas / Evidence and limit |
| --- | --- | --- |
| PRD dan katalog / PRD and catalog | COMPLETE | PRD mendahului implementasi; 32 halaman raster ditinjau; 87 model/family/varian, bukan master SKU final. / PRD preceded implementation; 32 raster pages reviewed; 87 models/families/variants, not a final SKU master. |
| Brand dan UI / Branding and UI | IMPLEMENTED | Inter, logo asli, primary `#174B8A`; sandbox dipisahkan dari data operasional Supabase. / Inter, original logo, primary `#174B8A`; sandbox is separate from operational Supabase data. |
| Indonesia / English | IMPLEMENTED; VERIFIED | Pemilih pada login/ruang kerja; default `id`, preferensi localStorage, locale `id-ID`/`en-GB`, data pengguna tetap. / Login/workspace selector; default `id`, localStorage preference, locale-aware display, user data unchanged. |
| Tes aplikasi / Application tests | **51 / 51 PASS** | Suite final mencakup domain, alur DOM, callback Auth, bilingual, preservasi data dan pesan error Edge. / The final suite covers domain rules, DOM flows, Auth callbacks, bilingual behavior, data preservation and Edge errors. |
| Guard environment deployment | **5 PASS** | Target proyek dan publishable key diperiksa; secret pada variabel browser ditolak tanpa dicetak. / Verifies the project and publishable key; rejects browser-exposed secrets without printing them. |
| PostgreSQL/RLS lokal / Local PostgreSQL/RLS | **47 PASS** | Role, ownership, workflow, konflik interval, last-admin, attachment privat, konteks tugas, dan riwayat anggota nonaktif. / Roles, ownership, workflow, intervals, last-admin, private evidence, task context, and inactive-member history. |
| API hosted Supabase | **23 PASS** | Auth, REST, Storage, Edge Function, persistensi, tiga race overlap, adjacency, serta pencabutan akses setelah deaktivasi. Detail di `HOSTED-UAT.md`. / Actual Auth/REST/Storage/Edge APIs, persistence, three overlap races, adjacency, and access removal after deactivation. |
| Pilot director | SITES CONFIRMED; HOSTINGER PENDING | Login director sebelumnya dikonfirmasi di Sites. Handoff login nyata pada origin Hostinger masih menunggu pengguna. / The director previously confirmed Sites sign-in; real sign-in on the Hostinger origin awaits the user handoff. |
| SMTP dan rollout tim / SMTP and team rollout | PENDING | Deliverability undangan/recovery dan onboarding anggota belum dinyatakan lulus; pilot director dapat berjalan sambil konfigurasi diselesaikan. / Invitation/recovery deliverability and team onboarding are not yet signed off. |
| Build TypeScript/produksi / TypeScript/production build | **PASS** | `npm run build:hostinger` final lulus (guard environment, TypeScript, Vite). Edge Function sebelumnya lulus Deno typecheck. / The final guarded Hostinger build passed; the Edge Function previously passed Deno type checking. |
| Backup dan advisor / Backup and advisors | FOLLOW-UP REQUIRED | Snapshot bisnis lokal dibuat dengan persetujuan pengguna; tidak mencakup Auth/Storage blobs. PITR off dan belum ada hosted physical backup; advisor Auth terakhir memberi peringatan leaked-password protection. / An approved local business snapshot excludes Auth and Storage blobs. PITR is off, no hosted physical backup is available, and the latest Auth advisor warns about leaked-password protection. |
| Hostinger frontend | **LIVE — INITIAL MANUAL DEPLOY VERIFIED** | hPanel Completed pada 13:24 WIB, durasi 3 detik; HTTPS release metadata cocok dengan commit source; smoke test bilingual dan demo lulus. / hPanel reported Completed at 13:24 WIB in 3 seconds; HTTPS release metadata matches the source commit; bilingual and demo smoke tests passed. |
| Auto-deploy | ENABLED; PUSH PROOF PENDING | Indikator hPanel hijau/ON, tetapi siklus push baru → CI → artifact → pembaruan origin belum dibuktikan. / hPanel shows ON/green, but a subsequent push-to-live update cycle is not yet proven. |

Hasil final lokal: 51 tes aplikasi, 5 tes guard environment, 47 tes SQL/RLS, dan build Hostinger lulus. Kamus memuat 695 entri; pemeriksaan 547 literal tidak menemukan key hilang; 42 pesan DB/Edge dipetakan secara tepat. Bukti tersebut tidak menggantikan hasil deployment Hostinger. / Final local checks passed: 51 application tests, 5 environment tests, 47 SQL/RLS checks, and the Hostinger build. The dictionary contains 695 entries; 547 checked literals had no missing keys; 42 DB/Edge messages have exact translations. These checks do not prove Hostinger deployment.

## Bukti deployment Hostinger / Hostinger deployment evidence

- Source `main`: [`b4cebfd9578c2960e3ca40167a24b5905316fb6e`](https://github.com/hamdanfaizworks-collab/CRM-Product/commit/b4cebfd9578c2960e3ca40167a24b5905316fb6e).
- [GitHub Actions run `42971963802`](https://github.com/hamdanfaizworks-collab/CRM-Product/actions/runs/42971963802): **SUCCESS**, jobs verify dan publish / verify and publish jobs.
- Artifact branch `hostinger`: `f315da4e2da9c701ef4086771d76e480167b921d`.
- hPanel deployment pertama **Completed**, 11 November 2026 pukul **13:24 WIB**, durasi **3 detik** / first deployment Completed at 13:24 WIB, duration 3 seconds.
- [`release.json` melalui HTTPS](https://cyan-oryx-350189.hostingersite.com/release.json): **HTTP 200**, `source_commit` cocok dengan source di atas / matches the source above.
- Browser pada origin Hostinger: layar login ID/EN, persistensi bahasa setelah reload, demo Dashboard, Catalog 87 entri, Calendar, Reports, dan unduhan CSV English **PASS**. Ini pengujian frontend/demo, bukan login director nyata. / Hostinger-origin login language, reload persistence, demo modules, and English CSV download passed; this is not real director authentication.

Rincian sanitized terdapat pada `HOSTINGER-UAT.md`. Screenshot deployment disimpan sebagai deliverable `TTM-Hostinger-deployment.png`; tidak memuat credential. / Sanitized details are in HOSTINGER-UAT; the deployment screenshot is a separate deliverable without credentials.

## Backend dan data / Backend and data

Target Supabase `yqmcafgnryvsrvalbycz` telah menerima **tiga migrasi**: initial schema, hardening helper, serta indeks FK/policy. Tersedia 87 produk, 11 tabel ber-RLS, bucket bukti privat maksimum 10 MiB, serta `team-admin` dengan verifikasi JWT. Hasil nol temuan keamanan setelah hardening adalah snapshot historis; advisor Auth terbaru memberi peringatan leaked-password protection. Perincian riwayat deployment ada di `BACKEND-DEPLOYMENT.md`; hasil layanan nyata ada di `HOSTED-UAT.md`.

The target Supabase project has three migrations (initial schema, helper hardening, and FK/policy indexes), 87 products, 11 RLS-protected tables, private evidence storage limited to 10 MiB, and a JWT-verified `team-admin` function. The earlier zero-finding security result is historical; the latest Auth advisor warns about leaked-password protection. Deployment history and actual API acceptance results are documented separately.

Fixture hosted dibersihkan dengan ID yang dibuat penguji; audit append-only tetap menjadi jejak pengujian. Tidak ada data pasien atau identitas anggota fiktif yang dijadikan data produksi. / Hosted test fixtures were cleaned using their generated IDs; append-only audit events remain as the test trace. No patient data or fictitious team identities were promoted to production.

## Jalur Hostinger yang digunakan / Actual Hostinger path

Inspeksi hPanel menunjukkan target saat ini berupa **PHP/HTML**, dengan Git deployment branch dan direktori `public_html`; tidak tersedia build command pada wizard tersebut. Jalur release mempertahankan site/domain yang ada:

`GitHub main → GitHub Actions (Node 24, npm ci, checks, npm run build:hostinger) → isi dist pada branch hostinger → Hostinger Git → public_html`.

The existing site remains PHP/HTML. React/Vite is built in GitHub Actions, and only the static build output is published to the `hostinger` artifact branch for Hostinger Git to deploy into `public_html`. This does not require a new site or domain migration. CI tests and an artifact branch do not by themselves prove Hostinger deployment succeeded.

Frontend publik telah disetujui pengguna; akses CRM tetap invitation-only melalui login Supabase dan profil aktif. Tidak ada hosting password gate tambahan yang diminta. / The user approved a public frontend with invitation-only CRM sign-in and active membership. No additional hosting password gate is required.

Hanya URL Supabase dan publishable key publik yang masuk browser; secret administratif tetap pada backend/operator. Repository variables atau public defaults workflow tidak boleh diganti dengan `service_role`, `sb_secret_...`, password, atau access token. / Only the public Supabase URL and publishable key enter the browser; administrative credentials remain server-side.

## Verifikasi tersisa dan rollout / Remaining verification and rollout

1. Pertahankan jejak source/CI/artifact/deployment yang sudah lulus; buktikan pembaruan otomatis dengan push release berikutnya dan metadata origin yang baru. / Retain the verified provenance and prove automatic updates with a subsequent push and changed origin metadata.
2. Selesaikan handoff login director nyata di Hostinger. Primary Auth Site URL telah dipindahkan dan diverifikasi pada 13:35 WIB; kedua redirect serta perlindungan Auth dipertahankan. / Complete the real director sign-in handoff on Hostinger. The primary Auth Site URL cutover was verified at 13:35 WIB, retaining both redirects and Auth protections.
3. Uji satu alur peluang → kegiatan → approval → laporan → follow-up dari sesi director di origin baru. Demo dan 23 pengujian API hosted tidak menggantikan UAT akun nyata pada origin itu. / Test one business workflow from the director's new-origin session; demo and API checks do not replace that real-account UAT.
4. SMTP/undangan/recovery, daftar anggota dan unit nyata, backup/retensi, restore drill, serta UAT tim dicatat sebelum rollout penuh. / Record SMTP/onboarding, real members and units, backup/retention, a restore drill, and team UAT before full rollout.

Frontend live tidak berarti rollout tim penuh selesai. SMTP, undangan/recovery, backup/restore, dan persetujuan UAT tetap mengikuti bukti masing-masing. / A live frontend does not mean full team rollout is complete; email, backup/restore, and UAT retain their own acceptance evidence.
