# Backend Supabase TTM CRM

Backend target: `yqmcafgnryvsrvalbycz`. **Enam migrasi telah diterapkan**, mencakup **13 tabel bisnis ber-RLS** dan dua bucket privat: evidence **10 MiB** serta Knowledge Base **25 MiB**. Verifikasi 12 November 2026: **188 SQL/RLS lokal** dan **40/40 hosted approval API** lulus; fixture dibersihkan. Bukti: [APPROVAL-UAT.md](APPROVAL-UAT.md). Hasil Knowledge Base sebelumnya **39/39**, 11 November 2026, tetap dicatat di `KNOWLEDGE-UAT.md`. SMTP tim, workflow bisnis nyata dan backup/restore tetap tindak lanjut pilot Director.

## Artefak dan kontrak

- `supabase/migrations/20261110222856_ttm_crm_initial.sql`: schema tambahan, RLS, constraints, trigger, indeks, audit, dan bucket privat.
- `supabase/migrations/20261110222904_ttm_crm_revoke_rls_auto_enable_execute.sql`: hardening helper event trigger target yang telah diverifikasi.
- `supabase/migrations/20261111015854_ttm_crm_policy_and_fk_indexes.sql`: policy write-only manager yang setara dan 12 indeks FK tambahan.
- `supabase/migrations/20261111071649_product_knowledge_library.sql`: library materi produk/umum, private Storage 25 MiB, file binding immutable, archive/restore dan audit.
- `supabase/migrations/20261111205526_single_stage_activity_approval.sql`: reporting lines, satu tahap review supervisor/Director, RLS, actor/time server, audit dan pencegahan siklus.
- `supabase/migrations/20261112023647_normalize_approval_note_whitespace.sql`: normalisasi tab/baris baru agar alasan penolakan whitespace-only ditolak pada RPC maupun direct UPDATE.
- `supabase/seed.sql`: 87 model/produk hasil pembacaan visual katalog; tidak memuat pelanggan, anggota, unit demo, atau penjualan fiktif. `source_page` berarti nomor halaman fisik PDF berbasis 1. Nomor halaman tercetak disimpan pada `specs.source_printed_page`.
- `supabase/functions/team-admin/index.ts`: endpoint administratif undangan/profil.
- `scripts/test-db.mjs`: verifikasi PostgreSQL lokal melalui PGlite. Membuat database sementara in-memory, tidak menghubungi target.

Seluruh data bisnis dapat dibaca anggota aktif dalam satu organisasi TTM. Viewer hanya membaca. Specialist menulis milik/penugasan sendiri; director/admin mengelola data dan hierarki. Approval hanya oleh atasan langsung atau Product Director, tidak boleh pemilik kegiatan sendiri; admin perlu assignment sebagai atasan langsung. Profil memiliki aturan khusus: anggota aktif dapat mengubah `full_name` sendiri; hanya director/admin dapat mengubah role, email, wilayah, kompetensi, atau status aktif. Email login Auth tidak ikut diubah melalui endpoint profil.

Tabel `audit_logs` memakai `id bigint`, `entity_type`, `entity_id`, `action`, `actor_id`, `occurred_at`, `old_data`, `new_data`. Tidak ada grant insert/update/delete untuk pengguna. Actor dari JWT pemanggil dicatat oleh trigger; maintenance SQL operator dapat memiliki actor null.

Lampiran memakai `activity_attachments(id,activity_id,file_name,storage_path,mime_type,size_bytes,created_at,updated_at,created_by)`. Bucket `activity-evidence` privat, maksimum 10 MiB; PDF, PNG, JPEG, DOCX. Path `<activity_uuid>/<random_filename>`; upload immutable, tanpa upsert. Unggah objek dahulu, simpan metadata sesudah sukses; hapus objek baru jika metadata gagal. Unduhan harus melalui authenticated Storage/signed URL berumur pendek. Batas file tetap ditegakkan bucket, bukan hanya form browser.

Knowledge Base memakai `knowledge_documents`, dengan `product_id` nullable untuk materi umum. Bucket `product-knowledge` privat, maksimum 25 MiB; PDF/PPT/PPTX/DOC/DOCX/XLS/XLSX/PNG/JPEG. Path adalah `<author_uuid>/<document_uuid>/<random_uuid.ext>`. Server menetapkan creator dan binding internal `storage_object_id`, memeriksa owner objek dan metadata size/MIME bila tersedia, serta menegakkan FK `ON DELETE RESTRICT` agar attach dan cleanup tidak menghasilkan referensi file yang hilang.

