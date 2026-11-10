# Deployment dan go-live TTM Product CRM

Runbook ini membedakan verifikasi lokal, publikasi frontend, dan go-live operasional. Jangan menandai pekerjaan selesai sebelum bukti pada lingkungan target tersedia.

## Status akses awal

| Komponen | Temuan 11 November 2026 | Dampak |
| --- | --- | --- |
| GitHub `hamdanfaizworks-collab/CRM-Product` | Repository publik; koneksi hanya dapat membaca; push ditolak 403 | Commit/CI pada repository target belum terbukti |
| Supabase `yqmcafgnryvsrvalbycz` | Kedua koneksi tersedia ditolak saat akses proyek | Schema, Auth, publishable key, migrasi, akun dan persistensi target belum terbukti |
| Frontend | Bisa dibangun/ditinjau dari source lokal | Sandbox atau URL frontend sendiri bukan CRM operasional |

Jika akses diperbaiki, catat akun/koneksi yang berhak dan ulangi inspeksi target sebelum melakukan perubahan. Tidak perlu menyalin credential melalui chat; gunakan koneksi aplikasi atau secret/environment penyedia.

## Kontrak release

Release mempunyai commit source, hasil `npm ci`, `npm test`, `npm run test:db`, dan `npm run build`; daftar migrasi; environment publik; URL frontend; serta hasil UAT pada Supabase target. Simpan bukti tanpa token, password, atau data pelanggan.

| Variabel | Tempat | Isi |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Build frontend | URL API proyek Supabase target |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Build frontend | Publishable key proyek yang sama |
| Secret administratif backend | Secret Edge Function/operator saja | Sesuai [BACKEND.md](BACKEND.md); tidak menggunakan awalan `VITE_` |

Frontend adalah aplikasi static Vite. Variabel `VITE_` dimasukkan saat build dan terlihat oleh browser. Perubahan key/URL memerlukan build serta deployment ulang. Host mengirimkan HTTPS, MIME type yang benar, dan file static dari `dist/`. Deploy pada root origin; subpath memerlukan penyesuaian Vite `base` sebelum build.

## 1. Backend dan akses

1. Pastikan project ID tepat `yqmcafgnryvsrvalbycz`, lalu inspeksi tabel, migrasi, fungsi, dan Storage yang sudah ada. Jangan menjalankan migrasi awal secara buta pada schema berisi data.
2. Ikuti [runbook backend](BACKEND.md) untuk menerapkan migrasi/seed secara berurutan, menjalankan verifikasi dan advisors, serta memeriksa RLS di seluruh tabel exposed. Jangan mengedit `auth` atau `storage` secara ad hoc.
3. Bootstrap administrator pertama hanya melalui prosedur operator di runbook backend setelah pengguna Auth yang benar tersedia. Tidak ada akun/password default. Verifikasi profil aktif dengan role `director` atau `admin` dan pastikan satu admin cadangan tersedia.
4. Untuk anggota berikutnya, pakai alur invitation berhak admin yang dijelaskan runbook. Identitas Auth dan profil aktif CRM adalah dua syarat terpisah. Mengisi `user_metadata` bukan cara memberi role. Uji bahwa anggota biasa tidak dapat menaikkan role atau mengaktifkan dirinya sendiri.
5. Matikan signup publik dan anonymous sign-in pada konfigurasi Auth target. Aktifkan email provider yang dipakai, kebijakan password yang disetujui TTM, dan SMTP produksi bila undangan/reset dikirim melalui email.
6. Atur **Site URL** ke origin produksi yang benar dan **Redirect URLs** ke URL yang benar-benar digunakan aplikasi untuk undangan/reset. Gunakan URL tepat pada produksi; batasi wildcard ke preview yang terkontrol. Tambahkan localhost hanya untuk pengujian yang masih diperlukan.
7. Uji email undangan, penetapan password/reset, login, logout, akun nonaktif, dan URL kedaluwarsa pada alamat yang diizinkan. Konfigurasi localhost pada `supabase/config.toml` tidak membuktikan setting dashboard hosted sudah diterapkan.
8. Pastikan bucket bukti kegiatan private, jenis/ukuran file dibatasi, dan uji akses file menggunakan sesi anggota yang berbeda. Jangan menjadikan bucket publik untuk memperbaiki permission error.

