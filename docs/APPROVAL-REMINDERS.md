# Approval, Hierarchy & Agenda Reminders

Revisi / Revision: **12 November 2026 — v1.4**.

## Approval satu tahap / Single-stage approval

1. Director/Admin membuka **Approval Kegiatan / Activity Approval → Hierarki Tim / Team Hierarchy**.
2. Pilih **Atur hubungan tim / Set Reporting Line**, anggota aktif, lalu satu atasan langsung. Tanpa atasan berarti pengajuan dapat ditinjau Product Director.
3. Anggota membuat kegiatan melalui **Kalender & Aktivitas / Calendar & Activities**, melengkapi koordinator, jadwal dan penugasan, lalu mengajukannya.
4. Atasan membuka **Tinjauan saya / My Reviews**, meninjau detail dan memilih Setujui/Tolak. Penolakan wajib beralasan. **Satu keputusan menyelesaikan satu tahap**; tidak ada tahap persetujuan Director berikutnya.
5. Product Director dapat menggantikan atasan untuk pengajuan anggota lain, termasuk ketika atasan telah ditetapkan. Admin hanya dapat meninjau jika ditetapkan sebagai atasan langsung.

The immediate supervisor or Product Director can approve/reject another member's submitted activity. Directors can act as the replacement reviewer even when a supervisor is assigned. Admins configure hierarchy but gain review permission only through a direct-supervisor assignment. No role can review its own activity, and ancestors do not form extra approval stages. A Director's own request requires another Director or an eligible assigned supervisor.

Hierarki menolak diri sendiri, siklus, anggota nonaktif/viewer dan atasan nonaktif/viewer. Director/Admin dapat mengubah atasan; anggota pada baris yang sudah ada tidak dapat diganti. Pilih tampilan tabel untuk mengubah hubungan. Tim lain dapat membaca hierarki.

Decisions use the authenticated review RPC and server timestamps. Two simultaneous decisions cannot both succeed. Rescheduling/reassigning an approved/in-progress activity returns it to submitted and clears the prior approval identity/time. Review history in the module shows the latest retained decision per activity; the append-only audit stores changes.

## Pengingat / Reminders

Ikon lonceng menampilkan agenda yang mulai dalam **24 jam**, jadwal mulai yang sudah lewat, kegiatan berjalan yang mendekati/melewati jam selesai, tugas mendekati/melewati tenggat, serta pengajuan untuk ditinjau. Klik pengingat agenda untuk membuka detail kegiatan. Kalender menampilkan ringkasan agenda yang memerlukan perhatian.

Activity reminders cover the owner, participants, immediate supervisor, and Director/Admin oversight. Task reminders cover the assignee or Director/Admin. Draft, rejected, completed and cancelled activities do not create schedule reminders. In-progress activities use their end time. Tasks become overdue after the end of their due date in **WIB**.

**Pengingat berjalan di dalam aplikasi selama aplikasi terbuka.** Jam dievaluasi setiap 30 detik; data agenda diperbarui setiap 60 detik saat halaman terlihat, dan ketika jendela kembali aktif. Kegagalan sinkronisasi ditampilkan di dialog lonceng. Tombol muat ulang memeriksa semua data terbaru. Tidak ada pengiriman email, WhatsApp, push di latar belakang, atau jaminan notifikasi ketika aplikasi tertutup.

**In-app reminders require the app to remain open.** They are not an email/background notification service. The pilot's SMTP/team-onboarding requirement remains separate.

## Wilayah pelanggan / Customer regions

Form pelanggan memakai pilihan **Provinsi / Province** dan **Kabupaten / kota / Regency / city** yang saling terkait. Mengubah provinsi secara sengaja mengosongkan kota. Data lama tetap disimpan sampai pengguna memilih penggantinya; membuka form atau menerima respons API tidak menulis ulang data pelanggan.

Reference: [Emsifa API v2](https://www.emsifa.com/api-wilayah-indonesia/v2/provinces.json), [official repository](https://github.com/emsifa/api-wilayah-indonesia), 38 provinces / 514 regencies and cities in the bundled reference dated 8 November 2026. Requests include only region codes; no customer names, contact details, credentials or referrer are transmitted. API timeout/network/CORS errors fall back to a bundled selectable reference with a visible notice and retry button. Attribution and upstream license are in `src/data/indonesia-regions.NOTICE.md` and `src/data/indonesia-regions.LICENSE.txt`.

## Bahasa dan label / Language and labels

English remains the default; saved Indonesian preferences are respected. The login headline is **Sistem Terpadu Manajemen Product / Integrated Product Management System**. Public demo entry and the requested marketing copy have been removed; operational access requires a valid invited account and role. Sidebar module names use title case, with **Product Management Workspace** and **Customer Relationship Management** as the brand text.

Edit labels in the GitHub source, then let CI build and Hostinger deploy. Indonesian canonical strings currently live in the relevant `src/*.tsx` files; `src/locales/en.json` maps those strings to English. Changing Indonesian wording requires updating the source key and matching dictionary entry. Never edit hashed JavaScript directly in Hostinger File Manager. User-entered names, notes, documents, enum values, IDs, dates and business records are not translated.

## Deployment verification

Run `npm test`, `npm run test:deploy-env`, `npm run test:db`, and `npm run build:hostinger`. Deploy the additive migration `20261111205526_single_stage_activity_approval.sql` and its whitespace-validation correction `20261112023647_normalize_approval_note_whitespace.sql` to the verified project before the frontend. Push source to `main`; CI verifies it and publishes only compiled assets to `hostinger`. Confirm both CI jobs pass and the live `/release.json` reports that exact source commit. Inspect the production approval/hierarchy forms and region dropdown without creating real business records.

Keep all API credentials, the original catalog PDF, private customer data, and local snapshots out of source archives and GitHub. No SMTP/Auth policy, hosting access, paid plan or bucket privacy change is required for this revision.
