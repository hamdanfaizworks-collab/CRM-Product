# Status release / Release status — TTM Product CRM

Tanggal / Date: **11 November 2026, Asia/Jakarta**.

**Status:** backend, pilot director, dan validasi release bilingual sudah diverifikasi. **Deployment Hostinger masih pending.** / The backend, director pilot, and bilingual release validation have been verified. **Hostinger deployment is still pending.**

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
| Pilot director | CONFIRMED | Pengguna mengonfirmasi director dapat login. Tidak ada password bawaan pada source. / The user confirmed the director can sign in. No default password is stored in source. |
| SMTP dan rollout tim / SMTP and team rollout | PENDING | Deliverability undangan/recovery dan onboarding anggota belum dinyatakan lulus; pilot director dapat berjalan sambil konfigurasi diselesaikan. / Invitation/recovery deliverability and team onboarding are not yet signed off. |
| Build TypeScript/produksi / TypeScript/production build | **PASS** | `npm run build:hostinger` final lulus (guard environment, TypeScript, Vite). Edge Function sebelumnya lulus Deno typecheck. / The final guarded Hostinger build passed; the Edge Function previously passed Deno type checking. |
| Backup dan advisor / Backup and advisors | FOLLOW-UP REQUIRED | Snapshot bisnis lokal dibuat dengan persetujuan pengguna; tidak mencakup Auth/Storage blobs. PITR off dan belum ada hosted physical backup; advisor Auth terakhir memberi peringatan leaked-password protection. / An approved local business snapshot excludes Auth and Storage blobs. PITR is off, no hosted physical backup is available, and the latest Auth advisor warns about leaked-password protection. |
| Hostinger target | **PENDING — NOT LIVE** | `https://cyan-oryx-350189.hostingersite.com`; deployment dan smoke test belum terbukti sukses. / Provider deployment and target-origin smoke tests are not yet confirmed. |

Hasil final lokal: 51 tes aplikasi, 5 tes guard environment, 47 tes SQL/RLS, dan build Hostinger lulus. Kamus memuat 695 entri; pemeriksaan 547 literal tidak menemukan key hilang; 42 pesan DB/Edge dipetakan secara tepat. Bukti tersebut tidak menggantikan hasil deployment Hostinger. / Final local checks passed: 51 application tests, 5 environment tests, 47 SQL/RLS checks, and the Hostinger build. The dictionary contains 695 entries; 547 checked literals had no missing keys; 42 DB/Edge messages have exact translations. These checks do not prove Hostinger deployment.

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

## Syarat menyatakan Hostinger live / Hostinger sign-off

1. Suite final, build, dan CI lulus pada commit yang diketahui; branch `hostinger` memuat hanya artifact build yang sama. / Final tests/build/CI pass for a known commit; the artifact branch contains that exact build output.
2. Provider melaporkan deployment sukses; HTTPS, asset, reload/hash route, dan login benar pada origin Hostinger. / Provider reports success; HTTPS, assets, route reload, and sign-in work at the Hostinger origin.
3. Indonesia/English, persistensi bahasa, CSV, data pengguna tetap, dan satu alur peluang → kegiatan → approval → laporan → follow-up lulus pada origin tersebut. / Language switching, persistence, exports, data preservation, and one business workflow pass on that origin.
4. SMTP/undangan/recovery, daftar anggota dan unit nyata, backup/retensi, restore drill, serta UAT tim dicatat sebelum rollout penuh. / Record SMTP/onboarding, real members and units, backup/retention, a restore drill, and team UAT before full rollout.

Pilot director yang dikonfirmasi tidak menggantikan sign-off deployment Hostinger atau rollout tim. / A confirmed director pilot does not replace Hostinger deployment or team-rollout sign-off.