Anggota aktif termasuk viewer dapat membaca materi; hanya nonviewer dapat mengunggah/membuat. Author atau director/admin dapat mengedit metadata, mengarsipkan dan memulihkan. **Gunakan Archive/Restore, bukan hard delete**, untuk materi yang sudah tercatat. File, path, creator, MIME dan ukuran tidak dapat diganti; file revisi diunggah sebagai record baru dengan versi yang sesuai. Blob yang sudah terhubung tetap disimpan, termasuk ketika materi diarsipkan. Cleanup hanya untuk orphan upload milik pengunggah sendiri bila penyimpanan metadata gagal; gunakan Storage API, bukan penghapusan SQL langsung. Konfirmasi cleanup dengan Storage.list, karena GET yang pernah diunduh dapat terkena CDN cache.

## Status dan reservasi

Status kegiatan: `draft`, `submitted`, `approved`, `in_progress`, `completed`, `rejected`, `cancelled`. Insert hanya draft/submitted. Approval/rejection melalui `review_activity(p_activity_id,p_decision,p_note)` memakai satu tahap oleh atasan langsung atau Product Director selain owner. RPC dan direct UPDATE menegakkan aturan sama. Penolakan wajib alasan nonblank, maksimal 4000 karakter; perubahan business field tidak boleh digabung dengan keputusan. Completed memerlukan laporan minimal 10 karakter dan outcome; cancelled memerlukan alasan. Perubahan jadwal/koordinator/peserta/unit pada approved/in_progress mengembalikan status ke submitted dan mengosongkan approval/review stamps. Hierarki dikelola Director/Admin, menolak self/cycle, dan hanya menerima member/supervisor aktif selain viewer.

Submitted, approved, dan in_progress menahan slot. Konflik memakai interval `[start_at,end_at)` dan memeriksa koordinator, array `participant_ids`, serta `equipment_ids`. Trigger mengambil transaction advisory lock yang sama untuk seluruh perubahan jadwal, kemudian memeriksa overlap terhadap seluruh organisasi. Ini sengaja mengutamakan konsistensi untuk tim internal; pada skala besar, normalisasi reservasi ke tabel resource dengan exclusion constraints layak dipertimbangkan. Uji race paralel pada PostgreSQL target tetap diperlukan; PGlite tidak membuktikan konkurensi antar koneksi jaringan.

Timestamp tersimpan `timestamptz`; UI memformat Asia/Jakarta atau zona kegiatan. `approved_by`, `submitted_at`, waktu selesai tugas, pelaku, dan timestamps dikelola server. Produk/master unit tidak diartikan sebagai stok barang.

## Team-admin Edge Function

POST `/functions/v1/team-admin`, header `Authorization: Bearer <access_token_user>`, `apikey: <publishable_key>`, content type JSON. SDK browser `supabase.functions.invoke('team-admin', {body})` dapat digunakan.

```json
{"action":"invite","email":"anggota@domain-perusahaan","full_name":"Nama Anggota","role":"product_specialist","active":true,"region":"Jawa Barat","skills":["USG"]}
```

`update` menerima `id`, `full_name`, `role`, `active`, `region`, `skills`. `update_self` menerima `full_name` dan selalu memakai ID sesi sendiri. Sukses mengembalikan `{profile}` atau `{profile,invitation_sent:true}`; kegagalan `{error}` dengan status HTTP sesuai. Jangan tampilkan sukses bila status/error gagal. Undangan yang terkirim tetapi insert profil gagal menghasilkan error 500 yang eksplisit; Auth user tanpa profil aktif tetap tidak mendapat data bisnis. Operator memperbaiki profil tanpa mengirim undangan ulang secara buta.

Environment Edge: `APP_ORIGINS` dapat mengoverride daftar origin HTTPS exact, dipisahkan koma; `APP_ORIGIN` didukung sebagai fallback legacy. Default source mengizinkan `https://ttm-product-workspace.hamdanfaiz.chatgpt.site` dan `https://cyan-oryx-350189.hostingersite.com`. Header Origin harus cocok persis dengan daftar server; redirect undangan dipilih hanya dari origin yang sudah tervalidasi tersebut. Body tidak dapat memasok redirect bebas. Request tanpa Origin menggunakan Sites pada konfigurasi default. Supabase menyediakan `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` pada hosted function; kode juga mendukung `SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SECRET_KEY`. Secret hanya server. CORS tidak menggantikan autentikasi. Function memvalidasi user melalui `getUser()`, lalu lookup profil aktif dan role; tidak mengotorisasi `user_metadata`.

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

