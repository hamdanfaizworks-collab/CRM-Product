# TTM Product CRM

Aplikasi internal Triputra Techno Med untuk CRM pelanggan, pipeline produk radiologi, kalender kegiatan, persetujuan, penugasan Product Specialist/Application Specialist, unit demo, laporan, dan tindak lanjut. UI memakai Inter dengan biru TTM `#174B8A` yang diambil dari katalog.

## Status pengiriman

**ENGLISH DEFAULT + PRODUCT KNOWLEDGE BASE — FRONTEND UPDATE PENDING.** Source terbaru telah diimplementasikan dan diuji; backend Knowledge Base telah **DEPLOYED** pada proyek Supabase target. Publikasi pembaruan frontend ini ke Hostinger masih menunggu commit/CI/artifact/provider dan smoke test tersendiri. Website Hostinger dari release sebelumnya tetap live dan login director telah dikonfirmasi pengguna; bukti tersebut tidak otomatis membuktikan fitur baru sudah tersedia di Hostinger.

**Verifikasi pembaruan ini:** **68 tes aplikasi, 109 pemeriksaan SQL/RLS lokal, 5 tes guard environment, dan build produksi lulus**. **39/39 pemeriksaan API hosted Knowledge Base lulus**, dengan fixture pengujian dibersihkan dan audit dipertahankan. Pemeriksaan ulang memakai Storage listing untuk menghindari hasil GET yang tersimpan cache; kegagalan awal berasal dari harness, bukan bukti kerusakan produk. Bukti sanitized tersedia di `TTM-Knowledge-Hosted-UAT.json` pada deliverable release.

Browser production preview juga membuktikan default English, toggle Indonesia, unggah file demo dan reload, unduhan dengan hash identik, pintasan produk ke Knowledge Base, validasi ukuran, serta tampilan tanpa overflow halaman. Ini QA preview, bukan klaim bahwa pembaruan Hostinger telah terpublikasi atau UAT akun nyata sudah selesai.

**Backend terkini:** **4 migrasi, 12 tabel ber-RLS, 87 produk, dan 2 bucket privat**: `activity-evidence` (10 MiB) dan `product-knowledge` (25 MiB). Migrasi keempat adalah `20261111071649_product_knowledge_library.sql`. Pustaka produksi dimulai kosong; tidak ada file atau penulis dokumen fiktif yang dijadikan data produksi. Sebanyak 23 pemeriksaan hosted CRM dari release sebelumnya tetap tercatat sebagai bukti historis terpisah.

**English / Indonesia:** English adalah default ketika preferensi kosong/tidak valid atau storage tidak tersedia. Pilihan Indonesia (`id`) yang tersimpan tetap dihormati. Pemilih tersedia di login dan workspace; format mengikuti `en-GB`/`id-ID`, sedangkan WIB, IDR, enum, nama, catatan dan isi file tetap. / English is the default when no valid preference is available; an explicitly saved Indonesian choice is preserved. Switching the UI does not translate user data or document contents.

**Knowledge Base:** materi privat dengan produk opsional, jenis, versi, bahasa, tag, pencarian/filter, unduhan signed URL 60 detik, edit metadata dan arsip/pulihkan oleh penulis asli atau director/admin. Viewer membaca dan mengunduh. File immutable; revisi file memakai record baru. Lihat [panduan pemakaian bilingual](docs/KNOWLEDGE-BASE.md) dan [FR-15](docs/PRD.md).

**Release Hostinger sebelumnya — tetap sebagai riwayat:** [live](https://cyan-oryx-350189.hostingersite.com), source `630bf0762c5c76944d926b688d2b2b9c2219f6d0` → [CI `42973665518`](https://github.com/hamdanfaizworks-collab/CRM-Product/actions/runs/42973665518) SUCCESS → artifact `b41f3ce05110d9dfab3258e4a92faa41400676e3` → hPanel Completed **13:37 WIB**, tanpa klik Redeploy; metadata cocok, **HTTP smoke 13/13 PASS pada 13:38 WIB**. Login Hostinger diterima dari konfirmasi pengguna, bukan observasi agent atas workflow akun nyata. SMTP/rollout tim, UAT bisnis nyata, backup/restore dan advisor Auth tetap tindak lanjut. Lihat [status release](docs/RELEASE.md) dan [bukti Hostinger sebelumnya](docs/HOSTINGER-UAT.md).

## Menjalankan aplikasi

Gunakan Node.js 24 dan npm. Versi dependensi dikunci dalam `package-lock.json`.

```sh
npm ci
npm run dev
```

Buka alamat localhost yang ditampilkan Vite. Tanpa konfigurasi Supabase, gunakan sandbox demo untuk meninjau alur. Metadata sandbox tersimpan di localStorage dan file demo Knowledge Base di IndexedDB pada browser/origin yang sama; keduanya bukan data operasional Supabase. Reset demo membersihkan metadata dan file sandbox.

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
