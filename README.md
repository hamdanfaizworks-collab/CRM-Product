# TTM Product CRM

Aplikasi internal Triputra Techno Med untuk CRM pelanggan, pipeline produk radiologi, kalender kegiatan, persetujuan, penugasan Product Specialist/Application Specialist, unit demo, laporan, dan tindak lanjut. UI memakai Inter dengan biru TTM `#174B8A` yang diambil dari katalog.

## Status pengiriman

Source tersedia pada branch `main` di repository GitHub yang diminta. Backend memiliki tiga migrasi (schema, helper hardening, indeks FK/policy), 11 tabel ber-RLS, 87 produk katalog, Storage privat, dan `team-admin`. **23 pemeriksaan API hosted lulus dan pengguna mengonfirmasi login pilot director di Sites. Frontend Hostinger kini live; login director pada origin baru dan bukti auto-update masih pending.** SMTP/undangan/recovery serta rollout tim tetap pending. Advisor Auth terakhir memberi peringatan leaked-password protection; hasil nol temuan sebelumnya adalah snapshot historis. Snapshot bisnis lokal yang disetujui tidak mencakup Auth/Storage blobs; PITR off dan hosted physical backup belum tersedia.

Verifikasi final lokal: **51 tes aplikasi, 5 tes guard environment, 47 pemeriksaan SQL/RLS, dan `npm run build:hostinger` lulus**. Suite mencakup domain, alur DOM, callback Auth, bilingual, preservasi data, serta pesan error Edge. Kamus berisi 695 entri; 547 literal yang diperiksa tidak memiliki key hilang. Pemeriksaan browser sebelumnya mencakup login, dashboard, kalender, form kegiatan, dan lebar ponsel 390 px. Baca [status release bilingual](docs/RELEASE.md) untuk bukti dan pekerjaan go-live yang tersisa.

**Indonesia / English:** pemilih bahasa tersedia di login dan ruang kerja. Default Bahasa Indonesia, preferensi tersimpan di localStorage per origin, dan format tampilan mengikuti `id-ID`/`en-GB`; WIB, IDR, serta data pengguna tetap. / The language selector is available before and after sign-in. Indonesian is the default; the preference persists per browser origin. Display formatting changes while WIB, IDR, and user data remain unchanged.

**Hostinger:** [frontend live](https://cyan-oryx-350189.hostingersite.com) pada site PHP/HTML yang sudah ada. Source `b4cebfd9578c2960e3ca40167a24b5905316fb6e` diproses oleh [CI run `42971963802`](https://github.com/hamdanfaizworks-collab/CRM-Product/actions/runs/42971963802) SUCCESS ke artifact `f315da4e2da9c701ef4086771d76e480167b921d`. hPanel deployment awal Completed **13:24 WIB**, **3 detik**; HTTPS release metadata cocok. ID/EN, reload bahasa, demo Dashboard/Catalog87/Calendar/Reports dan CSV English lulus. / The initial Hostinger frontend is live and smoke-tested. Real director sign-in on this origin and a subsequent push-to-live automatic update remain pending. Auto-deploy is ON/green, not yet proven by a new push. Lihat [bukti Hostinger](docs/HOSTINGER-UAT.md) dan [panduan bilingual](docs/HOSTINGER.md).

## Menjalankan aplikasi

Gunakan Node.js 24 dan npm. Versi dependensi dikunci dalam `package-lock.json`.

```sh
npm ci
npm run dev
```

Buka alamat localhost yang ditampilkan Vite. Tanpa konfigurasi Supabase, gunakan sandbox demo untuk meninjau alur. Data sandbox tersimpan di local storage browser dan bukan data operasional Supabase; jangan masukkan data pelanggan nyata ke sandbox. Data simulasi dapat dihapus melalui reset demo.

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

- `test`: aturan interval, reservasi sumber daya, keamanan CSV, KPI pipeline, dan tanggal WIB.
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
| [docs/HOSTED-UAT.md](docs/HOSTED-UAT.md) | 23 pemeriksaan API hosted serta batas verifikasi |
| [docs/HOSTINGER-UAT.md](docs/HOSTINGER-UAT.md) | Commit/CI/artifact/provider/HTTPS dan smoke test frontend Hostinger |
| `src/` | UI React/TypeScript, data access, katalog, aturan dan uji domain |
| `supabase/` | Migrasi, konfigurasi dan seed backend |
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
