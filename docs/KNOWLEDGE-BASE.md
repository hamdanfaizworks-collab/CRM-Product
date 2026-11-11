# Product Knowledge Base — Panduan singkat / Quick guide

Pustaka pengetahuan menyatukan lembar data, brosur, presentasi, panduan pengguna, dan materi training tim TTM. Produksi dimulai dengan pustaka kosong: katalog tidak otomatis membuat file atau penulis dokumen.

The Knowledge Base brings together TTM product datasheets, brochures, presentations, user manuals, and training materials. The production library starts empty; catalog entries do not generate documents or fictitious authors.

## Menemukan materi / Find materials

1. Buka **Knowledge base** untuk seluruh pustaka, atau buka **Product catalog → Detail produk → View product materials** untuk langsung memfilter produk tersebut. / Open **Knowledge base** for the whole library, or use **Product catalog → Product details → View product materials** to filter by that product.
2. Cari berdasarkan **judul, tag, atau nama file**. Gunakan filter produk, jenis dokumen, bahasa dokumen, dan status. Pilih **General / across products** untuk materi tanpa produk tertentu. / Search by **title, tag, or filename**. Filter by product, document type, document language, and status. Use **General / across products** for materials that are not linked to a specific product.
3. Klik judul untuk melihat deskripsi, versi, bahasa, penulis, ukuran, dan tanggal pembaruan. / Select a title to see its description, version, language, author, size, and update date.

## Mengunggah dokumen / Upload a document

Pilih **Upload document**, pilih atau letakkan satu file, lalu lengkapi judul dan jenis dokumen. Produk bersifat opsional. Versi awal diisi **1.0** dan bahasa dokumen **English**; ubah sesuai isi file yang sebenarnya. Tambahkan deskripsi dan tag bila membantu pencarian, lalu pilih **Save document**.

Choose **Upload document**, select or drop one file, and complete the title and document type. A product link is optional. New entries start with version **1.0** and document language **English**; change these to match the actual file. Add a description and useful tags, then choose **Save document**.

Tag dipisahkan dengan koma, maksimum **20 tag**, masing-masing **60 karakter**. Bahasa dokumen dapat berupa English, Indonesian, atau Multilingual. Mengubah bahasa UI atau metadata bahasa dokumen **tidak menerjemahkan isi file, nama produk, judul, atau catatan pengguna**.

Separate tags with commas, up to **20 tags** of **60 characters** each. Document language can be English, Indonesian, or Multilingual. Changing the UI language or document-language metadata **does not translate file contents, product names, titles, or user notes**.

## Format dan ukuran / Formats and size

| Format | Ekstensi / Extensions |
| --- | --- |
| PDF | `.pdf` |
| PowerPoint | `.ppt` |
| PowerPoint Open XML | `.pptx` |
| Word | `.doc` |
| Word Open XML | `.docx` |
| Excel | `.xls` |
| Excel Open XML | `.xlsx` |
| PNG | `.png` |
| JPEG | `.jpg`, `.jpeg` |

Maksimum **25 MiB per file (26.214.400 byte)**. Sepuluh ekstensi tersebut dipetakan ke sembilan jenis MIME kanonik; `.jpg` dan `.jpeg` memakai jenis yang sama. File kosong, format lain, atau ukuran berlebih ditolak. Batas dan kecocokan metadata juga diperiksa backend.

The maximum is **25 MiB per file (26,214,400 bytes)**. These ten extensions map to nine canonical MIME types; `.jpg` and `.jpeg` share one type. Empty files, unsupported formats, and oversized files are rejected. The backend also checks limits and metadata consistency.

## Hak akses dan pembaruan / Access and updates

| Pengguna / User | Kemampuan / Available actions |
| --- | --- |
| Anggota aktif dengan role Viewer / Active viewer | Membaca dan mengunduh materi yang diizinkan; tanpa unggah, edit, atau arsip. / Read and download permitted materials; no upload, editing, or archival. |
| Product/Application Specialist | Mengunggah materi; mengedit metadata, mengarsipkan, dan memulihkan dokumen miliknya. / Upload materials; edit metadata, archive, and restore their own documents. |
| Product Director / Administrator | Mengelola metadata dan arsip seluruh pustaka. / Manage metadata and archival across the library. |

