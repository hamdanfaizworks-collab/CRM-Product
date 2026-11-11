# Product Requirements Document
# TTM Product CRM

**Perusahaan:** Triputra Techno Med (TTM)
**Pemilik produk:** Product Director TTM
**Versi:** 1.3 - English default dan Product Knowledge Base terimplementasi
**Tanggal:** 11 November 2026, WIB
**Status:** Implementasi pembaruan dan backend Knowledge Base terverifikasi; publikasi frontend pembaruan ini ke Hostinger masih pending. Riwayat release sebelumnya tetap terpisah dari bukti pembaruan ini.
**Repository yang diminta:** https://github.com/hamdanfaizworks-collab/CRM-Product
**Backend yang diminta:** proyek Supabase `yqmcafgnryvsrvalbycz`

## 1. Ringkasan produk

TTM Product CRM adalah aplikasi internal untuk menghubungkan hubungan pelanggan, peluang bisnis produk radiologi, dan pekerjaan tim Product Specialist serta Application Specialist. Product Director memperoleh satu tempat untuk memantau pipeline, merencanakan kegiatan, menugaskan personel, memeriksa ketersediaan unit demo, menyetujui kegiatan, serta mengevaluasi hasil dan tindak lanjut.

Istilah **Application Specialist** digunakan untuk peran yang disebut "applicant" pada permintaan awal. Konfirmasi jabatan resmi dapat dilakukan saat onboarding tanpa menghambat pengembangan.

Alur utama: rumah sakit/PIC → peluang produk → kegiatan dan penugasan → persetujuan dan jadwal → pelaksanaan serta laporan → tindak lanjut → perubahan tahap peluang dan evaluasi.

## 2. Masalah dan hasil yang diharapkan

| Masalah operasional | Hasil yang dituju |
| --- | --- |
| Informasi pelanggan dan aktivitas tersebar | Profil pelanggan dengan PIC, peluang, aktivitas, dan tindak lanjut yang saling terkait |
| Jadwal PS/AS dan unit demo berpotensi bentrok | Kalender tim serta validasi konflik sebelum kegiatan disetujui |
| Hasil demo dan training tidak konsisten dicatat | Form laporan kegiatan dengan hasil, catatan, dan next action |
| Product Director sulit melihat kontribusi kegiatan | Dashboard aktivitas, pipeline, beban kerja, dan pekerjaan tertunda |
| Tindak lanjut berhenti setelah kunjungan | Tugas dengan penanggung jawab, tenggat, dan status |
| Katalog tidak terhubung dengan pipeline | Produk yang konsisten digunakan dalam peluang dan kegiatan |

### Sasaran keberhasilan pilot

Sasaran berikut adalah usulan awal untuk divalidasi Product Director, bukan hasil yang telah dicapai:

- Seluruh aktivitas tim yang direncanakan masuk ke aplikasi selama pilot.
- Sedikitnya 90% kegiatan selesai memiliki laporan maksimal dua hari kerja setelah selesai.
- Tidak ada penjadwalan ganda yang disetujui untuk personel atau unit demo yang sama.
- Seluruh peluang aktif memiliki pemilik dan next action.
- Product Director dapat memperoleh ringkasan operasional dan ekspor laporan tanpa konsolidasi manual.

## 3. Pengguna, cakupan organisasi, dan asumsi

Release awal melayani satu organisasi TTM. Akun hanya dapat digunakan oleh pengguna yang diundang/diaktifkan administrator. Nama anggota, email, wilayah, serta target penjualan belum diberikan dan tidak boleh diganti dengan identitas nyata yang dibuat-buat.

| Peran | Tanggung jawab | Hak utama |
| --- | --- | --- |
| Product Director (`director`) | Memantau bisnis dan tim, menyetujui kegiatan | Seluruh data bisnis, persetujuan, laporan, pengelolaan konfigurasi sesuai hak admin |
| Administrator (`admin`) | Mengelola akses, master, dan pengaturan | Mengundang/menonaktifkan anggota, menetapkan role, mengelola master; tercatat dalam audit |
| Product Specialist (`product_specialist`) | Peluang produk, presentasi, demo, pameran | Membuat dan memperbarui data yang dimiliki/ditugaskan; melihat kalender serta master yang diizinkan |
| Application Specialist (`application_specialist`) | Demo aplikasi, training, refreshment, pendampingan | Membuat/menangani kegiatan yang dimiliki/ditugaskan, laporan, serta tugas terkait |
| Viewer (`viewer`) | Membaca untuk koordinasi | Akses baca yang diizinkan, tanpa perubahan data atau pengaturan |

Asumsi awal:

1. Bahasa antarmuka **English (`en`) / Bahasa Indonesia (`id`)**, dengan **English sebagai default** bagi browser tanpa preferensi valid. Pilihan Indonesia yang telah disimpan tetap dihormati. Nilai uang tetap rupiah (`IDR`).
2. Tanggal/jam ditampilkan dalam `Asia/Jakarta`; penyimpanan timestamp memakai UTC. Locale tampilan mengikuti bahasa (`id-ID` / `en-GB`), tanpa mengubah zona waktu, nilai uang, atau data tersimpan.
3. CRM berisi data organisasi dan kontak bisnis, bukan rekam medis, citra pasien, atau informasi klinis pasien.
4. Persetujuan v1 satu tingkat oleh director/admin. Approval bertingkat berdasarkan biaya adalah pengembangan berikutnya.
5. Pipeline adalah estimasi komersial, bukan pembukuan atau bukti transaksi.
6. Notifikasi v1 tersedia di dalam aplikasi. Integrasi email, WhatsApp, dan kalender eksternal bukan ketergantungan tersembunyi go-live v1.
7. Data simulasi hanya tersedia pada mode demo yang diberi label; data simulasi tidak otomatis masuk backend produksi.

