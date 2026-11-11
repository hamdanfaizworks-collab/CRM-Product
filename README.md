# TTM Product CRM

Aplikasi internal Triputra Techno Med untuk CRM pelanggan, pipeline produk radiologi, kalender kegiatan, persetujuan, penugasan Product Specialist/Application Specialist, unit demo, laporan, dan tindak lanjut. UI memakai Inter dengan biru TTM `#174B8A` yang diambil dari katalog.

## Status pengiriman

Source tersedia pada branch `main` di repository GitHub yang diminta. Backend telah diterapkan pada proyek Supabase `yqmcafgnryvsrvalbycz`: 11 tabel ber-RLS, 87 produk katalog, Storage privat, dan Edge Function `team-admin`. Advisor keamanan setelah deployment tidak menemukan isu. Konfigurasi Auth, bootstrap director, serta uji login/persistensi target tetap dicatat terpisah dan belum boleh dianggap selesai hanya karena schema terpasang.

Verifikasi lokal: **40 tes aplikasi lulus** (36 aturan domain, 3 alur DOM, dan 1 regresi callback undangan) serta **47 pemeriksaan SQL/RLS lulus**. TypeScript dan build produksi lulus. Login, dashboard, kalender, dan form kegiatan telah ditinjau di browser, termasuk lebar ponsel 390 px. Baca [status release](docs/RELEASE.md) untuk bukti deployment dan pekerjaan go-live yang masih tertunda.

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
npm run test:db
npm run build
npm run preview
```

- `test`: aturan interval, reservasi sumber daya, keamanan CSV, KPI pipeline, dan tanggal WIB.
- `test:db`: pemeriksaan SQL/RLS lokal sesuai script backend. Keberhasilan lokal tidak menggantikan uji Auth, REST, Storage, dan Edge Function pada proyek target.
- `build`: pemeriksaan TypeScript dan bundle produksi ke `dist/`.
- `preview`: pemeriksaan hasil build lokal; Vite preview bukan server produksi.

CI menjalankan instalasi terkunci, pengujian frontend, build, serta pengujian database tanpa secret produksi. Skenario penerimaan pengguna tersedia pada PRD dan runbook deployment.

## Dokumentasi dan struktur

| Lokasi | Isi |
| --- | --- |
| [docs/PRD.md](docs/PRD.md) | Tujuan, pengguna, requirement, aturan bisnis, acceptance criteria |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Environment, hosting, Auth, UAT, backup, rollback, bukti go-live |
| [docs/BACKEND.md](docs/BACKEND.md) | Migrasi, RLS, bootstrap admin, pengelolaan undangan, verifikasi backend |
| `src/` | UI React/TypeScript, data access, katalog, aturan dan uji domain |
| `supabase/` | Migrasi, konfigurasi dan seed backend |
| `public/ttm-logo.png` | Logo asli yang diekstrak dari katalog pengguna |
| `scripts/package-static.ps1` | Build dan paket static release untuk hosting alternatif |
| `.github/workflows/ci.yml` | Pemeriksaan CI tanpa deployment otomatis |

## Data katalog dan batas operasional

Inventaris awal berasal dari pembacaan visual katalog TTM: **87 model/family/varian dalam 15 kategori**, dilengkapi nomor halaman sumber. Jumlah itu bukan master SKU final; paket probe dan seluruh part number syringe belum diekspansi. Harga katalog tidak diimpor sebagai quotation aktif. Administrator perlu memvalidasi master sebelum penggunaan operasional.

Repository target bersifat publik. Yang disiapkan dalam source hanya data katalog yang relevan dan logo; PDF katalog lengkap, data pelanggan, database dump, lampiran kegiatan, `.env`, dan secret tidak disertakan. Jangan mengunggah data operasional ke issue, fixture, atau screenshot publik.

Release awal melayani satu organisasi, memakai `Asia/Jakarta` untuk tampilan waktu dan UTC untuk timestamp tersimpan. Akses tulis dibatasi melalui RLS dan aturan backend; pembatasan UI bukan pengganti otorisasi. Notifikasi dalam aplikasi dan ekspor CSV tersedia sesuai cakupan PRD. Integrasi WhatsApp, email pengingat otomatis, kalender eksternal, serta pembukuan bukan cakupan v1.

Pemuat data frontend memiliki batas 20.000 baris per tabel dan menampilkan kegagalan eksplisit bila batas tercapai. Tambahkan pagination/query server sebelum data operasional melewati skala tersebut. Semua pengguna aktif dapat membaca data bisnis tim yang diizinkan PRD; pembatasan baca per wilayah belum menjadi model akses v1.

## Rujukan teknis

Konfigurasi deployment mengikuti dokumentasi resmi [Vite static deployment](https://vite.dev/guide/static-deploy), [GitHub Actions untuk Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs), dan [Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
