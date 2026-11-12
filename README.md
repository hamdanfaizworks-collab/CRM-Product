# TTM Product CRM

Aplikasi internal Triputra Techno Med untuk CRM pelanggan, pipeline produk radiologi, kalender kegiatan, persetujuan, penugasan Product Specialist/Application Specialist, unit demo, laporan, dan tindak lanjut. UI memakai Inter dengan biru TTM `#174B8A` yang diambil dari katalog.

## Revisi v1.4 — 12 November 2026

Login berbasis akun dengan copy yang disederhanakan; sidebar **Product Management Workspace / Customer Relationship Management**; label Indonesia/English diselaraskan. Form pelanggan kini memakai API wilayah v2 dengan 38 provinsi dan 514 kabupaten/kota serta cadangan lokal. Katalog memiliki ruang isi yang lebih nyaman.

**Approval Kegiatan / Activity Approval** menambahkan antrean tinjauan, keputusan satu tahap oleh atasan langsung dengan Product Director sebagai pengganti, serta form/pohon hierarki yang dikelola Director/Admin. Persetujuan sendiri, perubahan pelaku keputusan, siklus hierarki dan keputusan ganda ditolak di database. Pengingat agenda 24 jam/overdue berjalan di aplikasi yang terbuka, dengan penyegaran berkala.

English tetap default; pilihan Indonesia tersimpan tetap berlaku. Knowledge Base privat, katalog 87 produk, dan bucket privat tetap tersedia. Panduan: [Approval, hierarchy and reminders](docs/APPROVAL-REMINDERS.md), [Knowledge Base](docs/KNOWLEDGE-BASE.md), [PRD](docs/PRD.md), [deployment GitHub → Hostinger](docs/HOSTINGER.md).