**Edit metadata** memperbarui informasi dokumen dan tidak mengganti file aslinya. Untuk file revisi, unggah **record dokumen baru** dengan label versi yang sesuai; arsipkan versi lama bila sudah tidak dipakai. Label versi bukan sistem penggabungan atau riwayat revisi otomatis.

**Edit metadata** changes document information without replacing the original file. For a revised file, upload a **new document record** with the appropriate version label, then archive an obsolete entry if needed. Version labels do not provide automatic merging or revision history.

**Archive** menyembunyikan dokumen dari daftar aktif, mempertahankan file, metadata, dan audit. Gunakan filter **Archived** lalu **Restore** untuk menampilkannya kembali. Tidak ada penghapusan permanen melalui modul ini.

**Archive** hides a document from the active list while retaining its file, metadata, and audit history. Use the **Archived** filter and **Restore** to return it to the active library. This module does not offer permanent deletion.

## Mengunduh dan menangani kegagalan / Download and resolve errors

Pilih **Download** atau **Download original file**. File produksi disimpan privat; aplikasi membuat signed URL yang berlaku **60 detik**, bukan tautan publik permanen. Jika tautan kedaluwarsa, klik unduh kembali saat masih login.

Choose **Download** or **Download original file**. Production files are private; the application creates a signed URL valid for **60 seconds**, rather than a permanent public link. If it expires, request another download while signed in.

Jika upload berhasil tetapi metadata gagal, aplikasi mencoba membersihkan **hanya file baru yang belum direferensikan**. Bila status simpan tidak dapat dipastikan, file dipertahankan dan pesan meminta rekonsiliasi administrator. Ikuti pesan tersebut sebelum mengunggah ulang agar tidak membuat duplikasi.

If upload succeeds but metadata fails, the application attempts to remove **only the newly uploaded, unreferenced file**. If the save result cannot be confirmed, the file is retained and the message requests administrator reconciliation. Follow that message before retrying to avoid duplicates.

## Sandbox demo

Demo tidak mengirim file ke Supabase. Metadata simulasi tersimpan di localStorage dan file asli di **IndexedDB browser pada origin yang sama**. File tetap dapat diunduh setelah reload dan masuk demo kembali, selama penyimpanan belum dibersihkan. Perangkat, profil browser, atau origin lain tidak memperoleh salinan tersebut. Reset demo membersihkan metadata serta file sandbox.

The demo does not send files to Supabase. Sample metadata is stored in localStorage and original file bytes in **IndexedDB on the same browser origin**. Downloads remain available after reloading and re-entering the demo while that storage is retained. Other devices, browser profiles, or origins do not receive those files. Resetting the demo clears its metadata and sandbox files.

Gunakan materi contoh yang tidak sensitif di demo. Dokumen produksi diunggah hanya setelah login ke workspace aktif oleh anggota yang berwenang; file produksi tidak disimpan dalam repository publik atau arsip source.

Use non-sensitive sample materials in the demo. Authorized members upload production documents only after signing in to the active workspace; production files are not stored in the public repository or source archive.

## Status pembaruan ini / Status of this update

Frontend telah diimplementasikan dan diuji lokal; browser preview membuktikan unggah file demo, reload, lalu unduh dengan hash identik. Backend Knowledge Base telah diterapkan pada Supabase target. **39/39 pemeriksaan API hosted Knowledge Base telah lulus; publikasi pembaruan frontend ke Hostinger masih pending** pada snapshot dokumen ini. Riwayat Hostinger sebelumnya tidak membuktikan fitur baru telah tersedia di origin tersebut. Lihat [release status](RELEASE.md).

The frontend is implemented and locally tested; browser preview verified a demo upload, reload, and download with an identical hash. The Knowledge Base backend is deployed to the target Supabase project. **All 39 hosted Knowledge Base API checks passed; publication of this frontend update to Hostinger is pending** in this document snapshot. Earlier Hostinger deployment evidence does not prove the new feature is available there. See the [release status](RELEASE.md).
