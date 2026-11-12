# Status release / Release status — TTM Product CRM

> **Revisi 12 November 2026:** v1.4 menambahkan approval satu tahap, form hierarki, API wilayah pelanggan, pengingat agenda dan revisi label/login. [Panduan terbaru](APPROVAL-REMINDERS.md). Migrasi tambahan: `20261111205526_single_stage_activity_approval.sql`; koreksi `20261112023647_normalize_approval_note_whitespace.sql`; total setelah deployment: 6 migrasi / 13 tabel publik ber-RLS. Cocokkan source live melalui `/release.json` dan hasil CI. **Semua catatan bertanggal 11 November di bawah adalah histori rilis sebelumnya, bukan bukti deployment v1.4.**


Tanggal / Date: **11 November 2026, Asia/Jakarta**.

## Pembaruan terkini / Current update — LIVE

**DEFAULT ENGLISH + PRODUCT KNOWLEDGE BASE: DONE, LIVE, VERIFIED.** Frontend fitur ini tersedia pada [Hostinger](https://cyan-oryx-350189.hostingersite.com); backend telah deployed. Workspace director produksi terhubung dan halaman/form Knowledge Base telah diperiksa tanpa mode demo atau penulisan data pelanggan. / This feature is live on Hostinger with its backend deployed. The connected director's Knowledge Base page and upload form were inspected without demo mode or customer-data writes.

| Area | Hasil terkini / Current result | Bukti dan batas / Evidence and limit |
| --- | --- | --- |
| Feature source | **VERIFIED** | [`b8396896966c0c123ecac06001f1a0852ee3c12f`](https://github.com/hamdanfaizworks-collab/CRM-Product/commit/b8396896966c0c123ecac06001f1a0852ee3c12f) — source fitur yang diuji, bukan commit dokumentasi berikutnya. / The verified feature source, not a future documentation commit. |
| CI | **SUCCESS** | [Run `43014085080`](https://github.com/hamdanfaizworks-collab/CRM-Product/actions/runs/43014085080), verify + publish. |
| Hostinger artifact | **LIVE** | `hostinger` commit `349fdec5acde88f06a6b70289990d029fc4ab086`; live `/release.json` cocok source fitur. / Live metadata matches the feature source. |
| HTTP smoke | **13 / 13 PASS** | **18:43 WIB, 11 November 2026**, pada origin Hostinger. |
| Director production UI | **PASS — READ-ONLY INSPECTION** | Halaman `#knowledge` dan form unggah English terbuka melalui sesi terhubung, tanpa MODE DEMO; 12 tabel dimuat, 0 dokumen saat inspeksi. Tidak ada upload produksi atau penulisan data pelanggan. / Connected non-demo page/form, no production uploads or customer-data writes. |
| English default / Indonesia | **LIVE; VERIFIED** | Preferensi kosong/tidak valid default `en`; pilihan `id` tersimpan tetap dihormati. / English default; saved Indonesian respected. |
| Product Knowledge Base | **LIVE; VERIFIED** | Produk opsional, shortcut katalog, metadata/filters, signed download 60 detik, author/admin metadata edit, archive/restore; file immutable dan tidak ada file fiktif produksi. |
| Supabase backend | **DEPLOYED — 4 MIGRATIONS** | 12 tabel ber-RLS, 87 produk; activity-evidence privat 10 MiB dan product-knowledge privat 25 MiB. |
| App tests | **68 PASS** | Domain, Auth, bilingual/default language, Knowledge Base dan UI sandbox. |
| Local SQL/RLS | **109 PASS** | Termasuk ownership, immutable linkage, limits, archive dan akses Knowledge Base. |
| Environment guard | **5 PASS** | Target/key dan perlindungan secret browser. |
| Production build | **PASS** | TypeScript dan build produksi. |
| Knowledge Base hosted API | **39 / 39 PASS** | Fixture dibersihkan: 5 Auth users, 4 profiles, 2 tracked document IDs, 3 object paths. Audit dipertahankan dan data pengguna asli tidak diubah. |
| Native production preview | **PASS** | Upload demo → reload → download berhash identik, product shortcut/filter, toggle bahasa, file-size guard dan layout tanpa overflow. |

Screenshot terverifikasi: deliverable **`TTM-Knowledge-Base.png`**. Hosted API report sanitized: **`TTM-Knowledge-Hosted-UAT.json`**. Panduan pengguna: [KNOWLEDGE-BASE.md](KNOWLEDGE-BASE.md); detail deployment: [HOSTINGER-UAT.md](HOSTINGER-UAT.md).

Feature ini selesai sesuai scope yang diminta. **SMTP/onboarding tim, UAT workflow bisnis tim penuh, backup/restore dan tindak lanjut advisor tetap terpisah.** Pemeriksaan UI director membuktikan halaman/form terhubung; tidak diperluas menjadi klaim bahwa agent telah menjalankan upload produksi atau seluruh workflow bisnis akun nyata. / This requested feature is complete. Team email/onboarding, full business-workflow UAT and backup/restore remain separate; the observed page/form check is not a claim of production upload or full real-account workflow completion.

## Riwayat release sebelumnya / Previous release record

**Bagian berikut adalah catatan release sebelumnya yang dipertahankan. Angka 51/47, tiga migrasi/11 tabel, default `id`, serta commit dan deployment di dalamnya merujuk snapshot historis tersebut; bukan status source/backend pembaruan ini.** / The following record is historical. Its 51/47 test counts, three migrations/11 tables, Indonesian default, commits and deployment identify that prior release, not this update.

Tanggal / Date: **11 November 2026, Asia/Jakarta**.

**Historical status: READY FOR DIRECTOR PILOT.** Frontend Hostinger live, auto-update terbukti, dan pengguna mengonfirmasi “login Hostinger berhasil”. Konfirmasi login berasal dari pengguna, bukan observasi agent atas dashboard terautentikasi. SMTP/rollout tim, UAT alur bisnis nyata, dan backup/restore masih tindak lanjut. / **Ready for the director pilot:** Hostinger is live, automatic updates are proven, and the user confirmed successful Hostinger sign-in. This is user acceptance, not an agent-observed authenticated workflow. Team/email, business-workflow UAT and recovery acceptance remain follow-ups.

### Bukti terkini / Current evidence

| Area | Status | Bukti dan batas / Evidence and limit |
| --- | --- | --- |
| PRD dan katalog / PRD and catalog | COMPLETE | PRD mendahului implementasi; 32 halaman raster ditinjau; 87 model/family/varian, bukan master SKU final. / PRD preceded implementation; 32 raster pages reviewed; 87 models/families/variants, not a final SKU master. |
| Brand dan UI / Branding and UI | IMPLEMENTED | Inter, logo asli, primary `#174B8A`; sandbox dipisahkan dari data operasional Supabase. / Inter, original logo, primary `#174B8A`; sandbox is separate from operational Supabase data. |
| Indonesia / English | IMPLEMENTED; VERIFIED | Pemilih pada login/ruang kerja; default `id`, preferensi localStorage, locale `id-ID`/`en-GB`, data pengguna tetap. / Login/workspace selector; default `id`, localStorage preference, locale-aware display, user data unchanged. |
| Tes aplikasi / Application tests | **51 / 51 PASS** | Suite final mencakup domain, alur DOM, callback Auth, bilingual, preservasi data dan pesan error Edge. / The final suite covers domain rules, DOM flows, Auth callbacks, bilingual behavior, data preservation and Edge errors. |
| Guard environment deployment | **5 PASS** | Target proyek dan publishable key diperiksa; secret pada variabel browser ditolak tanpa dicetak. / Verifies the project and publishable key; rejects browser-exposed secrets without printing them. |
| PostgreSQL/RLS lokal / Local PostgreSQL/RLS | **47 PASS** | Role, ownership, workflow, konflik interval, last-admin, attachment privat, konteks tugas, dan riwayat anggota nonaktif. / Roles, ownership, workflow, intervals, last-admin, private evidence, task context, and inactive-member history. |
| API hosted Supabase | **23 PASS** | Auth, REST, Storage, Edge Function, persistensi, tiga race overlap, adjacency, serta pencabutan akses setelah deaktivasi. Detail di `HOSTED-UAT.md`. / Actual Auth/REST/Storage/Edge APIs, persistence, three overlap races, adjacency, and access removal after deactivation. |
| Pilot director | **USER CONFIRMED — HOSTINGER** | Pengguna secara eksplisit mengonfirmasi “login Hostinger berhasil”. Agent tidak mengklaim melihat dashboard akun nyata atau menyelesaikan alur bisnis terautentikasi. / The user explicitly confirmed Hostinger sign-in; the agent does not claim to have observed the real-account dashboard or an authenticated workflow. |
| SMTP dan rollout tim / SMTP and team rollout | PENDING | Deliverability undangan/recovery dan onboarding anggota belum dinyatakan lulus; pilot director dapat berjalan sambil konfigurasi diselesaikan. / Invitation/recovery deliverability and team onboarding are not yet signed off. |
| Build TypeScript/produksi / TypeScript/production build | **PASS** | `npm run build:hostinger` final lulus (guard environment, TypeScript, Vite). Edge Function sebelumnya lulus Deno typecheck. / The final guarded Hostinger build passed; the Edge Function previously passed Deno type checking. |
| Backup dan advisor / Backup and advisors | FOLLOW-UP REQUIRED | Snapshot bisnis lokal dibuat dengan persetujuan pengguna; tidak mencakup Auth/Storage blobs. PITR off dan belum ada hosted physical backup; advisor Auth terakhir memberi peringatan leaked-password protection. / An approved local business snapshot excludes Auth and Storage blobs. PITR is off, no hosted physical backup is available, and the latest Auth advisor warns about leaked-password protection. |
| Hostinger frontend | **LIVE** | Deployment otomatis terakhir Completed **13:37 WIB**, **4 detik**; live metadata cocok source `630bf076…`; HTTP smoke **13/13 PASS** pada 13:38 WIB. / Latest automatic deployment completed at 13:37 WIB in 4 seconds; metadata matches source `630bf076…`; all 13 HTTP checks passed at 13:38 WIB. |
| Auto-deploy | **PROVEN** | Push → CI `42973665518` SUCCESS (dua jobs) → artifact `b41f3ce…` → hPanel Completed tanpa klik Redeploy → live release metadata berubah sesuai source. / Push-to-CI-to-artifact-to-origin update is verified without clicking Redeploy. |
| Auth primary origin | **PASS — 13:35 WIB** | Primary Site URL Hostinger; hanya `auth.site_url` berubah, post-push diff nol; kedua redirect dipertahankan, signup/anon off dan minimum password 10. / Only the primary Site URL changed; post-push diff is zero and existing redirects/protections remain. |

Hasil final lokal: 51 tes aplikasi, 5 tes guard environment, 47 tes SQL/RLS, dan build Hostinger lulus. Kamus memuat 695 entri; pemeriksaan 547 literal tidak menemukan key hilang; 42 pesan DB/Edge dipetakan secara tepat. Bukti tersebut tidak menggantikan hasil deployment Hostinger. / Final local checks passed: 51 application tests, 5 environment tests, 47 SQL/RLS checks, and the Hostinger build. The dictionary contains 695 entries; 547 checked literals had no missing keys; 42 DB/Edge messages have exact translations. These checks do not prove Hostinger deployment.

### Riwayat deployment awal / Initial deployment history

- Source `main`: [`b4cebfd9578c2960e3ca40167a24b5905316fb6e`](https://github.com/hamdanfaizworks-collab/CRM-Product/commit/b4cebfd9578c2960e3ca40167a24b5905316fb6e).
- [GitHub Actions run `42971963802`](https://github.com/hamdanfaizworks-collab/CRM-Product/actions/runs/42971963802): **SUCCESS**, jobs verify dan publish / verify and publish jobs.
- Artifact branch `hostinger`: `f315da4e2da9c701ef4086771d76e480167b921d`.
- hPanel deployment pertama **Completed**, 11 November 2026 pukul **13:24 WIB**, durasi **3 detik** / first deployment Completed at 13:24 WIB, duration 3 seconds.
- [`release.json` melalui HTTPS](https://cyan-oryx-350189.hostingersite.com/release.json): **HTTP 200**, `source_commit` cocok dengan source di atas / matches the source above.
- Browser pada origin Hostinger: layar login ID/EN, persistensi bahasa setelah reload, demo Dashboard, Catalog 87 entri, Calendar, Reports, dan unduhan CSV English **PASS**. Ini pengujian frontend/demo, bukan login director nyata. / Hostinger-origin login language, reload persistence, demo modules, and English CSV download passed; this is not real director authentication.

Rincian sanitized terdapat pada `HOSTINGER-UAT.md`. Screenshot deployment disimpan sebagai deliverable `TTM-Hostinger-deployment.png`; tidak memuat credential. / Sanitized details are in HOSTINGER-UAT; the deployment screenshot is a separate deliverable without credentials.

#### Deployment aplikasi terakhir yang telah diverifikasi / Latest verified application deployment

- Source: [`630bf0762c5c76944d926b688d2b2b9c2219f6d0`](https://github.com/hamdanfaizworks-collab/CRM-Product/commit/630bf0762c5c76944d926b688d2b2b9c2219f6d0).
- [CI `42973665518`](https://github.com/hamdanfaizworks-collab/CRM-Product/actions/runs/42973665518): **SUCCESS**, kedua jobs / both jobs.
- Artifact `hostinger`: **`b41f3ce05110d9dfab3258e4a92faa41400676e3`**.
- hPanel **Completed 13:37 WIB**, durasi **4 detik**, tanpa klik Redeploy / no Redeploy click.
- HTTPS `release.json` cocok source **`630bf076…`**; **13/13 HTTP checks PASS pada 13:38 WIB**: redirect HTTP→HTTPS 301, asset MIME, nosniff, PRD 200, `.env`/`.git` 403, SPA 200, missing asset 404. Bukti sanitized: `TTM-Hostinger-checks.json`.

Record ini menunjuk deployment yang telah diperiksa, bukan commit dokumentasi berikutnya atau CI yang belum berjalan. / This record identifies the deployment already verified, not a subsequent documentation commit or a future CI run.

### Backend dan data / Backend and data

Target Supabase `yqmcafgnryvsrvalbycz` telah menerima **tiga migrasi**: initial schema, hardening helper, serta indeks FK/policy. Tersedia 87 produk, 11 tabel ber-RLS, bucket bukti privat maksimum 10 MiB, serta `team-admin` dengan verifikasi JWT. Hasil nol temuan keamanan setelah hardening adalah snapshot historis; advisor Auth terbaru memberi peringatan leaked-password protection. Perincian riwayat deployment ada di `BACKEND-DEPLOYMENT.md`; hasil layanan nyata ada di `HOSTED-UAT.md`.

The target Supabase project has three migrations (initial schema, helper hardening, and FK/policy indexes), 87 products, 11 RLS-protected tables, private evidence storage limited to 10 MiB, and a JWT-verified `team-admin` function. The earlier zero-finding security result is historical; the latest Auth advisor warns about leaked-password protection. Deployment history and actual API acceptance results are documented separately.

Fixture hosted dibersihkan dengan ID yang dibuat penguji; audit append-only tetap menjadi jejak pengujian. Tidak ada data pasien atau identitas anggota fiktif yang dijadikan data produksi. / Hosted test fixtures were cleaned using their generated IDs; append-only audit events remain as the test trace. No patient data or fictitious team identities were promoted to production.

### Jalur Hostinger yang digunakan / Actual Hostinger path

Inspeksi hPanel menunjukkan target saat ini berupa **PHP/HTML**, dengan Git deployment branch dan direktori `public_html`; tidak tersedia build command pada wizard tersebut. Jalur release mempertahankan site/domain yang ada:

`GitHub main → GitHub Actions (Node 24, npm ci, checks, npm run build:hostinger) → isi dist pada branch hostinger → Hostinger Git → public_html`.

The existing site remains PHP/HTML. React/Vite is built in GitHub Actions, and only the static build output is published to the `hostinger` artifact branch for Hostinger Git to deploy into `public_html`. This does not require a new site or domain migration. CI tests and an artifact branch do not by themselves prove Hostinger deployment succeeded.

Frontend publik telah disetujui pengguna; akses CRM tetap invitation-only melalui login Supabase dan profil aktif. Tidak ada hosting password gate tambahan yang diminta. / The user approved a public frontend with invitation-only CRM sign-in and active membership. No additional hosting password gate is required.

Hanya URL Supabase dan publishable key publik yang masuk browser; secret administratif tetap pada backend/operator. Repository variables atau public defaults workflow tidak boleh diganti dengan `service_role`, `sb_secret_...`, password, atau access token. / Only the public Supabase URL and publishable key enter the browser; administrative credentials remain server-side.

### Verifikasi tersisa dan rollout / Remaining verification and rollout

1. Pertahankan jejak source/CI/artifact/deployment yang telah terbukti; setiap release berikutnya memperoleh bukti sendiri. / Retain the verified provenance; each subsequent release requires its own evidence.
2. Login director Hostinger telah diterima berdasarkan konfirmasi pengguna; jangan memperluas konfirmasi itu menjadi klaim observasi agent atas alur akun nyata. / Director sign-in is user-confirmed; do not extend that acceptance into an agent-observed real-account workflow claim.
3. Uji satu alur peluang → kegiatan → approval → laporan → follow-up dari sesi director di origin baru. Demo dan 23 pengujian API hosted tidak menggantikan UAT akun nyata pada origin itu. / Test one business workflow from the director's new-origin session; demo and API checks do not replace that real-account UAT.
4. SMTP/undangan/recovery, daftar anggota dan unit nyata, backup/retensi, restore drill, serta UAT tim dicatat sebelum rollout penuh. / Record SMTP/onboarding, real members and units, backup/retention, a restore drill, and team UAT before full rollout.

Frontend live tidak berarti rollout tim penuh selesai. SMTP, undangan/recovery, backup/restore, dan persetujuan UAT tetap mengikuti bukti masing-masing. / A live frontend does not mean full team rollout is complete; email, backup/restore, and UAT retain their own acceptance evidence.
