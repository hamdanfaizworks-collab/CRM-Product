# Product Promotion Analytics — Guide / Panduan

Product Analytics helps the Product Director see which catalogue products have recorded promotion, compare activity levels, and identify gaps to plan next. It describes CRM records rather than employee performance or product demand. The interface defaults to **English**; a saved Indonesian preference remains valid. Changing language preserves product names, brands, categories, notes, dates stored, and business values.

Analisis Produk membantu Product Director melihat promosi yang tercatat, membandingkan periode, dan menentukan produk yang perlu direncanakan. Metrik ini menggambarkan pencatatan CRM, bukan nilai kinerja anggota atau bukti permintaan pasar. English adalah default; pilihan Indonesia tersimpan tetap dihormati.

## Open and filter / Membuka dan memfilter

Open **Reports → Product Analytics** (**Laporan → Analisis Produk**), or select **Open Product Analytics** from the Dashboard's **Products Needing Attention** card. The initial analysis covers the last **90 inclusive WIB calendar days**, ending today. Quick choices provide 30, 90, 180, or 365 days; a custom range must end on or before today.

Buka **Laporan → Analisis Produk**, atau gunakan tombol pada kartu **Produk Perlu Perhatian** di Dashboard. Rentang awal adalah **90 hari kalender WIB termasuk hari ini**. Tanggal akhir mendatang dan rentang tidak valid menampilkan error, tanpa hasil atau ekspor yang menyesatkan.

| Control / Kontrol | Meaning / Arti |
| --- | --- |
| Team member / Anggota tim | All team by default. A selected member includes activities they own **or participate in**, opportunities they own, and tasks assigned to them. / Default seluruh tim; kegiatan mencakup pemilik atau peserta, opportunity berdasarkan pemilik, dan tugas berdasarkan penerima. |
| Category, brand, search / Kategori, brand, pencarian | Catalogue scope for cards, chart, planning priorities, and table. Search uses product name, brand, and category; raw catalogue values are preserved. / Mengubah cakupan katalog untuk ringkasan dan tabel, tanpa menerjemahkan data master. |
| Catalogue scope / Cakupan katalog | Active products by default; optionally include inactive products. Zero-activity products stay included. / Default produk aktif, dapat memasukkan nonaktif; produk nol kegiatan tetap dihitung. |
| Planning target / Target rencana | Default **2 completed promotional activities per product per selected period**, adjustable to a whole number of at least 1. It does not scale automatically with period length. / Default 2 kegiatan selesai per produk dalam periode terpilih, tidak otomatis diprorata. |
| Inactivity threshold / Ambang jeda | Default **90 calendar days**, adjustable to a whole number of at least 1. A known last promotion at or beyond the threshold is flagged. Missing history is shown separately. / Jeda minimal 90 hari ditandai; riwayat kosong bukan angka jeda tanpa batas. |
| Attention and sorting / Perhatian dan urutan | Affect **only the table and CSV**. They do not shrink the card/chart catalogue denominator. / Hanya mengubah tabel dan CSV, bukan denominator ringkasan katalog. |

The table defaults to least frequently promoted. It also supports most frequently promoted, most/fewest **presentations**, longest promotion gap, and product name. Use **No presentations this period** to find products with zero completed presentations, including products promoted through another qualifying type. Other attention filters show no activities this period, below planning target, long promotion gap, or no recorded history.

Tabel dapat diurutkan berdasarkan frekuensi promosi dan **presentasi terbanyak/paling sedikit**. Filter **Tanpa presentasi pada periode** memakai jumlah presentasi selesai nol, sehingga produk yang hanya didemo tetap dapat muncul. Filter perhatian dan urutan yang dipakai ikut dicatat dalam CSV.

## What counts / Dasar perhitungan