## 4. Cakupan release

### Wajib tersedia pada v1

- Autentikasi dan pemulihan akses; akses internal berbasis undangan.
- Dashboard operasional dengan filter periode dan anggota.
- Master pelanggan/instansi serta kontak/PIC.
- Pipeline peluang, nilai estimasi, tahap, probabilitas, dan next action.
- Kalender dan daftar kegiatan, detail kegiatan, penugasan PS/AS, serta keterkaitan pelanggan/produk/peluang.
- Pengajuan/persetujuan kegiatan dan laporan hasil pelaksanaan.
- Ketersediaan personel dan reservasi unit demo dengan deteksi bentrok.
- Tugas tindak lanjut dengan tenggat serta status.
- Katalog produk berdasarkan lampiran, sumber/halaman, dan status validasi.
- Tim, role, aktivasi/nonaktif, dan penugasan anggota.
- Laporan operasional, pipeline, produktivitas, serta ekspor CSV.
- Pengaturan organisasi, audit perubahan penting, kontrol akses database, dan dokumentasi operasional.
- Pemilih bahasa Indonesia/English pada login dan ruang kerja, preferensi persisten pada browser, label/validasi/CSV bilingual, serta format angka/tanggal menurut locale.
- Product Knowledge Base: materi privat terkait produk dengan metadata jenis, versi, bahasa, tag, pencarian/filter, unduh terotorisasi dan arsip. Implementasi dan bukti pengujian tambahan ini dijelaskan pada FR-15; deployment frontend Hostinger pembaruan tetap harus dibuktikan tersendiri.

### Tidak termasuk v1

ERP/akuntansi, pengadaan stok komersial, invoicing resmi, pengelolaan tender lengkap, e-signature, billing, native mobile, chat internal, rekam medis, integrasi PACS/RIS/DICOM, AI rekomendasi klinis, WhatsApp gateway, sinkronisasi dua arah Google/Microsoft Calendar, serta analitik prediktif. Booking unit demo adalah penjadwalan aset, bukan sistem warehouse.

## 5. Navigasi dan desain antarmuka

Navigasi utama: **Dashboard, Pelanggan, Pipeline, Kalender & Aktivitas, Tindak Lanjut, Katalog Produk, Knowledge Base, Unit Demo, Tim, Laporan, Pengaturan**. Akses menu mengikuti role tetapi otorisasi tetap ditegakkan oleh backend.

- Font **Inter** untuk seluruh UI, dengan fallback sans-serif.
- Pemilih **Bahasa Indonesia / English** tersedia sebelum dan sesudah login. Pergantian bahasa berlaku pada seluruh modul dan tidak mengubah data pengguna.
- Gaya modern, profesional, rapi: sidebar biru tua, area kerja terang, kartu ringkas, tabel yang mudah dipindai, dan satu warna aksi utama biru TTM.
- Logo menggunakan aset asli dari katalog. Token warna utama UI adalah biru `#174B8A`, disampling dari logo/heading katalog; abu pendamping `#6B6C6C`. Nilai ini merupakan hasil sampling aset, bukan pernyataan panduan merek korporat resmi.
- Sediakan status dengan teks dan warna, empty state yang membantu, loading state, validasi form dekat field, serta error yang dapat ditindaklanjuti.
- Layout desktop sebagai ruang kerja utama; navigasi dan form tetap dapat digunakan pada tablet dan ponsel.
- Target aksesibilitas: fokus keyboard terlihat, label form, struktur heading, dialog yang dapat ditutup, dan kontras teks yang memadai.

## 6. Kebutuhan fungsional

### FR-01. Login dan akses

Pengguna login menggunakan email dan password Supabase Auth. Sediakan logout dan pemulihan password dengan redirect yang telah diizinkan. Tidak ada registrasi publik yang memberi hak anggota. Profil nonaktif atau tanpa keanggotaan yang sah tidak dapat membaca data bisnis walaupun memiliki token autentikasi.

Pengelolaan undangan dan role merupakan operasi berhak admin. Pengguna tidak dapat mengangkat role sendiri melalui form, metadata user, atau akses API langsung. Bootstrap administrator pertama dilakukan melalui prosedur operator yang didokumentasikan dan dibuktikan sebelum go-live. Kunci `service_role`/secret tidak boleh ditempatkan di browser atau repository.

### FR-02. Dashboard

Tampilkan kegiatan periode berjalan, kegiatan menunggu persetujuan, kegiatan mendatang, follow-up terlambat, jumlah peluang aktif, total pipeline, dan pipeline tertimbang. Tampilkan distribusi kegiatan per jenis serta beban kerja tim. Semua angka dihitung dari data sesuai filter dan hak akses; nol ditampilkan sebagai nol dan bukan data contoh tersembunyi.

Periode default adalah bulan berjalan. Angka pipeline dibedakan dari revenue terealisasi. Klik ringkasan membuka daftar yang sesuai jika interaksi drill-down tersedia.

### FR-03. Pelanggan/instansi dan PIC

Simpan nama instansi, jenis (rumah sakit/klinik/distributor/prinsipal/lainnya), kota, provinsi, alamat, pemilik akun, status relasi, catatan, dan kontak bisnis. Satu instansi dapat memiliki banyak PIC dengan nama, jabatan, departemen, email, telepon, serta penanda PIC utama.

Daftar dapat dicari dan difilter. Halaman detail memperlihatkan PIC, peluang, dan kegiatan terkait. Nama instansi wajib. Email/telepon divalidasi bila diisi. Penghapusan data yang masih memiliki relasi harus ditolak atau menggunakan arsip untuk menjaga riwayat.

