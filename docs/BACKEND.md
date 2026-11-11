# Backend Supabase TTM CRM

Backend target: `yqmcafgnryvsrvalbycz`. Dokumen ini menjelaskan artefak yang disiapkan; migrasi belum diterapkan ke target. Dua koneksi connector awal menolak akses. MCP lokal yang kemudian dikonfigurasi berhasil menginspeksi target tetapi memakai `read_only=true`, sehingga tidak memberi kemampuan deployment.

## Artefak dan kontrak

- `supabase/migrations/20261110222856_ttm_crm_initial.sql`: schema tambahan, RLS, constraints, trigger, indeks, audit, dan bucket privat.
- `supabase/seed.sql`: 87 model/produk hasil pembacaan visual katalog; tidak memuat pelanggan, anggota, unit demo, atau penjualan fiktif. `source_page` berarti nomor halaman fisik PDF berbasis 1. Nomor halaman tercetak disimpan pada `specs.source_printed_page`.
- `supabase/functions/team-admin/index.ts`: endpoint administratif undangan/profil.
- `scripts/test-db.mjs`: verifikasi PostgreSQL lokal melalui PGlite. Membuat database sementara in-memory, tidak menghubungi target.

Seluruh data bisnis dapat dibaca anggota aktif dalam satu organisasi TTM. Viewer hanya membaca. Specialist menulis milik/penugasan sendiri; director/admin mengelola data dan persetujuan. Profil memiliki aturan khusus: anggota aktif dapat mengubah `full_name` sendiri; hanya director/admin dapat mengubah role, email, wilayah, kompetensi, atau status aktif. Email login Auth tidak ikut diubah melalui endpoint profil.

Tabel `audit_logs` memakai `id bigint`, `entity_type`, `entity_id`, `action`, `actor_id`, `occurred_at`, `old_data`, `new_data`. Tidak ada grant insert/update/delete untuk pengguna. Actor dari JWT pemanggil dicatat oleh trigger; maintenance SQL operator dapat memiliki actor null.

Lampiran memakai `activity_attachments(id,activity_id,file_name,storage_path,mime_type,size_bytes,created_at,updated_at,created_by)`. Bucket `activity-evidence` privat, maksimum 10 MiB; PDF, PNG, JPEG, DOCX. Path `<activity_uuid>/<random_filename>`; upload immutable, tanpa upsert. Unggah objek dahulu, simpan metadata sesudah sukses; hapus objek baru jika metadata gagal. Unduhan harus melalui authenticated Storage/signed URL berumur pendek. Batas file tetap ditegakkan bucket, bukan hanya form browser.

## Status dan reservasi

Status kegiatan: `draft`, `submitted`, `approved`, `in_progress`, `completed`, `rejected`, `cancelled`. Insert hanya draft/submitted. Approval/rejection hanya director/admin. Completed memerlukan laporan minimal 10 karakter dan outcome; rejected/cancelled memerlukan `approval_note` sebagai alasan. Perubahan jadwal/koordinator/peserta/unit pada approved/in_progress mengembalikan status ke submitted.

Submitted, approved, dan in_progress menahan slot. Konflik memakai interval `[start_at,end_at)` dan memeriksa koordinator, array `participant_ids`, serta `equipment_ids`. Trigger mengambil transaction advisory lock yang sama untuk seluruh perubahan jadwal, kemudian memeriksa overlap terhadap seluruh organisasi. Ini sengaja mengutamakan konsistensi untuk tim internal; pada skala besar, normalisasi reservasi ke tabel resource dengan exclusion constraints layak dipertimbangkan. Uji race paralel pada PostgreSQL target tetap diperlukan; PGlite tidak membuktikan konkurensi antar koneksi jaringan.

Timestamp tersimpan `timestamptz`; UI memformat Asia/Jakarta atau zona kegiatan. `approved_by`, `submitted_at`, waktu selesai tugas, pelaku, dan timestamps dikelola server. Produk/master unit tidak diartikan sebagai stok barang.

## Team-admin Edge Function

POST `/functions/v1/team-admin`, header `Authorization: Bearer <access_token_user>`, `apikey: <publishable_key>`, content type JSON. SDK browser `supabase.functions.invoke('team-admin', {body})` dapat digunakan.

```json
{"action":"invite","email":"anggota@domain-perusahaan","full_name":"Nama Anggota","role":"product_specialist","active":true,"region":"Jawa Barat","skills":["USG"]}
```

`update` menerima `id`, `full_name`, `role`, `active`, `region`, `skills`. `update_self` menerima `full_name` dan selalu memakai ID sesi sendiri. Sukses mengembalikan `{profile}` atau `{profile,invitation_sent:true}`; kegagalan `{error}` dengan status HTTP sesuai. Jangan tampilkan sukses bila status/error gagal. Undangan yang terkirim tetapi insert profil gagal menghasilkan error 500 yang eksplisit; Auth user tanpa profil aktif tetap tidak mendapat data bisnis. Operator memperbaiki profil tanpa mengirim undangan ulang secara buta.