| Metric / Metrik | Implemented rule / Aturan |
| --- | --- |
| Completed promotion / Promosi selesai | Exactly six activity types: **presentation, demo, exhibition, training, refreshment, visit**. Status must be `completed`, valid scheduled start/end must be in the past or at the snapshot time, and end must be after start. Internal/other types and unfinished/draft/rejected/cancelled activities are excluded. / Hanya enam jenis tersebut, berstatus selesai dengan interval jadwal valid yang telah berakhir. |
| Product association / Relasi produk | Uses the activity's explicit `product_id`. No inference from title, notes, category, or a linked opportunity. / Memakai relasi produk pada kegiatan, bukan perkiraan dari judul atau opportunity. |
| Period and comparison / Periode dan pembanding | The scheduled **start date in WIB** selects the inclusive period. The comparison is the immediately preceding period of the **same number of calendar days**. / Tanggal mulai WIB menentukan periode; pembanding langsung sebelumnya dengan panjang sama. |
| Catalogue coverage / Cakupan katalog | Products with at least one qualifying completed activity ÷ all catalogue products in scope, including zeros. / Produk dengan minimal satu kegiatan selesai dibagi seluruh produk dalam cakupan, termasuk nol. |
| Trend / Tren | Current minus previous count; percentage uses previous as denominator. When previous is zero, percentage is blank rather than infinite. “Newly recorded activity” means a nonzero current count after a zero comparison, not a new product launch. / Selisih dan persentase berdasarkan pembanding; pembanding nol tidak menghasilkan persentase tak hingga. |
| Available history / Riwayat tersedia | All qualifying past completed records in the selected member scope, independent of the selected period. “No recorded history” is not proof that a product was never promoted outside the loaded CRM records. / Seluruh riwayat selesai dalam cakupan anggota; tidak menyimpulkan promosi di luar CRM. |
| Latest promotion and gap / Promosi terakhir dan jeda | Latest **scheduled end** among qualifying completed promotions, not the time when status changed to Completed. Gap is WIB calendar days from that scheduled end to today. / Memakai akhir jadwal terbaru, bukan timestamp perubahan status. |
| Unique accounts / Pelanggan unik | Distinct nonempty account links on qualifying completed activities in the selected period/member scope. / Relasi pelanggan unik pada kegiatan selesai periode dan anggota terpilih. |

The top-five chart compares current and previous completed counts. Its candidates have at least one count in either period. Products with no counts in both periods remain in the table and planning coverage, even though they do not produce a chart bar.

Grafik lima produk teratas membandingkan jumlah selesai saat ini dan pembanding. Produk nol di kedua periode tetap tersedia pada tabel, ringkasan cakupan, dan prioritas perencanaan.

## Current snapshots / Kondisi saat ini

The following columns are **not historical totals for the selected analysis range**. Changing that range does not move their snapshot into the past:

Kolom berikut memakai **kondisi saat ini**, terpisah dari periode analisis:

- **30-day plans:** qualifying promotional activities in `submitted` or `approved`, with starts strictly after now and at or before now + **30 rolling days**. An old submitted activity whose start has passed is not a future plan. The nearest future start appears in details. / Pengajuan atau disetujui yang mulai setelah sekarang sampai 30 hari ke depan, bukan bulan kalender berikutnya.
- **In progress:** qualifying promotional activities in `in_progress` whose start has arrived, including overdue scheduled ends. / Kegiatan berlangsung yang sudah mulai, termasuk yang jadwal akhirnya terlewati.
- **Active pipeline:** opportunities in `lead`, `qualified`, `demo`, `proposal`, or `negotiation`, with count, estimated value, and probability-weighted value. Expected close dates do not limit this snapshot. Values are not revenue or proof of promotion conversion. / Opportunity aktif tanpa pembatas tanggal penutupan; nilai estimasi bukan pendapatan.
- **Open tasks:** `todo` or `in_progress` tasks linked through an activity or opportunity product. The same task counts once per product even if both links reach that product. Tasks overdue before today in WIB are shown separately. Tasks have the selected assignee filter. / Tugas terbuka dari relasi kegiatan/opportunity, tanpa duplikasi pada produk yang sama; terlambat berdasarkan tenggat sebelum hari ini WIB.

The analysis refreshes its reference clock while open. Cards explicitly distinguish completed counts from future plans and current work. It calculates from business data already loaded under the existing access rules; there is **no database schema change or additional analytics table**.

Jam acuan diperbarui ketika halaman terbuka. Analitik memakai data yang sudah dimuat sesuai akses aplikasi, tanpa perubahan skema database atau tabel analitik baru.

## Planning and interpretation / Perencanaan dan interpretasi

**Below target** means completed count is less than the selected planning target, including zero-history and new catalogue entries. It is a planning guide, not an employee score. A **New catalogue entry** badge uses the record's creation date during or after the selected period; it is not a product launch date. Products can have future plans and still be below the completed-activity target.