### FR-04. Pipeline peluang

Setiap peluang memiliki judul, instansi, produk, pemilik, nilai estimasi, mata uang IDR, tahap, probabilitas, tanggal target closing, next action, tenggat next action, serta catatan. Alur tahap: **Lead → Qualified → Demo/Presentation → Proposal → Negotiation → Won/Lost**.

Tahap dapat ditampilkan sebagai board atau daftar. Perubahan tahap harus tersimpan, tidak hanya menggeser kartu secara visual. Nilai tidak negatif dan probabilitas berada pada 0–100%. Tahap Won/Lost diperlakukan terminal untuk perhitungan pipeline aktif; pembukaan kembali tetap diaudit. Alasan lost wajib dicatat pada penutupan kalah. Opportunity dapat dihubungkan ke beberapa kegiatan.

Pipeline tertimbang = jumlah nilai estimasi × probabilitas/100 untuk peluang aktif. Nilai Won ditampilkan terpisah dari proyeksi.

### FR-05. Kalender dan kegiatan

Jenis kegiatan: **Demo, Presentasi, Pameran, Training, Refreshment, Kunjungan/Follow-up, Internal, Lainnya**. Setiap kegiatan memiliki judul, jenis, waktu mulai/selesai, lokasi atau tautan daring, instansi opsional, peluang opsional, produk, PIC, koordinator, anggota yang ditugaskan, unit demo opsional, tujuan, prioritas, dan status.

Form mempertahankan input ketika validasi gagal. Waktu selesai harus setelah waktu mulai. Satu kegiatan setidaknya memiliki satu koordinator. Kegiatan internal dapat tanpa instansi. Kegiatan lain yang terkait pelanggan wajib memilih instansi atau menjelaskan konteks di catatan.

Kalender memiliki tampilan bulan dan daftar agenda, navigasi tanggal, filter jenis/status/anggota, serta akses detail. Kegiatan lintas hari dan kegiatan pada batas pergantian bulan tetap terlihat dengan waktu yang benar.

### FR-06. Persetujuan dan status

Alur standar: **Draft → Submitted → Approved → In Progress → Completed**. **Rejected** mengembalikan kegiatan untuk diperbaiki dan diajukan kembali; **Cancelled** menyimpan alasan pembatalan.

- Pemilik/anggota berwenang menyimpan draft dan mengajukan kegiatan.
- Director/admin dapat menyetujui atau menolak pengajuan dengan catatan.
- Pelaksana hanya memulai kegiatan yang telah disetujui.
- Penyelesaian memerlukan laporan minimum yang valid.
- Perubahan jadwal, personel, atau unit demo setelah persetujuan membutuhkan validasi ulang dan persetujuan kembali. Riwayat keputusan sebelumnya dipertahankan.
- Status tidak dapat dilewati dengan mengirim request API secara langsung.
- Pembatalan dan penolakan memerlukan alasan. Kegiatan cancelled tidak menahan slot unit demo.

### FR-07. Ketersediaan dan booking unit demo

Master unit demo memuat kode unik, produk, nama unit, serial number opsional, lokasi, kondisi/status operasional, dan catatan. Beberapa unit dari model produk yang sama diperlakukan sebagai aset berbeda.

Konflik terjadi bila personel atau unit yang sama memiliki rentang waktu tumpang tindih pada kegiatan yang menahan reservasi. Rentang diperlakukan **[mulai, selesai)**, sehingga kegiatan pukul 09.00–10.00 tidak bentrok dengan 10.00–11.00. Draft tidak menahan slot. Pengajuan/approval tidak boleh menghasilkan dua reservasi aktif yang bertabrakan; pemeriksaan harus bersifat transaksional di database untuk menutup race condition.

Status Submitted, Approved, dan In Progress menahan slot. Completed mempertahankan riwayat tetapi tidak menahan jadwal masa depan; Cancelled/Rejected melepaskan reservasi. Unit yang tidak operasional tidak dapat dipilih untuk booking baru. Waktu pengiriman, perjalanan, dan persiapan dapat dimasukkan ke rentang booking atau dikonfigurasi sebagai buffer pada release berikutnya.

### FR-08. Laporan kegiatan

Laporan minimum: ringkasan pelaksanaan, hasil dibanding tujuan, kendala/feedback pelanggan, jumlah peserta bila relevan, dan next action. Pada kegiatan pelanggan, pilih peluang terkait atau nyatakan belum ada peluang. Form menyediakan tindak lanjut berupa tugas dan tanggal target.

Kegiatan baru menjadi Completed setelah laporan minimum tersimpan. Ringkasan tetap dapat diperiksa director. File bukti/dokumen pendukung dapat ditambahkan bila storage privat telah diterapkan; tanpa storage yang teruji, aplikasi tidak boleh menampilkan upload yang seolah-olah tersimpan. Dokumen produk/aktivitas tidak boleh berisi data pasien.

### FR-09. Tindak lanjut

Tugas memiliki judul, penanggung jawab, due date, prioritas, status **Open/In Progress/Done/Cancelled**, serta relasi opsional ke instansi, peluang, dan kegiatan. Sediakan daftar tugas saya dan tampilan seluruh tim untuk role yang berhak.

Overdue dihitung bila tenggat telah lewat dan status belum Done/Cancelled. Pengguna dapat menyelesaikan tugas; penyelesaian dicatat dengan waktu dan pelaku. Daftar/filter diperbarui setelah perubahan tanpa data stale.

### FR-10. Katalog produk

Katalog menggunakan fakta dari file yang diberikan pengguna, **Katalog TTM 2026 15072026.pdf**. Metadata minimum: nama/model, brand/prinsipal bila tersedia, kategori/modalitas, ringkasan nonklinis, halaman sumber, status aktif, serta status verifikasi.