Hasil verifikasi lokal 11 November 2026: **109 checks SQL/RLS lulus** (47 baseline dan 62 Knowledge Base), seed **87 produk** terbaca, dan typecheck `team-admin` yang telah dilakukan sebelumnya lulus menggunakan Deno **2.9.6** serta SDK terpin **2.119.0**. Hosted KB API lulus **39/39**, memakai PDF nyata dan fixture sementara yang dibersihkan. Rincian cakupan dan batas signed-URL/cache berada di `KNOWLEDGE-UAT.md`. Typecheck bukan bukti SMTP undangan sudah bekerja.

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

## Deployment target yang telah terverifikasi

Keempat migration version/name pada inventaris artefak di atas sesuai history remote. Initial SQL diterapkan utuh, seed berisi 87 produk dengan provenance pada 24 halaman sumber, seluruh 12 tabel bisnis ber-RLS, anon tidak mempunyai grant tabel bisnis, dan pengguna aplikasi tidak mempunyai grant tulis/truncate audit. Helper event trigger public telah dicabut hak execute client-nya tanpa mengganti body/event trigger. Migrasi KB tidak mengubah evidence policy atau Auth/config/function yang sudah berjalan.

Bucket evidence telah diverifikasi public=false, batas 10 MiB, tipe PDF/PNG/JPEG/DOCX. team-admin terbaru berstatus ACTIVE versi 2 dengan verify_jwt=true. Setelah penambahan Hostinger, live preflight memberikan 204 dengan ACAO exact untuk Sites dan Hostinger, serta 403 tanpa ACAO untuk origin asing. Tes ini tidak mengirim undangan atau menulis data.

Setelah migrasi optimasi, advisor tidak lagi melaporkan multiple-permissive-policy atau missing-FK-index untuk tabel CRM. Snapshot sebelum/sesudah migrasi KB mencatat unused-index **INFO** 21 menjadi 24, dengan tiga tambahan indeks pada tabel KB baru; indeks dipertahankan untuk workload nyata. Warning pengamanan password bocor pada konfigurasi Auth sudah ada sebelumnya dan tidak berubah; tidak ada finding keamanan baru dari KB. Snapshot akses awal pada bagian sebelumnya adalah riwayat pemeriksaan, bukan keadaan deployment terakhir.

Root telah memverifikasi pilot director: akun director berhasil membuat password dan login, Sites versi 2 berhasil, signup publik nonaktif, minimum password 10, serta 23 pemeriksaan hosted termasuk 3 race tests paralel lulus dan seluruh fixture dibersihkan. Jumlah data bisnis sesudah pembersihan: profiles 1, products 87, accounts 0. SMTP tim belum dikonfigurasi. Pemeriksaan backup menunjukkan backup 0 dan PITR false; pengguna menyetujui snapshot JSON lokal yang sudah dihasilkan sebagai artefak outputs. Snapshot tersebut tidak menggantikan kebijakan backup terjadwal.

Riwayat persiapan Hostinger: allowed redirect `https://cyan-oryx-350189.hostingersite.com` ditambahkan sambil mempertahankan Sites. Tahap allowlist tersebut hanya mengubah additional_redirect_urls, mempertahankan sembilan properti remote yang tidak dideklarasikan, dengan post-push diff nol. **Cutover terkini telah diverifikasi 13:35 WIB:** primary Auth Site URL menjadi Hostinger; hanya `auth.site_url` berubah dan post-push diff nol. Kedua redirect tetap, signup publik/anon nonaktif, minimum password 10.

Frontend Hostinger kini live; auto-update source `630bf0762c5c76944d926b688d2b2b9c2219f6d0` melalui CI `42973665518` terbukti Completed 13:37 WIB tanpa klik Redeploy; HTTP smoke 13/13 PASS 13:38 WIB. Pengguna secara eksplisit mengonfirmasi login Hostinger berhasil. Ini acceptance pengguna, bukan klaim agent mengobservasi workflow bisnis akun nyata. Status siap pilot director; SMTP tim, UAT workflow nyata dan backup/restore tetap tindak lanjut. Detail jejak source/artifact/provider terdapat di `HOSTINGER-UAT.md`.