**Di bawah target** berarti jumlah selesai lebih kecil daripada target panduan, termasuk produk baru dan tanpa riwayat. Badge **Baru dalam katalog** berasal dari tanggal pembuatan record, bukan peluncuran produk. Keduanya tidak digunakan untuk menilai kinerja anggota secara otomatis.

Open a product's **Details** for the six-type breakdown, comparison, available history, current plans, pipeline, and tasks. **Plan activity** opens Calendar & Activities with that product prefilled in a **new draft**. Opening this draft **never saves automatically**; a user must complete and save the activity using the normal validation and approval flow. The action is disabled for viewers and inactive products. No approval is bypassed by opening from analytics.

Buka **Detail → Rencanakan kegiatan** untuk membuka draft baru dengan produk terisi. Membuka draft **tidak otomatis menyimpan**. Pengguna tetap melengkapi form dan menyimpan melalui aturan normal; viewer dan produk nonaktif tidak dapat memakai aksi ini.

The Dashboard card always uses **all team members, active products, the last 90 inclusive WIB calendar days, and a two-activity guide**. It is independent of the Dashboard's monthly operational filters and of filters previously selected in Reports. Selecting its button opens Product Analytics with its default scope; compare scopes before reconciling totals.

Kartu Dashboard selalu memakai **seluruh tim, produk aktif, 90 hari kalender WIB terakhir, dan ambang dua kegiatan**. Filter bulanan operasional tidak mengubah kartu ini. Tombolnya membuka analisis dengan cakupan awal, bukan meneruskan filter bulanan.

## Export and record quality / Ekspor dan kualitas pencatatan

**Export CSV** exports the current **filtered and sorted table rows, including zeros**. Metadata includes selected/current comparison dates, snapshot time, member and catalogue scope, search, attention/sort, target, inactivity threshold, and calculation notes. Headers follow the selected language; raw product/brand/category names stay unchanged. CSV quoting and formula-text protection use the existing export helper. Export is unavailable for an invalid range or no table rows.

CSV memuat **baris tabel sesuai filter dan urutan, termasuk nol**, beserta periode/pembanding, jam snapshot, cakupan, target, ambang, dan metode. Header mengikuti bahasa UI, data master tetap asli; pengamanan formula teks CSV tetap berlaku.

Expand **Calculation methods and record quality** to see qualifying current-period completed and future-plan records with missing/unknown product links, invalid schedules, and inactive products excluded. These diagnostics are computed before category, brand, and search filters, so they are labelled separately from filtered catalogue totals. They do not allocate unattributed records to products by guesswork.

Buka **Metode perhitungan dan kualitas pencatatan** untuk melihat kegiatan tanpa produk/produk tidak dikenal, jadwal tidak valid, dan produk nonaktif yang dikecualikan. Diagnostik memakai cakupan anggota dan periode sebelum filter kategori/brand/pencarian. Perbaiki relasi pada data sumber bila diperlukan; modul analitik tidak mengubah data.

## Review examples / Contoh pemeriksaan

| Scenario / Skenario | Expected reading / Pembacaan |
| --- | --- |
| One active product has one presentation; another has no activities. / Satu produk aktif presentasi sekali, satu nol. | Coverage is 1/2 (50%); both remain in the table. / Cakupan 50%, kedua produk tetap tercantum. |
| A product has two completed demos and zero presentations. / Dua demo, tanpa presentasi. | Completed total is 2, presentation count is 0; it matches the no-presentations filter. / Total 2, presentasi 0, muncul di filter tanpa presentasi. |
| A future approved demo is two weeks away, outside a past custom range. / Demo disetujui dua minggu lagi, di luar periode historis. | It appears in the current 30-day plan snapshot, not actual or past comparison counts. / Masuk rencana 30 hari, bukan realisasi atau pembanding. |
| A completed promotion starts before midnight WIB and ends the next day. / Kegiatan melintasi tengah malam WIB. | Its start date chooses the analysis period; its end contributes to latest-promotion gap. / Periode memakai mulai, jeda memakai akhir. |
| A new catalogue entry has zero history. / Entri katalog baru tanpa riwayat. | It remains in coverage/target planning with a new-entry badge; no employee-performance conclusion is implied. / Tetap dihitung dengan konteks baru, tanpa kesimpulan kinerja. |

See [PRD](PRD.md) for the requirement and acceptance cases. Release/deployment evidence remains separate from this usage guide.