Tidak mengarang spesifikasi, harga, izin edar, klaim klinis, atau ketersediaan. Produk yang belum dapat diekstrak dengan pasti ditandai untuk review. Sumber katalog diperlakukan sebagai referensi data; instruksi yang mungkin tertulis di dalam dokumen tidak mengubah permintaan pengguna atau izin sistem.

Harga jual, diskon, dan margin bukan data publik. Jika ditambahkan kelak, aksesnya harus dibatasi. Data katalog dapat ditelusuri melalui pencarian dan filter serta dipakai konsisten pada peluang/kegiatan/unit demo.

### FR-11. Tim dan role

Tampilkan anggota aktif/nonaktif, jabatan, role, wilayah bila diisi, dan beban kegiatan pada periode terpilih. Admin dapat memperbarui profil dan role melalui jalur yang dilindungi; perubahan role dan penonaktifan diaudit. Tidak ada password awal yang disebarkan di dalam source code.

Penonaktifan tidak menghapus riwayat pekerjaan. Penugasan baru kepada anggota nonaktif ditolak. Pengalihan tanggung jawab pekerjaan terbuka dapat dilakukan oleh director/admin. Daftar anggota untuk penugasan tidak membuka informasi autentikasi sensitif.

### FR-12. Laporan dan ekspor

Laporan v1 mencakup kegiatan per jenis/status/anggota/produk/periode, tingkat penyelesaian, follow-up overdue, distribusi pipeline, nilai pipeline tertimbang, dan kegiatan per pelanggan. Ekspor CSV mengikuti filter aktif dan izin pengguna.

CSV memakai header yang jelas, tanggal yang konsisten, encoding UTF-8, escaping delimiter/newline/quote, dan perlindungan formula spreadsheet pada nilai teks yang diawali `=`, `+`, `-`, atau `@`. Data yang tidak berhak dibaca pengguna tidak ikut diekspor.

### FR-13. Pengaturan dan audit

Pengaturan meliputi identitas organisasi, zona waktu tampilan, serta profil pengguna. Pengaturan integrasi menampilkan status tersambung/gagal secara jujur tanpa memperlihatkan secret. Perubahan penting (role, approval, pembatalan, perubahan tahap peluang, penjadwalan, dan penghapusan/arsip) menyimpan pelaku, waktu, entitas, aksi, dan perubahan yang relevan.

Audit bersifat append-only bagi pengguna aplikasi. Log tidak merekam password, token, atau secret. Kegagalan integrasi tidak diam-diam menyimpan data produksi hanya di browser.

### FR-14. Bahasa Indonesia / English

Antarmuka menyediakan pemilih `id` dan `en` pada layar login dan ruang kerja. **Default kunjungan pertama adalah English.** Preferensi tersimpan dalam localStorage browser pada key `ttm.crm.language.v1` dan dipulihkan setelah reload; nilai `id` yang dipilih pengguna tetap menggunakan Indonesia, sedangkan nilai kosong/tidak valid atau storage yang tidak dapat dibaca memakai default `en`. Reset/clear preferensi antar-tab kembali ke English. Document language dan server snapshot awal memakai `en`. Jika penyimpanan tidak tersedia, pilihan pada sesi berjalan tetap berfungsi. Preferensi bahasa bukan data role, bukan sesi autentikasi, dan tidak memengaruhi izin akses.

Label navigasi, field, opsi enum, status, dialog, tooltip/aria-label, pesan validasi yang dikenali, ringkasan dashboard, dan header/filter ekspor CSV mengikuti bahasa. Interpolasi nama/jumlah mempertahankan nilai aslinya. Locale `id-ID` atau `en-GB` digunakan untuk tanggal, angka, dan singkatan nilai besar; timezone tetap WIB/Asia-Jakarta, mata uang tetap IDR, enum tetap, dan timestamp/date tersimpan tetap ISO/UTC sesuai kontrak data.

Nama orang, pelanggan, produk/brand/model, judul kegiatan/peluang, catatan, laporan, deskripsi, serta spesifikasi/kategori dari data pengguna tidak diterjemahkan otomatis. Label tampilan pilihan referensi UUID harus mempertahankan nama sumber walaupun namanya kebetulan sama dengan key terjemahan. Konten pengguna pada CSV tetap sama; hanya struktur dan label laporan yang bilingual. Preferensi antarorigin (Sites dan Hostinger) berdiri sendiri karena localStorage mengikuti origin.

### FR-15. Product Knowledge Base

**Status implementasi terkini:** frontend selesai, backend telah **DEPLOYED**, dan **39/39 pemeriksaan API hosted Knowledge Base lulus**. Proyek target kini mempunyai **4 migrasi, 12 tabel ber-RLS, dan 2 bucket privat**. Migrasi keempat `20261111071649_product_knowledge_library.sql` menambahkan `knowledge_documents` dan bucket `product-knowledge` (25 MiB), terpisah dari `activity-evidence` (10 MiB). Pembaruan frontend ke Hostinger **masih pending** sampai jejak source/CI/artifact/provider dan smoke test origin final tersedia. Status tersebut tidak mengubah bukti historis Hostinger sebelumnya.

Knowledge Base menyimpan materi pendukung PS/AS dengan **produk opsional**; materi umum/lintas produk memakai `product_id = null`. Metadata mencakup judul, jenis, deskripsi, versi, bahasa materi, tag, penulis, waktu, nama/path/MIME/ukuran file, dan status `active`/`archived`. Jenis materi: `datasheet`, `brochure`, `presentation`, `user_manual`, `training`, `other`. Bahasa: `en`, `id`, `multilingual`. Record baru mengisi versi `1.0` dan bahasa English yang dapat diubah sesuai isi materi. Ini label metadata, bukan sistem penggabungan atau riwayat revisi otomatis.