Panduan resmi: [Auth general configuration](https://supabase.com/docs/guides/auth/general-configuration), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls). SQL, bootstrap, endpoint invitation, dan verifikasi otorisasi terperinci tetap mengikuti BACKEND.md.

## 2. Build dan hosting

Jalankan dari root checkout dengan Node.js 24 dan environment build yang sudah benar:

```sh
npm ci
npm test
npm run test:db
npm run build
```

Periksa hasil build menggunakan `npm run preview`, lalu jalankan UAT browser desktop dan mobile. `vite preview` hanya untuk pemeriksaan lokal. [Dokumentasi Vite](https://vite.dev/guide/static-deploy) menjelaskan bahwa output produksi berada di `dist/` dan harus disajikan oleh hosting static.

### Hosting Sites

Konfigurasi `.openai/hosting.json` memetakan Site ke `dist/`. Simpan versi source dan archive yang sesuai, deploy versi yang tersimpan, kemudian catat URL serta status terminal sukses dari provider. Publikasi private hanya memberi akses audience yang ditetapkan provider; akses tim TTM memerlukan audience/hosting yang sesuai dan Auth CRM tetap berlaku. Jangan mengganti audience tanpa keputusan pemilik.

### Alternatif hosting static

Aplikasi dapat disajikan oleh hosting HTTPS yang mendukung file static, misalnya root domain perusahaan pada layanan hosting yang dipilih TTM. Prosedur ini tidak mengasumsikan akun hosting sudah tersedia:

1. Isi dua variabel publik Supabase pada environment build penyedia atau `.env.local` lokal yang diabaikan Git.
2. Bila host membangun dari Git, gunakan `npm ci` sebagai install command, `npm run build` sebagai build command, dan `dist` sebagai publish directory. Hubungkan repository target setelah hak push diperbaiki.
3. Untuk upload manual, jalankan paket static dengan PowerShell. Pilih nama archive baru di luar checkout; script menolak penimpaan file yang sudah ada:

```powershell
./scripts/package-static.ps1 -OutputArchive 'C:/release/ttm-crm-1.0.0-static.zip'
```

4. Unggah **isi** archive (index.html dan assets pada root) ke deployment baru; jangan mengunggah source, `.env`, `node_modules`, atau PDF katalog penuh. Jika host mengharuskan upload folder, gunakan isi `dist/` dari build yang sama.
5. Aplikasi menggunakan URL hash untuk navigasi bila routing UI memakai hash; verifikasi direct URL dan refresh pada hasil build. Jika nantinya memakai history routing, konfigurasi fallback non-file ke `index.html` tanpa menimpa asset/API.
6. Terapkan domain/TLS, perbarui Auth Site URL/redirect allowlist, lalu uji login pada origin final. Simpan versi sebelumnya agar rollback frontend tidak memerlukan build ulang.

Script packaging tidak mengunggah, mengubah Supabase, mengundang anggota, atau mengklaim sukses deployment. Keberhasilan upload harus diverifikasi pada provider dan browser.

## 3. UAT produksi/pilot

Gunakan akun uji berhak director/admin, PS, AS, dan viewer. Labeli data uji dan hapus/arsipkan melalui prosedur yang menjaga audit. Jangan memakai data pasien.

| Skenario | Hasil yang harus dibuktikan |
| --- | --- |
| Login invited user dan akun nonaktif | Anggota aktif masuk; nonaktif/tanpa profil ditolak |
| Pelanggan/PIC dan peluang | Simpan, refresh, login ulang, serta sesi kedua menampilkan data persistensi yang sama |
| Owner dan role | Anggota tidak dapat mengubah data milik orang lain di luar penugasannya; viewer gagal menulis melalui API langsung |
| Pipeline | Tahap/value/probability konsisten; won/lost terpisah dari pipeline aktif |
| Kalender WIB | Waktu benar di desktop/mobile, lintas hari/bulan dan hari UTC yang berbeda |
| Personel/unit sama | Overlap ditolak backend, termasuk permintaan hampir bersamaan dari dua sesi; sesi berurutan diizinkan |
| Status kegiatan | Submit, approval director, penolakan, pelaksanaan, selesai dengan laporan; perubahan jadwal membutuhkan persetujuan ulang |
| Laporan dan lampiran | Unggah valid, file terlalu besar/tipe tak didukung gagal; signed URL kedaluwarsa; akun tidak sah tidak dapat membaca |
| Follow-up | Tugas tertunda/selesai sesuai penanggung jawab dan tenggat |
| Undangan/role | Admin mengundang anggota; nonadmin dan request tanpa sesi ditolak; role tidak berasal dari metadata yang dapat diedit user |
| Audit dan ekspor | Perubahan tercatat; audit hanya terbaca pihak berhak; CSV menangani formula, petik dan multiline |
| Gangguan koneksi | Error jelas; input tidak diklaim tersimpan sebelum server mengonfirmasi |
| Backup/restore | Jadwal backup terbukti dan satu restore drill berhasil pada lingkungan terpisah |

Simpan tanggal, versi/commit, penguji, hasil, dan bukti per skenario pada catatan release. Uji lokal dengan stub Auth/Storage belum menguji layanan Supabase hosted atau deliverability email. Product Director menyetujui hasil pilot sebelum rollout tim penuh.

## 4. Backup, pemulihan, dan rollback

- **Sebelum migrasi:** verifikasi fasilitas backup/PITR yang benar-benar tersedia pada paket Supabase proyek target. Ambil backup schema/data yang dapat dipulihkan dan inventaris Storage sesuai kebutuhan. Simpan terenkripsi di tempat privat di luar repository publik.
- **Storage:** backup database tidak otomatis menjadi salinan file lampiran. Pastikan objek, metadata, dan kebijakan pemulihan lampiran tercakup. Dokumentasikan retensi dan penanggung jawab.
- **Sasaran pemulihan:** Product Director/operator menetapkan RPO dan RTO sebelum go-live; belum ada target layanan yang dianggap disetujui hanya karena script tersedia. Rekam hasil restore drill dan lama pemulihannya.
- **Rollback frontend:** hentikan rollout, kembali ke versi static/provider sebelumnya yang sudah diketahui baik, lalu uji login dan operasi baca/tulis. Pastikan versi lama kompatibel dengan schema saat ini; jangan mengembalikan frontend ke schema yang tidak kompatibel.
- **Rollback database:** utamakan migrasi perbaikan maju yang direview. Jika restore diperlukan, hentikan penulisan, simpan data sejak backup sesuai rencana, pulihkan pada lingkungan terpisah dan validasi sebelum cutover. Jangan menjatuhkan tabel produksi atau menghapus history migrasi untuk mengulang migrasi awal.
- **Insiden secret:** rotasi di penyedia, cabut sesi/token sesuai jenis credential, bersihkan riwayat bila sempat terpublikasi, lalu build ulang frontend dengan publishable key yang valid. Jangan menaruh secret baru dalam commit.

## 5. Checklist bukti go-live

- [ ] Source dan PRD berada pada commit yang dapat ditelusuri di repository target.
- [ ] CI pada commit release lulus; output build sama dengan artefak yang dipublikasikan.
- [ ] Schema, seed, RLS, Storage, dan fungsi admin terpasang serta diverifikasi pada proyek Supabase target.
- [ ] Publishable key benar; tidak ada secret administratif dalam browser/source/archive publik.
- [ ] Auth invitation-only, Site URL/redirect, SMTP, admin pertama dan admin cadangan teruji.
- [ ] UAT empat role, persistensi lintas sesi dan konflik concurrent lulus pada target.
- [ ] Master produk, anggota, wilayah, unit demo, dan data awal disetujui TTM.
- [ ] Backup, restore drill, pemantauan, pemilik support, dan rollback siap.
- [ ] Provider memberi status deployment sukses dan URL final dapat dipakai audience tim yang disepakati.
- [ ] Product Director mencatat keputusan go-live/pilot dan tanggal rollout.

Sampai checklist itu terbukti, gunakan status yang tepat: implementasi lokal, frontend terpublikasi, atau pilot backend; bukan go-live CRM lengkap.