Environment Edge: `APP_ORIGIN` dapat mengoverride origin aplikasi (tanpa path/trailing slash); default source adalah origin deployment yang ditetapkan, `https://ttm-product-workspace.hamdanfaiz.chatgpt.site`. Origin ini konfigurasi publik dan dipakai untuk CORS serta redirect undangan; nilainya tidak diambil dari request. Supabase menyediakan `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` pada hosted function; kode juga mendukung `SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SECRET_KEY`. Secret hanya server. CORS tidak menggantikan autentikasi. Function memvalidasi user melalui `getUser()`, lalu lookup profil aktif dan role; tidak mengotorisasi `user_metadata`.

## Deployment setelah akses diperbaiki

1. Pastikan akun management benar-benar memiliki proyek target; jangan membuat proyek pengganti. Periksa tabel, policies Storage/Auth, migrations, advisor keamanan, dan backup target sebelum perubahan. Migrasi initial sengaja gagal pada konflik nama; rekonsiliasi diperlukan bila target memiliki tabel yang sama. Jangan memakai `db reset` pada produksi.
2. Gunakan CLI terpin `supabase@3.1.0` dan baca `--help` sebelum menjalankan perintah. CLI v3 berbeda dari v2 dan target hosted perlu flag remote eksplisit. `supabase link --help`, `supabase migration up --help`, `supabase db query --help`, `supabase functions deploy --help`, `supabase secrets set --help` menentukan argumen versi yang digunakan. Jangan mengandalkan perintah lama tanpa verifikasi.
3. Terapkan migrasi pada lingkungan QA/staging yang berhak terlebih dahulu, jalankan SQL/RLS dan race test, lalu jalankan migrasi additive di target setelah inspeksi. Seed katalog dijalankan sebagai SQL operator sekali; aman dijalankan ulang berdasarkan SKU. Jangan menerapkan data demo UI ke produksi.
4. Matikan public signups dan anonymous sign-in pada Auth target, atur Site URL dan allowed redirect URL ke origin aplikasi. Konfigurasi lokal pada `config.toml` tidak otomatis mengubah hosted Auth. Siapkan SMTP pengiriman undangan/recovery dan uji satu undangan nyata.
5. Deploy `team-admin`, set `APP_ORIGIN` melalui saluran environment aman; jangan menulis secret ke source/log/command history. Pastikan gateway JWT tetap memvalidasi user token. Jalankan advisors keamanan setelah perubahan dan perbaiki isu yang relevan.
6. Isi `VITE_SUPABASE_URL` serta `VITE_SUPABASE_PUBLISHABLE_KEY` saat build frontend. Hanya publishable key yang masuk browser. Tidak ada `service_role`/secret pada VITE variables.
7. Bootstrap director pertama dari akun Auth yang sah, lalu login dan undang anggota. Jangan membuat password bawaan.

Perintah deployment berikut diverifikasi terhadap help CLI 3.1.0. Jalankan hanya setelah akses tulis, inspeksi, staging, dan konfigurasi operator tersedia. `npm --yes` di bawah hanya menyetujui pengambilan paket npm, bukan konfirmasi hosted dari Supabase.

```powershell
npm exec --yes --package=supabase@3.1.0 -- supabase migration up --remote=yqmcafgnryvsrvalbycz
npm exec --yes --package=supabase@3.1.0 -- supabase db query --remote=yqmcafgnryvsrvalbycz --file supabase/seed.sql
npm exec --yes --package=supabase@3.1.0 -- supabase functions deploy team-admin --remote=yqmcafgnryvsrvalbycz --use-api
```

Jangan menambahkan `--prune`, `--no-verify-jwt`, atau flag bypass untuk menyelesaikan kegagalan akses. Login CLI/OAuth dan secret provider dipasang oleh operator melalui saluran aman, bukan disalin dari auth store.

## Bootstrap administrator pertama

Operator yang sah membuat/mengundang pengguna melalui Supabase Auth terlebih dahulu. Setelah user ID/email terverifikasi, jalankan SQL ini di SQL Editor target, mengganti placeholder secara sengaja. Ini operasi operator, bukan endpoint registrasi publik.

```sql
insert into public.profiles(id,full_name,email,role,active)
select id, 'NAMA DIRECTOR YANG SAH', email, 'director', true
from auth.users
where id = 'UUID-USER-YANG-TELAH-DIVERIFIKASI'::uuid
  and lower(email) = lower('EMAIL-DIRECTOR-YANG-SAH');
```