Pengguna mencari **judul, tag, atau nama file** dan memfilter produk, jenis, bahasa, serta status. Menu Knowledge Base membuka seluruh pustaka; tombol **View product materials** pada detail katalog membuka `#knowledge?product=<UUID>` dan memfilter produk terkait. Daftar/detail menampilkan informasi materi, konteks produk, versi, bahasa, penulis, ukuran dan pembaruan. Bahasa UI maupun metadata bahasa tidak menerjemahkan isi file, nama produk, judul, atau catatan pengguna.

Anggota aktif termasuk viewer dapat membaca/mengunduh materi yang diizinkan. Viewer tidak dapat menulis. Anggota dengan hak tulis mengunggah sebagai penulis sendiri; **penulis asli atau director/admin** dapat mengedit metadata, mengarsipkan, dan memulihkan. Author serta relasi objek dikontrol backend. Arsip tidak menghapus file, metadata, atau audit. File asli immutable: penggantian file menggunakan **record baru** dengan label versi yang sesuai, bukan upsert ke objek lama.

Batas upload **25 MiB per file (26.214.400 byte)** ditegakkan frontend dan backend. Allowlist terdiri dari **10 ekstensi / 9 MIME kanonik**: PDF (`.pdf`), PPT (`.ppt`), PPTX (`.pptx`), DOC (`.doc`), DOCX (`.docx`), XLS (`.xls`), XLSX (`.xlsx`), PNG (`.png`), JPEG (`.jpg`/`.jpeg`). File kosong, ukuran berlebih, MIME/metadata yang tidak sesuai, serta path yang tidak sah ditolak. Objek privat memakai path `<author_uuid>/<document_uuid>/<random_uuid>.<safe_extension>` dan terikat ke record metadata; objek yang direferensikan dilindungi dari penghapusan bersamaan melalui constraint backend.

Unduhan menggunakan signed URL **60 detik** dengan nama file asli; tidak ada bucket publik/URL permanen. Upload object diikuti simpan metadata. Jika metadata gagal, cleanup hanya menghapus objek baru yang telah dipastikan belum direferensikan. Hasil ambigu mempertahankan file dan meminta rekonsiliasi administrator; jangan menghapus file yang mungkin sudah terikat atau memberi konfirmasi palsu.

Pustaka produksi **dimulai kosong**. Katalog tidak menghasilkan file atau penulis fiktif. File produksi tidak masuk repository publik/source archive. Demo memakai metadata localStorage dan file IndexedDB pada origin/perangkat/profil browser yang sama; tidak mengirim file ke Supabase. Reload dan masuk demo kembali mempertahankan unduhan selama storage masih ada; reset demo membersihkan keduanya.

**Bukti saat ini:** 68 tes aplikasi, 109 SQL/RLS lokal, 5 guard environment dan build lulus; hosted Knowledge Base 39/39 lulus dengan fixture dibersihkan dan audit dipertahankan. Browser production preview membuktikan default English/toggle Indonesia, upload demo, reload, unduh berhash identik, pintasan/filter produk serta layout tanpa overflow. Bukti preview ini bukan publikasi frontend Hostinger atau UAT bisnis akun nyata. Panduan pengguna: [KNOWLEDGE-BASE.md](KNOWLEDGE-BASE.md).

## 7. Model data konseptual

| Entitas | Relasi utama dan kontrol |
| --- | --- |
| Profiles/Members | Terhubung Supabase Auth; role dan active status dilindungi |
| Accounts | Satu instansi, pemilik akun; banyak contacts/opportunities/activities |
| Contacts | PIC milik account; data kontak bisnis |
| Products | Katalog; brand/category/model/source_page |
| Knowledge documents (`knowledge_documents`) | Produk terkait, jenis, versi, bahasa, tag, penulis, objek privat maksimum 25 MiB, status arsip |
| Opportunities | Account, product, owner, stage, value, probability, next action |
| Activities | Account/opportunity opsional, products, owner, type, interval, status |
| Activity assignees | Penghubung activity dan member; dasar deteksi konflik personel |
| Demo units | Product, kode unit unik, kondisi dan lokasi |
| Reservations | Activity, personel/unit, interval, status reservasi |
| Activity reports | Laporan hasil dan next action; pelaku dan waktu |
| Tasks | Owner/assignee, due date, status, relasi bisnis |
| Approval history | Keputusan, catatan, approver, timestamp |
| Audit logs | Perubahan penting, append-only |
| Organization settings | Konfigurasi tunggal untuk TTM |

Nama tabel/kolom akhir boleh disesuaikan implementasi selama hubungan, kontrol, dan perilaku PRD terpenuhi. Data sintetis untuk demo harus terpisah jelas dari data produksi.

## 8. Arsitektur dan keamanan

