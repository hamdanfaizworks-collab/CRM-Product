# Status release TTM Product CRM

Tanggal pelaporan: 11 November 2026, Asia/Jakarta.

## Sudah diverifikasi

- PRD ditulis sebelum implementasi; katalog raster 32 halaman ditinjau sebagai data referensi.
- 87 model/family/varian katalog, tanpa harga, pelanggan, atau identitas tim fiktif di produksi.
- UI Inter, logo asli TTM, dan primary `#174B8A`; mode sandbox terpisah dari Supabase.
- 39 tes aplikasi lulus: 36 aturan domain dan 3 alur DOM dengan store/UI nyata. Termasuk pelanggan -> peluang -> perubahan tahap -> remount, serta kegiatan -> approval -> laporan -> tindak lanjut.
- 47 pemeriksaan PostgreSQL/RLS lokal lulus, termasuk anon/nonmember/inactive/viewer, role escalation, last-admin, workflow, konflik interval, bukti privat, dan task contexts.
- TypeScript dan bundle produksi berhasil dibangun. Edge Function lulus Deno typecheck.
- Pemeriksaan browser login, dashboard, kalender, dan form kegiatan; breakpoint ponsel 390 px. Penyempurnaan filter ponsel dan kontras diterapkan setelah review.
- Backend target `yqmcafgnryvsrvalbycz` telah menerima dua migrasi, 87 produk, 11 tabel ber-RLS, bucket bukti privat 10 MiB, dan `team-admin` versi 1 dengan JWT verification.
- Advisor keamanan target: 0 temuan setelah hardening helper RLS. Lihat BACKEND-DEPLOYMENT.md untuk bukti dan batas verifikasi.
- Source awal berhasil dipush ke branch `feat/ttm-crm-v1` repository yang diminta. Sinkronisasi release akhir dan hasil CI dicatat saat tersedia.

## Belum menjadi bukti go-live

Konfigurasi Auth hosted dan bootstrap director harus selesai sebelum akses operasional. Uji undangan/recovery/login, persistensi lintas sesi, Storage dari sesi anggota nyata, dan konkurensi dua koneksi target masih harus dibuktikan. Pengujian PGlite bersifat sekuensial dan tidak membuktikan race jaringan.

Hosting baru memakai akses privat secara default. Perubahan audience untuk akses anggota tim memerlukan keputusan eksplisit pemilik. Jangan menandai pilot tim go-live bila hanya pemilik Site yang dapat membukanya.

Review master model/SKU, daftar anggota/wilayah, unit demo nyata, backup/retensi, dan UAT director merupakan bagian onboarding operasional. Tidak ada password default atau secret administratif di source.

## Catatan teknis

Build memiliki satu chunk aplikasi sekitar 575 kB sebelum gzip (sekitar 159 kB gzip). Ini bukan kegagalan build; pemisahan bundle dapat dilakukan sesuai pengukuran kebutuhan. Beberapa indeks belum digunakan karena database baru; review setelah workload tersedia. Frontend membatasi pembacaan 20.000 baris per tabel dengan error eksplisit.