Periksa tepat satu baris tersimpan. Terakhir director/admin aktif tidak dapat diturunkan atau dinonaktifkan melalui aplikasi. Penonaktifan profil berlaku segera untuk data access melalui DB, walau JWT belum kedaluwarsa. Penghapusan Auth user tidak dipakai sebagai pengganti revoke session.

## Uji dan bukti go-live

Jalankan `npm run test:db` setelah dependency PGlite terpasang. Tes mencakup schema/seed, anon, nonmember, inactive, viewer, self escalation, ownership, nilai peluang, workflow, approval actor, overlap/adjacency, laporan, cancellation, audit, dan evidence storage RLS.

Hasil verifikasi lokal 11 November 2026: **47 checks SQL/RLS lulus**, seed **87 produk** terbaca, dan `deno check supabase/functions/team-admin/index.ts` lulus menggunakan Deno **2.9.6** serta SDK terpin **2.119.0**. Typecheck bukan bukti endpoint sudah dideploy atau SMTP undangan sudah bekerja.

Pada staging nyata gunakan dua koneksi/transaksi berbeda yang mengajukan dua kegiatan beririsan dengan orang/unit sama secara bersamaan. Hanya satu boleh commit; lainnya harus gagal `23P01`. Ulangi adjacency (keduanya diterima), cancel lalu booking ulang, unit maintenance, pergantian role, serta penonaktifan sesi aktif. Simpan hasil tanpa token/password.

UAT wajib: login director → buat instansi/PIC/peluang → kegiatan draft → submit → approve → mulai → unggah bukti → laporan complete → follow-up → reload/sesi lain → ekspor. Uji recovery password dan undangan. Verifikasi bucket tetap privat serta unauthenticated API tidak dapat membaca data. Tanpa bukti tersebut, status backend adalah belum go-live.

## Rollback dan pemulihan

Rollback frontend ke versi build sebelumnya jika kompatibel schema. Migrasi ini additive; jangan drop tabel berisi data sebagai rollback rutin. Jika perubahan backend gagal, hentikan penulisan, evaluasi transaksi yang gagal, gunakan forward-fix yang diaudit atau restore backup sesuai prosedur Supabase yang telah diuji. Verifikasi backup/retensi/PITR proyek sebelum go-live; jangan menyatakan tersedia hanya karena penyedia mendukungnya.

## Status pemeriksaan target awal

Dua connector awal menolak akses. Probe HTTP read-only menggunakan publishable key menerima 401 pada OpenAPI root (`Secret API key required`), sementara probe nol baris `products?select=id&limit=0` menerima 404 `PGRST205` (tabel belum berada pada schema cache/exposure). Probe HTTP ini sendiri tidak membuktikan schema kosong.

Pada 11 November 2026 pukul 05:15 WIB, inspeksi melalui MCP lokal `supabase` dengan akses read-only berhasil mengonfirmasi target URL. `list_tables` mengembalikan 0 tabel public dan `list_migrations` mengembalikan 0 migrasi. Advisor keamanan menemukan dua WARN: `public.rls_auto_enable()` SECURITY DEFINER dapat dieksekusi `anon` dan `authenticated`. Pemeriksaan definisi fungsi melalui `execute_sql` tidak berjalan karena alat memerlukan approval sementara subprocess noninteraktif memiliki policy `never`. Karena definisi belum terverifikasi, migrasi initial tidak mengubah fungsi yang sudah ada tersebut secara buta.

Sebelum go-live, operator perlu memeriksa definisi/return type dan pemakai fungsi tersebut. Jika benar helper event trigger untuk auto-enable RLS dan tidak membutuhkan panggilan aplikasi, cabut execute dari PUBLIC/anon/authenticated, lalu ulangi advisors. Contoh setelah verifikasi operator:

```sql
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

Tidak ada data atau pengaturan target yang ditulis dalam tahap pemeriksaan ini. Public tables dan migration history kosong tidak membuktikan Auth/Storage/config proyek kosong; inspect komponen tersebut sebelum penerapan.

Endpoint publik Auth `/auth/v1/settings` kemudian mengembalikan `disable_signup:false`, `mailer_autoconfirm:false`, email provider enabled, dan anonymous users disabled. Jadi public signup target **masih aktif** pada pemeriksaan ini dan harus dimatikan sebelum release invitation-only. RLS aplikasi tetap mensyaratkan profil aktif, tetapi konfigurasi Auth tersebut belum sesuai kebijakan onboarding v1. `config.toml` lokal sudah `enable_signup=false`; file lokal tidak otomatis mengubah hosted settings.

Referensi: [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [Auth admin invitation](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), [CLI changelog v3](https://supabase.com/changelog/supabase-cli-v3), [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).