Target: [Hostinger CRM](https://cyan-oryx-350189.hostingersite.com). Bukti source aplikasi yang sedang berjalan tersedia pada `/release.json`; cocokkan dengan commit source dan dua job CI. Catatan rilis terdahulu diberi tanggal di [RELEASE.md](docs/RELEASE.md). SMTP/onboarding tim dan UAT proses bisnis nyata tetap merupakan tindak lanjut pilot Director.

## Menjalankan aplikasi

Gunakan Node.js 24 dan npm. Versi dependensi dikunci dalam `package-lock.json`.

```sh
npm ci
npm run dev
```

Buka alamat localhost yang ditampilkan Vite setelah mengatur konfigurasi publik Supabase. Aplikasi tidak menyediakan pintu masuk demo publik. Fixture sandbox hanya dipakai oleh pengujian UI dan bukan akses operasional.

Untuk koneksi backend, salin `.env.example` menjadi `.env.local`, lalu isi melalui environment lokal/hosting:

```dotenv
VITE_SUPABASE_URL=https://yqmcafgnryvsrvalbycz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key-proyek-yang-terverifikasi>
```

Kedua variabel `VITE_` menjadi bagian bundle browser. Gunakan publishable key; `service_role`, `sb_secret_...`, password database, dan access token tidak boleh berada dalam source atau variabel `VITE_`. Ganti environment lalu build ulang untuk mengubah konfigurasi produksi.

Backend memerlukan migrasi, seed katalog, konfigurasi Auth, dan bootstrap anggota aktif. Ikuti [runbook backend](docs/BACKEND.md) dan [panduan deployment](docs/DEPLOYMENT.md) sebelum mengaktifkan login produksi.

## Verifikasi

```sh
npm test
npm run test:deploy-env
npm run test:db
npm run build:hostinger
npm run preview
```

- `test`: aturan domain, alur DOM, callback Auth, bilingual/default English, Knowledge Base, validasi file dan kontrol upload/download.
- `test:deploy-env`: lima tes guard target/key/secret untuk environment build tanpa memakai secret produksi.
- `test:db`: pemeriksaan SQL/RLS lokal sesuai script backend. Keberhasilan lokal tidak menggantikan uji Auth, REST, Storage, dan Edge Function pada proyek target.
- `build`: pemeriksaan TypeScript dan bundle produksi ke `dist/`.
- `build:hostinger`: validasi target Supabase dan publishable key sebelum menjalankan build produksi.
- `preview`: pemeriksaan hasil build lokal; Vite preview bukan server produksi.

CI menjalankan instalasi terkunci, tes environment/frontend/database, build guarded, dan metadata/artifact release. Job publish terpisah berjalan hanya untuk push `main` setelah verify lulus, dengan izin tulis terbatas pada job tersebut, lalu memublikasikan isi `dist` ke branch `hostinger`. Build memakai konfigurasi Supabase publik, tanpa credential administratif. Skenario penerimaan tersedia pada PRD dan runbook deployment.

## Dokumentasi dan struktur

| Lokasi | Isi |
| --- | --- |
| [docs/PRD.md](docs/PRD.md) | Tujuan, pengguna, requirement, aturan bisnis, acceptance criteria |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Environment, hosting, Auth, UAT, backup, rollback, bukti go-live |
| [docs/BACKEND.md](docs/BACKEND.md) | Migrasi, RLS, bootstrap admin, pengelolaan undangan, verifikasi backend |
| [docs/HOSTINGER.md](docs/HOSTINGER.md) | Jalur actual main → CI → hostinger → public_html; Indonesia/English |
| [docs/RELEASE.md](docs/RELEASE.md) | Bukti pengujian terkini, pilot director, dan status deployment |
| [docs/KNOWLEDGE-BASE.md](docs/KNOWLEDGE-BASE.md) | Panduan bilingual unggah, pencarian, versi, unduh, dan arsip materi produk |
| [docs/HOSTED-UAT.md](docs/HOSTED-UAT.md) | 23 pemeriksaan API hosted serta batas verifikasi |
| [docs/HOSTINGER-UAT.md](docs/HOSTINGER-UAT.md) | Commit/CI/artifact/provider/HTTPS dan smoke test frontend Hostinger |
| `src/` | UI React/TypeScript, data access, katalog, aturan dan uji domain |
| `supabase/` | Migrasi, konfigurasi dan seed backend |
| `src/knowledge-files.ts` | Penyimpanan file sandbox dan validasi format/ukuran Knowledge Base |
| `public/ttm-logo.png` | Logo asli yang diekstrak dari katalog pengguna |
| `scripts/package-static.ps1` | Build dan paket static release untuk hosting alternatif |
| `.github/workflows/ci.yml` | Pemeriksaan CI dan publikasi artifact static ke branch hostinger |

## Data katalog dan batas operasional

Inventaris awal berasal dari pembacaan visual katalog TTM: **87 model/family/varian dalam 15 kategori**, dilengkapi nomor halaman sumber. Jumlah itu bukan master SKU final; paket probe dan seluruh part number syringe belum diekspansi. Harga katalog tidak diimpor sebagai quotation aktif. Administrator perlu memvalidasi master sebelum penggunaan operasional.

Repository target bersifat publik. Yang disiapkan dalam source hanya data katalog yang relevan dan logo; PDF katalog lengkap, data pelanggan, database dump, lampiran kegiatan, `.env`, dan secret tidak disertakan. Jangan mengunggah data operasional ke issue, fixture, atau screenshot publik.

Release awal melayani satu organisasi, memakai `Asia/Jakarta` untuk tampilan waktu dan UTC untuk timestamp tersimpan. Akses tulis dibatasi melalui RLS dan aturan backend; pembatasan UI bukan pengganti otorisasi. Notifikasi dalam aplikasi dan ekspor CSV tersedia sesuai cakupan PRD. Integrasi WhatsApp, email pengingat otomatis, kalender eksternal, serta pembukuan bukan cakupan v1.

Pemuat data frontend memiliki batas 20.000 baris per tabel dan menampilkan kegagalan eksplisit bila batas tercapai. Tambahkan pagination/query server sebelum data operasional melewati skala tersebut. Semua pengguna aktif dapat membaca data bisnis tim yang diizinkan PRD; pembatasan baca per wilayah belum menjadi model akses v1.

## Rujukan teknis

Konfigurasi deployment mengikuti dokumentasi resmi [Vite static deployment](https://vite.dev/guide/static-deploy), [GitHub Actions untuk Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs), dan [Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
