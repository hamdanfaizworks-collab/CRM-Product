# Hostinger deployment / Panduan deployment TTM Product CRM

**Target:** `https://cyan-oryx-350189.hostingersite.com`  
**Source:** `hamdanfaizworks-collab/CRM-Product`, branch `main`  
**Artifact branch:** `hostinger`  
**Status:** **frontend Hostinger live**; login director pada origin baru dan bukti auto-update masih pending / **Hostinger frontend live**; new-origin director sign-in and automatic-update proof remain pending.

## Bukti deployment awal / Initial deployment evidence

Source `main` **`b4cebfd9578c2960e3ca40167a24b5905316fb6e`** diproses oleh [CI run `42971963802`](https://github.com/hamdanfaizworks-collab/CRM-Product/actions/runs/42971963802), verify dan publish **SUCCESS**, menghasilkan artifact commit **`f315da4e2da9c701ef4086771d76e480167b921d`** pada branch `hostinger`. Deployment manual awal di hPanel berstatus **Completed**, **13:24 WIB**, durasi **3 detik**. HTTPS [`release.json`](https://cyan-oryx-350189.hostingersite.com/release.json) mengembalikan **200** dan source commit yang cocok.

The initial deployment is verified. Hostinger-origin browser checks passed for ID/EN login UI, language persistence after reload, demo Dashboard, 87-entry Catalog, Calendar, Reports and an English CSV download. These demo checks do not authenticate the real director. The auto-deploy setting is ON/green; a later push-to-live update still requires proof. Details are recorded in `HOSTINGER-UAT.md`.

## Jalur aktual / Actual deployment path

Inspeksi hPanel menunjukkan website yang sudah ada adalah **PHP/HTML**. Wizard Git pada target menawarkan branch dan direktori deployment `public_html`, tanpa pengaturan build command. Karena itu React/Vite dibangun melalui GitHub Actions, lalu Hostinger mengambil artifact static. **Site dan domain yang ada dipertahankan; tidak diperlukan migrasi ke website baru.**

The inspected hPanel target is an existing **PHP/HTML** site. Its Git wizard accepts a branch and deployment directory, with no build-command setting. GitHub Actions therefore builds React/Vite and publishes static artifacts for Hostinger Git. **Keep the existing site and domain; do not create or migrate to a new site.**

```text
main (React/TypeScript source)
  → GitHub Actions: Node 24 → npm ci → checks → npm run build:hostinger
  → dist/ contents only → hostinger branch
  → Hostinger Git deployment → public_html → HTTPS target
```

| Pengaturan / Setting | Nilai / Value |
| --- | --- |
| Source branch for CI | `main` |
| Node in GitHub Actions | `24.x` |
| Install | `npm ci` |
| Environment guard tests | `npm run test:deploy-env` |
| Application tests | `npm test` |
| Local SQL/RLS checks | `npm run test:db` |
| Production build in CI | `npm run build:hostinger` |
| Build output | `dist` |
| Hostinger repository branch | `hostinger` |
| Hostinger deployment directory | `public_html` |
| Node server/start file on this PHP/HTML site | Tidak dipakai / Not used |

`main` menyimpan source dan dokumentasi. Workflow hanya memublikasikan **isi `dist/`**, dengan `index.html`, asset berhash, `.htaccess`, `PRD.md` dan `release.json` pada root branch artifact. `src/`, `supabase/`, `.env*`, `.git`, `node_modules`, serta credential server tidak ikut ke `public_html`. Job verify menjalankan `npm ci`, `test:deploy-env`, `npm test`, `build:hostinger`, dan `test:db`, mencatat metadata release, lalu mengunggah artifact. Job publish berjalan hanya untuk push `main` setelah verify sukses, bukan pull request. Hanya job publish memiliki izin contents-write dan memakai GitHub API untuk membentuk tree isi `dist` ke branch `hostinger`. Hasil job/provider tetap harus dicocokkan dengan commit release; dokumen ini bukan bukti deployment telah sukses.

Keep source and documentation on `main`. Publish only the contents of `dist` to the artifact branch. Never copy backend source, environment files, dependencies, or server credentials into the web root. A successful GitHub workflow and a successful Hostinger deployment are separate pieces of evidence.

## Environment build / Build environment

Gunakan repository variables yang dibaca workflow atau public defaults yang telah direview untuk dua nilai berikut. Kedua nilai bersifat konfigurasi browser publik:

```text
VITE_SUPABASE_URL=https://yqmcafgnryvsrvalbycz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key proyek yang sama>
```

Use the repository variables consumed by the workflow, or reviewed public defaults, for these browser values. The publishable key is public by design. **Do not use `service_role`, `sb_secret_...`, database passwords, access tokens, or administrative secrets in `VITE_` variables, the artifact branch, or the frontend.**

`build:hostinger` menjalankan `scripts/verify-deploy-env.mjs` sebelum TypeScript/Vite. Guard menolak URL proyek salah, key yang bukan modern publishable key, serta credential istimewa pada variabel browser, tanpa mencetak nilai key/token. Perubahan konfigurasi build memerlukan build dan deployment ulang. Validasi final: 51 tes aplikasi, 5 tes guard environment, 47 pemeriksaan SQL/RLS, dan `npm run build:hostinger` lulus.

The Hostinger build script validates the authorized project and public-key configuration before building. A changed build environment requires a new build and deployment. Five environment-guard tests passed at the recorded release snapshot.

## hPanel dan pembaruan / hPanel and updates

Hubungkan Git repository yang benar pada site target, pilih branch `hostinger`, dan direktori `public_html`. Periksa isi/document root serta deployment lama sebelum perubahan. Build tidak berjalan pada wizard PHP/HTML ini: bila yang diambil masih `main`, browser akan menerima source React yang belum dibangun.

Connect the correct repository to the existing target site, select `hostinger`, and use `public_html`. The PHP/HTML wizard does not compile the source branch. Review the existing web root and retain a compatible previous artifact for rollback.

Auto-deploy/webhook dapat menggunakan koneksi Git target yang tersedia. Konfirmasi webhook dan deployment melalui panel/hasil provider; jangan menganggap push artifact otomatis telah mengaktifkan situs. Catat source commit, workflow run, artifact commit, dan status provider. Aktifkan/konfirmasi HTTPS pada domain target.

Use the existing Git connection for automatic deployment where available. Confirm its webhook and provider deployment status rather than assuming an artifact push made the site live. Record the source commit, workflow run, artifact commit, and provider outcome.

`public/.htaccess` ikut ke build untuk Apache/LiteSpeed: directory listing dimatikan, HTML dapat diperbarui, asset berhash dapat dicache, dan rute memperoleh fallback. Aplikasi menggunakan hash navigation; periksa refresh dan callback login pada origin akhir. Dukungan aturan pada host harus dibuktikan melalui smoke test, bukan hanya keberadaan file.

## Supabase Auth dan akses / Supabase Auth and access

Data bisnis hanya dapat dibaca akun Supabase Auth dengan profil TTM aktif. Halaman frontend publik menampilkan login bagi pengunjung tanpa sesi; RLS melindungi data. Pengguna menyetujui frontend publik dengan login CRM invitation-only; tidak diperlukan hosting password gate tambahan. Gate owner-private pada Sites adalah fitur hosting terpisah dan tidak otomatis ikut ke Hostinger.

Business data requires a valid Auth session and active TTM membership. The user approved a public frontend protected by invitation-only CRM sign-in; no additional hosting password gate is required. Sites' owner-private hosting gate does not transfer to Hostinger.

Primary Auth Site URL telah dipindahkan ke Hostinger dan diverifikasi pada 13:35 WIB. Kedua origin Hostinger dan Sites tetap pada allowed redirects. Diff sebelum push hanya mengubah `auth.site_url`; diff sesudahnya nol. Signup publik/anon tetap nonaktif dan minimum password tetap 10. `team-admin` memvalidasi origin, sesi, role, serta redirect melalui allowlist server. Jangan mengirim URL redirect bebas dari browser.

The primary Auth Site URL is now Hostinger, verified at 13:35 WIB. Both redirect origins and existing Auth protections were retained. The post-push diff is zero. Verify invitation/recovery on the actual target after email configuration is ready.

Director sebelumnya telah mengonfirmasi login pilot di Sites. Handoff login director nyata pada origin Hostinger masih pending. SMTP/deliverability undangan dan recovery serta onboarding tim juga pending; frontend live bukan rollout tim penuh. Tidak ada password bawaan pada source.

## Indonesia / English

Pemilih bahasa tersedia pada login dan ruang kerja. Default `id`; pilihan `en` tersimpan pada localStorage origin (`ttm.crm.language.v1`) dan dipulihkan setelah reload. Locale tampilan adalah `id-ID`/`en-GB`; WIB, IDR, nilai, enum, dan data tersimpan tidak berubah. Preferensi Sites dan Hostinger terpisah karena origin berbeda.

The language selector is available before and after sign-in. Indonesian is the default; the selected language persists per browser origin. Dates/numbers use the selected locale while retaining WIB and IDR. Names, brands, notes, reports, descriptions, and specifications remain unchanged. Verify both language directions, reload persistence, modals, and CSV headers at the Hostinger origin.

## Verifikasi dan rollback / Verification and rollback

**Frontend Hostinger live** telah dibuktikan untuk deployment awal. Langkah tersisa: konfirmasi login director nyata pada origin baru dan satu alur pelanggan → peluang → kegiatan → approval → laporan → tindak lanjut; buktikan siklus push berikutnya memperbarui origin secara otomatis. Uji invitation/recovery setelah SMTP siap dan lengkapi UAT tim. Catat hasil dan commit pada `RELEASE.md`/`HOSTINGER-UAT.md`.

The initial **Hostinger frontend is live**. Real director sign-in and automatic-update proof remain pending. Finish authenticated workflow, team/email and backup acceptance before full rollout. Roll back to the previous compatible static artifact/deployment if needed; do not reset the production database.

Panduan platform / Platform references: [Hostinger Git deployment](https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/), [Vite static output](https://vite.dev/guide/static-deploy). Hostinger juga mendukung native Node.js pada paket tertentu, tetapi itu bukan wizard PHP/HTML yang telah diinspeksi untuk target ini. / Hostinger also supports native Node.js on eligible plans; that is separate from the inspected target wizard. [Native Node.js reference](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/).