- Frontend web responsif; implementasi dipilih agar dapat dibangun dan dipasang secara reproduktif.
- Supabase menyediakan PostgreSQL, Auth, dan bila diperlukan Storage privat. Browser hanya menerima API URL serta publishable key.
- Row Level Security aktif pada seluruh tabel yang diekspos Data API. Policy memeriksa keanggotaan aktif dan hak akses, bukan sekadar status authenticated.
- Data bisnis utama dapat dibaca tim aktif untuk koordinasi internal; perubahan dibatasi owner/assignee dan director/admin. Viewer tidak dapat menulis. Profil dan role memiliki aturan khusus.
- Kebijakan otorisasi tidak menggunakan `user_metadata` yang dapat diedit pengguna. Role disimpan dalam data yang hanya dapat diubah jalur administrator yang sah.
- Constraint/transaction database menegakkan waktu, nilai, status transition, dan konflik reservasi. Validasi UI membantu pengguna tetapi tidak menggantikan validasi backend.
- Storage, bila digunakan, privat dengan policy berbasis anggota/entitas; bukan bucket publik berisi laporan pelanggan.
- Tidak menyimpan secret dalam repository, bundle frontend, output log, maupun file contoh environment.
- Parameter query, escaping output, batas panjang input, dan validasi diperlukan. Hindari HTML mentah dari catatan pengguna.
- Versi dependency dan lockfile dicatat. Build dan pengujian wajib dijalankan sebelum status siap deploy.

## 9. Kebutuhan nonfungsional

| Area | Kriteria v1 |
| --- | --- |
| Keandalan | Simpan data menampilkan hasil sukses/gagal; kegagalan tidak menghilangkan input atau memberi konfirmasi palsu |
| Performa | Daftar memakai pencarian/filter dan pagination/batas hasil; indeks untuk relasi, tanggal, owner, dan status |
| Waktu | Timestamp UTC dengan tampilan Asia/Jakarta; interval dan pergantian tanggal diuji |
| Responsivitas | Alur utama dapat digunakan pada lebar desktop 1440 px dan ponsel 390 px |
| Aksesibilitas | Label input, fokus keyboard, teks status, dan target klik memadai |
| Observabilitas | Error aplikasi dan layanan dapat ditelusuri tanpa secret; panduan troubleshooting tersedia |
| Pemeliharaan | README, environment example, migrasi, seed katalog, daftar uji, dan runbook deployment tersedia |
| Pemulihan | Kebijakan backup Supabase diverifikasi; prosedur rollback aplikasi serta migrasi dijelaskan sebelum go-live |

Target kecepatan dan volume pengguna perlu ditetapkan setelah jumlah anggota serta volume riil diketahui. Jangan menyatakan SLA uptime atau hasil load test yang belum diukur.

## 10. Acceptance criteria dan skenario uji

| ID | Skenario | Hasil yang harus terbukti |
| --- | --- | --- |
| AC-01 | Pengguna tanpa sesi membuka URL bisnis/API | Data bisnis tidak terbaca; UI meminta login |
| AC-02 | User authenticated tanpa anggota aktif | Tidak mendapat akses organisasi |
| AC-03 | Viewer mencoba insert/update/delete melalui API langsung | Ditolak backend |
| AC-04 | Specialist mencoba mengubah role sendiri | Ditolak; privilege tetap |
| AC-05 | Buat instansi, dua PIC, peluang, lalu kegiatan | Relasi tersimpan dan muncul pada detail terkait |
| AC-06 | Input peluang negatif/probabilitas di luar rentang | Ditolak dengan pesan yang jelas |
| AC-07 | Pindahkan peluang ke Won/Lost | Tahap tersimpan dan metrik pipeline berubah benar; Lost membutuhkan alasan |
| AC-08 | Simpan aktivitas dengan selesai sebelum mulai | Ditolak frontend dan database |
| AC-09 | Dua request bersamaan membooking unit/personel sama | Hanya satu reservasi konflik diterima; tidak ada double booking |
| AC-10 | Kegiatan kedua mulai tepat saat pertama selesai | Diterima sesuai interval setengah terbuka |
| AC-11 | Specialist menyetujui kegiatan sendiri tanpa hak approver | Ditolak backend |
| AC-12 | Jadwal kegiatan approved diubah | Kembali perlu validasi/persetujuan; riwayat tersimpan |
| AC-13 | Selesaikan kegiatan tanpa laporan minimum | Ditolak; laporan valid memungkinkan Completed |
| AC-14 | Batalkan kegiatan berreservasi | Alasan tercatat dan slot dilepas |
| AC-15 | Tugas melewati tenggat kemudian diselesaikan | Overdue muncul lalu hilang dari pekerjaan terbuka |
| AC-16 | Filter dashboard/laporan berubah | Angka dan ekspor sesuai data serta filter yang sama |
| AC-17 | Ekspor teks berisi koma, kutip, newline, formula | CSV dapat dibaca dan tidak mengeksekusi formula teks |
| AC-18 | Nama model katalog dibuka | Fakta dan halaman sumber sesuai lampiran; tidak ada spesifikasi karangan |
| AC-19 | Simpan data, reload, login dari sesi lain | Data produksi tetap ada dalam Supabase dan sesuai hak akses |
| AC-20 | Backend gagal atau environment belum diatur | Pesan koneksi jelas; tidak ada klaim sukses/persistensi produksi palsu |
| AC-21 | Uji UI desktop dan ponsel | Navigasi, form, modal, tabel/agenda dapat digunakan tanpa kontrol terpotong |
| AC-22 | Build, migrasi, dan deployment dari checkout bersih | Prosedur dapat diulang; versi/source state diketahui |
| AC-23 | Browser baru/tanpa preferensi valid membuka login/ruang kerja | Default English; pemilih dapat beralih ke Indonesia tanpa logout; pilihan `id` tersimpan tetap dihormati |
| AC-24 | Reload dan tab lain pada origin sama | Preferensi bahasa dipulihkan dan sinkron tanpa memengaruhi sesi/role |
| AC-25 | Nama referensi UUID sama dengan teks kamus; catatan/brand dibuka | Data pengguna tetap persis; hanya label antarmuka diterjemahkan |
| AC-26 | Format English untuk waktu, nilai pipeline, dan CSV | Locale berubah; WIB, IDR, jumlah, timestamp, enum dan konten pengguna tetap |
| AC-27 | Build Hostinger dengan target salah atau secret pada variabel VITE | Build ditolak sebelum bundle dibuat; pesan tidak mencetak secret |
| AC-28 | Preferensi tidak valid/storage tidak tersedia/reset antar-tab | Default English dipakai; document language `en`; pilihan Indonesia tetap berfungsi selama sesi dan dapat dipulihkan bila storage tersedia |
| AC-29 | Unggah materi valid dan pilih produk, jenis, versi, bahasa, tag | Metadata dan objek privat terhubung, daftar/detail/pencarian menampilkan record yang sama setelah reload |
| AC-30 | Uji file kosong, melebihi 25 MiB, tipe/path tidak sah | Ditolak frontend/backend; kegagalan metadata tidak diklaim sukses |
| AC-31 | Viewer/nonanggota mengunggah, pengguna lain mengubah/arsip, author memalsukan penulis | Operasi tidak sah ditolak melalui API langsung; author asli dan director/admin mengikuti izin yang tepat |
| AC-32 | Unduh materi privat lalu arsip oleh author/admin | Akses terotorisasi berhasil, anonim ditolak, URL 60 detik, arsip mempertahankan file/metadata/audit dan dapat dipulihkan |
| AC-33 | Detail katalog → View product materials | Hash/pintasan membuka Knowledge Base dengan filter UUID produk yang benar; menu utama membuka seluruh pustaka |
| AC-34 | Upload demo → reload → masuk demo kembali → download | Byte/hash file sama, metadata tetap terkait; tidak ada upload Supabase dari mode demo |
| AC-35 | Edit metadata lalu unggah revisi file | File lama tidak ditimpa; revisi memakai record baru dengan versi yang dipilih |
| AC-36 | Pustaka produksi baru dibuka | Daftar kosong yang jujur; tidak ada dokumen, penulis, atau file produksi fiktif |

Pengujian minimal mencakup unit business rules (waktu/KPI/CSV), integration/RLS untuk role dan perubahan status, konflik konkurensi, serta smoke test browser untuk login dan satu alur pelanggan → peluang → kegiatan → laporan → follow-up. Hasil uji harus dicatat sebagai lulus/gagal/belum diuji, bukan hanya daftar rencana.

## 11. Rencana implementasi dan release

1. **Baseline kebutuhan:** PRD, inventaris katalog, arsitektur, dan aturan role/status.
2. **Fondasi aplikasi:** desain TTM, navigasi responsif, kontrak data, autentikasi, database/RLS, dan migrasi.
3. **Operasional inti:** CRM, pipeline, jadwal, approval, unit demo, laporan kegiatan, serta tugas.
4. **Visibilitas dan administrasi:** dashboard, laporan CSV, tim, pengaturan, audit, dan dokumentasi.
5. **Validasi:** build, uji business rules, database/RLS, konkurensi booking, pemeriksaan UI dan alur end-to-end.
6. **Deployment:** konfigurasi environment, jalankan migrasi pada target yang telah diperiksa, pasang build, konfigurasi URL auth, dan lakukan smoke test.
7. **Pilot dan go-live:** buat administrator pertama, undang anggota nyata, review master katalog, masukkan data operasional, konfirmasi backup, lakukan UAT dan onboarding, lalu nyatakan status go-live berdasarkan bukti.

Knowledge Base privat kini menjadi tambahan scope yang sedang dibangun, bukan sekadar roadmap. Roadmap berikutnya: approval bertingkat dan budget, reminder email/WhatsApp, kalender eksternal, territory/target tim, evaluasi kompetensi training, forecasting lanjutan, serta integrasi ERP. Prioritas ditentukan menggunakan temuan pilot.

## 12. Definisi siap deploy dan go-live

**Siap deploy** berarti source lengkap, build dan uji yang relevan lulus, environment example tersedia, migrasi/seed dan runbook tersedia, serta blocker yang tersisa dinyatakan. **Sudah deploy** membutuhkan respons hosting sukses dengan URL dan versi/source yang dapat dilacak. **Go-live operasional** memerlukan koneksi backend nyata, akun admin dan pengguna sah, konfigurasi auth, UAT alur inti, serta verifikasi persistensi dan kontrol akses pada lingkungan target.

Situs demo atau antarmuka dengan local storage bukan bukti bahwa backend yang diminta telah terhubung. Menyimpan kode lokal bukan bukti bahwa repository GitHub telah diperbarui. Publikasi frontend tanpa pengujian backend tidak boleh disebut go-live CRM lengkap.

### Kondisi akses saat peninjauan awal

- Repository GitHub ditemukan dalam keadaan kosong; koneksi yang tersedia mengembalikan `pull: true`, `push: false`.
- Kedua koneksi Supabase yang tersedia menolak akses ke proyek target.
- Katalog lokal dapat dibaca untuk pekerjaan kebutuhan dan inventaris produk.

Catatan di atas adalah riwayat awal, bukan status akses terbaru. Akses kemudian diperbaiki: source berada pada GitHub `main`, backend target telah diterapkan, CRM menjalani 23 pemeriksaan API hosted pada release sebelumnya, dan director mengonfirmasi login pilot. Pembaruan Knowledge Base menambahkan migrasi keempat serta 39 pemeriksaan hosted yang lulus; frontend Hostinger pembaruan masih mengikuti gerbang release terpisah. Status terkini beserta batas pengujian berada pada `RELEASE.md` dan `HOSTED-UAT.md`. Jangan menyalin secret melalui chat/repository; gunakan koneksi aplikasi atau environment penyedia yang aman.

### Kontrak deployment Hostinger

Target yang diminta adalah `https://cyan-oryx-350189.hostingersite.com`. Inspeksi hPanel menunjukkan website **PHP/HTML** yang memiliki Git deployment ke `public_html`, tanpa kolom build command. Karena itu build React/Vite berjalan di GitHub Actions dari source branch `main`: Node `24.x`, install `npm ci`, build `npm run build:hostinger`, output `dist`. Workflow memublikasikan hanya isi `dist` ke branch artifact `hostinger`; hPanel mengambil branch tersebut ke `public_html`. Website/domain yang sudah ada dipertahankan, tanpa migrasi ke jenis website baru.

Script build memvalidasi URL proyek Supabase yang diizinkan dan publishable key serta menolak secret administratif dalam variabel browser. Hanya public build variables yang tersedia bagi bundle. Source React tetap pada `main`, sedangkan branch `hostinger` hanya berisi artifact static; source backend, `.env`, `node_modules`, serta credential server tidak ikut ke web root.

Release Hostinger sebelumnya telah live dan mempunyai bukti provider/HTTPS sendiri. **Pembaruan frontend default English + Knowledge Base ini masih pending** sampai provider melaporkan sukses dari commit release pembaruan yang diketahui, metadata cocok, dan smoke test origin final lulus. Bukti preview/lokal serta deployment backend tidak otomatis membuktikan pembaruan frontend sudah tersedia. Detail operasional terdapat pada `HOSTINGER.md` dan status terkini pada `RELEASE.md`.

## 13. Data dan keputusan yang diperlukan saat onboarding

| Input/keputusan | Penggunaan | Default sementara |
| --- | --- | --- |
| Email director/admin pertama | Bootstrap akses sah | Tidak dibuat-buat |
| Daftar anggota, role, wilayah | Undangan dan penugasan | Kosong sampai data nyata tersedia |
| Daftar unit demo dan status | Reservasi aset | Kosong; tidak mengasumsikan stok dari katalog |
| Validasi katalog dan brand | Master produk produksi | Ditelusuri ke lampiran, ditandai perlu review |
| Target KPI dan periode | Evaluasi produktivitas | Metrik faktual; target usulan pada PRD |
| Hosting/domain yang diizinkan | URL aplikasi dan redirect Auth | Deployment terkelola sesuai kemampuan platform |
| Kebijakan backup dan retensi | Operasional data | Diverifikasi pada proyek target |

Keputusan default menjaga pekerjaan berjalan, tetapi tidak menggantikan validasi data nyata dan bukti akses yang diperlukan untuk go-live.

## 14. Inventaris awal dari pembacaan katalog

Katalog berisi 32 halaman raster tanpa lapisan teks. Inventaris hasil pembacaan visual berisi 87 model/family/varian dalam 15 kategori. Jumlah ini **bukan jumlah SKU final**: paket probe USG dan seluruh part number syringe belum diekspansi menjadi master SKU. Halaman sumber menggunakan nomor PDF satu-based; nomor tercetak katalog umumnya satu halaman lebih kecil.

- Ultrasonografi: keluarga TechnoMed/Pixonic Revo (Z, X, Q, NC, P1, C), Pixonic LZ1, dan Pixonic Spade Pro.
- Kertas USG dan media film DryTech/thermal.
- Consumable cardiovascular/peripheral intervention dan angiography.
- Syringe serta injector CT/MRI/DSA.
- Monitor medis EIZO.
- Nuclear medicine Spectrum Dynamics Medical, termasuk D-SPECT dan VERITON-CT.
- Patient monitor TechnoMed Qapha dan ECG Spark.
- Apron/proteksi radiasi.
- Medinux CryoThin surgical system.
- CT TechnoMed Claritom dan MRI TechnoMed Magnevue.

| Kelompok katalog | Halaman PDF |
| --- | --- |
| USG | 4, 6, 8, 10, 12, 13, 14 |
| Consumable USG | 15 |
| Cardiovascular & Peripheral Intervention | 16–17 |
| Consumable Angiography | 18–19 |
| Syringe CT/MRI/DSA | 20 |
| Injector | 21 |
| Medical Monitor | 22 |
| Nuclear Medicine | 23 |
| Patient Monitor | 24 |
| Electrocardiograph | 25 |
| Proteksi Radiasi | 26 |
| Cryosurgery | 27 |
| CT Scan | 28 |
| MRI | 29 |
| Dry Imager & Film | 30–31 |

Contoh nama yang telah dikoreksi berdasarkan pembacaan halaman penuh: **Pixonic LZ1**, **Qapha TM80/TM70**, dan **Tri-Wedge PTA Scoring Balloon Dilatation Catheter** dengan brand Brosmed. Normalisasi brand utama menggunakan TechnoMed. Inventaris ini tetap membutuhkan review Product Director sebelum diperlakukan sebagai master komersial lengkap.

Logo asli tersedia sebagai hasil crop katalog. Sampling logo dan heading menghasilkan biru `#174B8A` serta abu `#6B6C6C`; gunakan biru tersebut sebagai primary UI. Kode ini tetap dibedakan dari pedoman merek resmi yang belum disediakan. Referensi kantor cabang tidak otomatis membuat wilayah/anggota aplikasi tanpa data onboarding yang valid.

### Catatan kontrak implementasi

Relasi peserta dan unit pada kegiatan dapat disimpan sebagai `participant_ids` dan `equipment_ids` selama integritas, otorisasi, audit, dan validasi bentrok tetap ditegakkan. Laporan dapat tertanam pada record kegiatan, bukan tabel terpisah. Enum pipeline implementasi: `lead`, `qualified`, `demo`, `proposal`, `negotiation`, `won`, `lost`; enum status kegiatan: `draft`, `submitted`, `approved`, `in_progress`, `completed`, `rejected`, `cancelled`.
