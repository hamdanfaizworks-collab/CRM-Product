import { useMemo, useState } from "react";
import { BarChart3, CalendarPlus, ChevronDown, Download, Info, Target, TrendingUp } from "lucide-react";
import { getLocale, tr, useLanguage } from "./i18n";
import { useCRM } from "./store";
import { Dialog, Empty, PageHead, StatCard } from "./ui";
import { ACTIVITY_LABEL } from "./types";
import { dateOnly, displayDate, displayTime, downloadCSV, money, shortMoney } from "./rules";
import { useReminderClock } from "./reminders";
import { buildProductAnalytics, PROMOTION_TYPES, type ProductAnalyticsError, type ProductAttention, type ProductPromotionRow, type PromotionTrend } from "./product-analytics";
import "./product-analytics.css";

type AttentionFilter = "all" | "no_current" | "no_presentation" | "below_target" | "idle" | "no_history";
type SortKey = "rare" | "most" | "presentations_most" | "presentations_least" | "name" | "idle";
export interface ProductAnalyticsPageProps {
  onPlanActivity?: (productId: string) => void;
  now?: number | string | Date;
}
const DAY = 86_400_000;
function clock(value?: number | string | Date) {
  return value === undefined ? Date.now() : value instanceof Date ? value.getTime() : typeof value === "number" ? value : /T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? Date.parse(value) : NaN;
}
function rangeStart(today: string, days: number) {
  return new Date(Date.parse(today + "T00:00:00Z") - (days - 1) * DAY).toISOString().slice(0, 10);
}
const number = (value: number, digits = 0) => value.toLocaleString(getLocale(), { maximumFractionDigits: digits });
const signed = (value: number) => (value > 0 ? "+" : "") + number(value);
const dateRange = (from: string, to: string) => displayDate(from) + " – " + displayDate(to);
function attentionLabel(value: ProductAttention) {
  const labels: Record<ProductAttention, string> = { new: "Baru dalam katalog", no_record: "Belum ada riwayat tercatat", idle: "Lama tanpa promosi", no_current_activity: "Tanpa kegiatan periode ini", below_target: "Di bawah target rencana", on_target: "Target rencana tercapai" };
  return tr(labels[value]);
}
function trendLabel(value: PromotionTrend) {
  const labels: Record<PromotionTrend, string> = { up: "Meningkat", down: "Menurun", flat: "Tetap", new: "Aktivitas baru tercatat", none: "Nol pada kedua periode" };
  return tr(labels[value]);
}
function errorLabel(value: ProductAnalyticsError) {
  const labels: Record<ProductAnalyticsError, string> = { missing_range: "Pilih tanggal awal dan akhir analisis.", invalid_range: "Rentang tanggal tidak valid. Tanggal awal harus sebelum atau sama dengan tanggal akhir.", future_range: "Tanggal akhir analisis tidak boleh melewati hari ini (WIB).", invalid_now: "Waktu acuan analisis tidak valid. Muat ulang halaman.", invalid_thresholds: "Target kegiatan dan ambang hari harus berupa bilangan bulat minimal 1." };
  return tr(labels[value]);
}
function attentionMatches(row: ProductPromotionRow, filter: AttentionFilter) {
  return filter === "all" || filter === "no_current" && row.flags.noActivity || filter === "no_presentation" && row.countsByType.presentation === 0 || filter === "below_target" && row.flags.belowTarget || filter === "idle" && row.flags.idle || filter === "no_history" && row.flags.noHistory;
}
function otherCount(row: ProductPromotionRow) {
  return row.countsByType.exhibition + row.countsByType.refreshment + row.countsByType.visit;
}
function compareRows(a: ProductPromotionRow, b: ProductPromotionRow, sort: SortKey): number {
  if (sort === "name") return a.product.name.localeCompare(b.product.name, getLocale());
  if (sort === "presentations_most") return b.countsByType.presentation - a.countsByType.presentation || compareRows(a, b, "most");
  if (sort === "presentations_least") return a.countsByType.presentation - b.countsByType.presentation || compareRows(a, b, "rare");
  if (sort === "most") return b.actual - a.actual || b.previous - a.previous || a.product.name.localeCompare(b.product.name, getLocale());
  if (sort === "idle") return Number(b.flags.noHistory) - Number(a.flags.noHistory) || (b.idleDays ?? -1) - (a.idleDays ?? -1) || a.actual - b.actual || a.product.name.localeCompare(b.product.name, getLocale());
  return a.actual - b.actual || Number(b.flags.noHistory) - Number(a.flags.noHistory) || (b.idleDays ?? -1) - (a.idleDays ?? -1) || a.product.name.localeCompare(b.product.name, getLocale());
}
function Trend({ row }: { row: ProductPromotionRow }) {
  return <span className={`pa-trend pa-trend-${row.trend}`} title={trendLabel(row.trend)}>{signed(row.delta)}{row.percentChange !== null && <small>{signed(Math.round(row.percentChange))}%</small>}<span className="pa-sr-only">{trendLabel(row.trend)}</span></span>;
}

export function ProductAnalyticsPage({ onPlanActivity, now }: ProductAnalyticsPageProps) {
  useLanguage();
  const { data, profile } = useCRM();
  const liveNow = useReminderClock();
  const snapshotNow = now === undefined ? liveNow : clock(now);
  const today = dateOnly(new Date(Number.isFinite(snapshotNow) ? snapshotNow : Date.now()));
  const [from, setFrom] = useState(() => rangeStart(today, 90));
  const [to, setTo] = useState(today);
  const [member, setMember] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [target, setTarget] = useState("2");
  const [idleThreshold, setIdleThreshold] = useState("90");
  const [attention, setAttention] = useState<AttentionFilter>("all");
  const [sort, setSort] = useState<SortKey>("rare");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const result = useMemo(() => buildProductAnalytics(data, { from, to, now: snapshotNow, memberId: member || undefined, includeInactive, targetPerPeriod: Number(target), idleDaysThreshold: Number(idleThreshold) }), [data, from, to, snapshotNow, member, includeInactive, target, idleThreshold]);
  const catalog = data.products.filter(product => includeInactive || product.active !== false);
  const categories = [...new Set(catalog.map(product => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, getLocale()));
  const brands = [...new Set(catalog.map(product => product.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, getLocale()));
  const query = search.trim().toLocaleLowerCase(getLocale());
  const baseRows = result.rows.filter(row => (!category || row.product.category === category) && (!brand || row.product.brand === brand) && (!query || [row.product.name, row.product.brand, row.product.category].some(value => value.toLocaleLowerCase(getLocale()).includes(query))));
  const visibleRows = baseRows.filter(row => attentionMatches(row, attention)).sort((a, b) => compareRows(a, b, sort));
  const selected = result.rows.find(row => row.product.id === selectedId);
  const total = (key: "actual" | "previous" | "planned" | "inProgress" | "overdueTasks") => baseRows.reduce((sum, row) => sum + row[key], 0);
  const covered = baseRows.filter(row => row.actual > 0).length;
  const belowTarget = baseRows.filter(row => row.flags.belowTarget).length;
  const presentations = baseRows.reduce((sum, row) => sum + row.countsByType.presentation, 0);
  const demos = baseRows.reduce((sum, row) => sum + row.countsByType.demo, 0);
  const ranking = [...baseRows].filter(row => row.actual > 0 || row.previous > 0).sort((a, b) => compareRows(a, b, "most")).slice(0, 5);
  const chartMax = Math.max(1, ...ranking.flatMap(row => [row.actual, row.previous]));
  const priority = baseRows.filter(row => row.flags.belowTarget).sort((a, b) => compareRows(a, b, "rare")).slice(0, 5);
  const memberName = member ? data.profiles.find(person => person.id === member)?.full_name || member : tr("Seluruh tim");
  const scopedNote = tr("Ringkasan mengikuti filter katalog dan anggota. Filter perhatian dan urutan hanya mengubah tabel serta CSV.");
  const attentionOptions: [AttentionFilter, string][] = [["all", "Semua perhatian"], ["no_current", "Tanpa kegiatan periode ini"], ["no_presentation", "Tanpa presentasi pada periode"], ["below_target", "Di bawah target rencana"], ["idle", "Lama tanpa promosi"], ["no_history", "Belum ada riwayat tercatat"]];
  const sortOptions: [SortKey, string][] = [["rare", "Paling jarang dipromosikan"], ["most", "Paling banyak dipromosikan"], ["presentations_most", "Presentasi terbanyak"], ["presentations_least", "Presentasi paling sedikit"], ["idle", "Jeda promosi terlama"], ["name", "Nama produk A–Z"]];
  function exportRows() {
    if (!result.valid) return;
    const period = result.period;
    const rows: unknown[][] = [
      [tr("Analitik promosi produk")],
      [tr("Periode (WIB)"), period.from, period.to],
      [tr("Periode pembanding (WIB)"), period.previousFrom, period.previousTo],
      [tr("Waktu snapshot (WIB)"), new Date(snapshotNow).toLocaleString(getLocale(), { timeZone: "Asia/Jakarta", hour12: false })],
      [tr("Anggota"), memberName], [tr("Kategori"), category || tr("Semua kategori")], [tr("Brand"), brand || tr("Semua brand")],
      [tr("Cakupan katalog"), tr(includeInactive ? "Aktif dan nonaktif" : "Produk aktif")],
      [tr("Pencarian"), search], [tr("Perhatian"), tr(attentionOptions.find(option => option[0] === attention)![1])],
      [tr("Urutan"), tr(sortOptions.find(option => option[0] === sort)![1])],
      [tr("Target rencana per produk / periode"), Number(target)], [tr("Ambang jeda promosi (hari)"), Number(idleThreshold)],
      [tr("Metode kegiatan selesai"), tr("Hanya presentasi, demo, pameran, training, refreshment, dan kunjungan berstatus selesai dengan jadwal berakhir. Periode memakai tanggal mulai WIB.")],
      [tr("Metode snapshot"), tr("Rencana: pengajuan/disetujui yang mulai dalam 30 hari mendatang. Pipeline aktif dan tugas terbuka merupakan kondisi saat ini, terlepas dari periode analisis.")],
      [tr("Cakupan riwayat"), tr("Riwayat dan jeda memakai seluruh catatan selesai yang tersedia dalam cakupan anggota. Nol bukan bukti produk tidak pernah dipromosikan di luar CRM.")],
      [tr("Kegiatan selesai tanpa produk / produk tak dikenal"), result.coverage.unlinkedCompleted, result.coverage.unknownProductCompleted],
      [tr("Rencana tanpa produk / produk tak dikenal"), result.coverage.unlinkedPlanned, result.coverage.unknownProductPlanned],
      [],
      [tr("ID Produk"), tr("Produk"), tr("Brand"), tr("Kategori"), tr("Aktif"), tr("Presentasi"), tr("Demo"), tr("Training"), tr("Pameran"), tr("Refreshment"), tr("Kunjungan"), tr("Selesai periode ini"), tr("Selesai periode pembanding"), tr("Selisih"), tr("Perubahan (%)"), tr("Tren"), tr("Rencana 30 hari"), tr("Rencana terdekat"), tr("Sedang berlangsung"), tr("Akhir jadwal promosi terakhir"), tr("Jeda (hari)"), tr("Jumlah riwayat selesai"), tr("Pelanggan unik periode ini"), tr("Pipeline aktif"), tr("Nilai pipeline aktif (IDR)"), tr("Nilai tertimbang (IDR)"), tr("Tugas terbuka"), tr("Tugas terlambat"), tr("Perhatian"), tr("Baru dalam katalog"), tr("Di bawah target rencana")],
      ...visibleRows.map(row => [row.product.id, row.product.name, row.product.brand, row.product.category, tr(row.product.active === false ? "Tidak" : "Ya"), row.countsByType.presentation, row.countsByType.demo, row.countsByType.training, row.countsByType.exhibition, row.countsByType.refreshment, row.countsByType.visit, row.actual, row.previous, row.delta, row.percentChange === null ? "" : row.percentChange, trendLabel(row.trend), row.planned, row.nextPlannedAt || "", row.inProgress, row.lastCompletedAt || "", row.idleDays ?? "", row.historyCount, row.uniqueAccounts, row.activePipelineCount, row.activePipelineValue, row.weightedPipelineValue, row.openTasks, row.overdueTasks, attentionLabel(row.attention), tr(row.flags.newProduct ? "Ya" : "Tidak"), tr(row.flags.belowTarget ? "Ya" : "Tidak")]),
    ];
    downloadCSV(`TTM-product-promotion-${from}-${to}.csv`, rows);
  }
  const showDetails = (row: ProductPromotionRow) => setSelectedId(row.product.id);
  return <div className="pa-page">
    <PageHead eyebrow={tr("Intelijen produk")} title={tr("Analitik promosi produk")} description={tr("Lihat produk yang dipromosikan, tren kegiatan selesai, dan celah dalam rencana tim.")} action={<button className="btn secondary" onClick={exportRows} disabled={!result.valid || visibleRows.length === 0}><Download size={16}/>{tr("Ekspor CSV")}</button>}/>
    <section className="card pa-filters" aria-label={tr("Filter analitik produk")}>
      <div className="pa-filter-top"><div><h2>{tr("Cakupan analisis")}</h2><p>{tr("Tanggal kalender WIB · dibanding periode sebelumnya dengan jumlah hari yang sama")}</p></div><div className="pa-quick" aria-label={tr("Pilihan periode cepat")}>{[30,90,180,365].map(days => <button key={days} className={to === today && from === rangeStart(today, days) ? "active" : ""} onClick={() => { setFrom(rangeStart(today, days)); setTo(today); }}>{tr("{{value0}} hari", { value0: days })}</button>)}</div></div>
      <div className="pa-filter-grid">
        <label className="field"><span>{tr("Dari tanggal")}</span><input type="date" value={from} max={today} onChange={event => setFrom(event.target.value)}/></label>
        <label className="field"><span>{tr("Sampai tanggal")}</span><input type="date" value={to} max={today} onChange={event => setTo(event.target.value)}/></label>
        <label className="field"><span>{tr("Anggota tim")}</span><select value={member} onChange={event => setMember(event.target.value)}><option value="">{tr("Seluruh tim")}</option>{data.profiles.map(person => <option key={person.id} value={person.id}>{person.full_name}{!person.active ? tr(" · Nonaktif") : ""}</option>)}</select></label>
        <label className="field"><span>{tr("Kategori produk")}</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="">{tr("Semua kategori")}</option>{categories.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="field"><span>{tr("Brand produk")}</span><select value={brand} onChange={event => setBrand(event.target.value)}><option value="">{tr("Semua brand")}</option>{brands.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="field"><span>{tr("Cakupan katalog")}</span><select value={includeInactive ? "all" : "active"} onChange={event => { setIncludeInactive(event.target.value === "all"); setCategory(""); setBrand(""); }}><option value="active">{tr("Produk aktif")}</option><option value="all">{tr("Aktif dan nonaktif")}</option></select></label>
        <label className="field"><span>{tr("Target rencana per produk / periode")}</span><input type="number" min="1" step="1" value={target} onChange={event => setTarget(event.target.value)}/></label>
        <label className="field"><span>{tr("Ambang jeda promosi (hari)")}</span><input type="number" min="1" step="1" value={idleThreshold} onChange={event => setIdleThreshold(event.target.value)}/></label>
      </div>
      <label className="field pa-search"><span>{tr("Cari produk, brand, atau kategori")}</span><input type="search" placeholder={tr("Cari dalam katalog…")} value={search} onChange={event => setSearch(event.target.value)}/></label>
    </section>
    {!result.valid ? <div className="form-error pa-error" role="alert">{errorLabel(result.error)}</div> : <>
      <div className="pa-scope"><span><strong>{memberName}</strong> · {dateRange(from,to)} · {tr("{{value0}} hari", {value0: result.period.days})}</span><span>{tr("Pembanding:")} {dateRange(result.period.previousFrom,result.period.previousTo)}</span></div>
      <div className="stats-grid pa-stats">
        <StatCard label={tr("Cakupan promosi katalog")} value={`${number(baseRows.length ? covered / baseRows.length * 100 : 0,1)}%`} note={tr("{{value0}} dari {{value1}} produk memiliki kegiatan selesai", {value0: covered,value1: baseRows.length})} icon={<Target size={20}/>}/>
        <StatCard label={tr("Kegiatan promosi selesai")} value={number(total("actual"))} note={tr("{{value0}} presentasi · {{value1}} demo", {value0: presentations,value1: demos})} icon={<BarChart3 size={20}/>}/>
        <StatCard label={tr("Di bawah target rencana")} value={number(belowTarget)} note={tr("Target {{value0}} kegiatan / produk; termasuk katalog baru", {value0: target})} icon={<TrendingUp size={20}/>} color="orange"/>
        <StatCard label={tr("Rencana 30 hari mendatang")} value={number(total("planned"))} note={tr("{{value0}} kegiatan sedang berlangsung saat ini", {value0: total("inProgress")})} icon={<CalendarPlus size={20}/>} color="green"/>
      </div>
      <p className="pa-scope-note"><Info size={14}/>{scopedNote}</p>
      <div className="pa-overview-grid">
        <section className="card pa-chart-card"><div className="pa-section-head"><div><h2>{tr("Produk paling aktif dipromosikan")}</h2><p>{tr("Lima produk teratas · kegiatan selesai periode ini dan pembanding")}</p></div></div>
          <div className="pa-legend"><span><i className="pa-current-swatch"/>{tr("Periode ini")}</span><span><i className="pa-previous-swatch"/>{tr("Periode pembanding")}</span></div>
          {ranking.length ? <div className="pa-chart" role="list" aria-label={tr("Perbandingan kegiatan selesai per produk")}>{ranking.map(row => <div className="pa-chart-row" key={row.product.id} role="listitem"><button className="pa-chart-name" onClick={() => showDetails(row)}>{row.product.name}<small>{row.product.brand}</small></button><div className="pa-bars"><div className="pa-bar-line"><span className="pa-bar pa-current" style={{width: `${row.actual/chartMax*100}%`}}/><strong>{number(row.actual)}</strong><span className="pa-sr-only">{tr("Periode ini")}</span></div><div className="pa-bar-line"><span className="pa-bar pa-previous" style={{width: `${row.previous/chartMax*100}%`}}/><strong>{number(row.previous)}</strong><span className="pa-sr-only">{tr("Periode pembanding")}</span></div></div></div>)}</div> : <Empty title={tr("Belum ada kegiatan untuk dibandingkan")} description={tr("Produk dengan nol kegiatan tetap tercantum dalam tabel agar dapat direncanakan.")}/>}
        </section>
        <section className="card pa-priority-card"><div className="pa-section-head"><div><h2>{tr("Prioritas perencanaan")}</h2><p>{tr("Mulai dari produk dengan kegiatan paling sedikit")}</p></div><span className="pa-count">{number(belowTarget)}</span></div>
          {priority.length ? <ul className="pa-priority-list">{priority.map(row => <li key={row.product.id}><button onClick={() => showDetails(row)}><span className="pa-priority-name">{row.product.name}<small>{attentionLabel(row.attention)}</small></span><span className="pa-priority-value">{number(row.actual)} / {number(Number(target))}<small>{tr("{{value0}} rencana",{value0:row.planned})}</small></span></button></li>)}</ul> : <Empty title={tr(baseRows.length ? "Semua produk dalam cakupan mencapai target rencana" : "Tidak ada produk yang sesuai filter")} description={tr("Sesuaikan target dengan kebutuhan promosi dan kapasitas tim.")}/>}
          <p className="pa-card-footnote">{tr("Target adalah alat bantu perencanaan, termasuk untuk entri katalog baru; bukan penilaian kinerja otomatis.")}</p>
        </section>
      </div>
      <section className="card pa-table-card" aria-label={tr("Rincian promosi semua produk")}>
        <div className="pa-section-head pa-table-head"><div><h2>{tr("Rincian seluruh produk")}</h2><p>{tr("{{value0}} dari {{value1}} produk dalam cakupan katalog",{value0: visibleRows.length,value1: baseRows.length})}</p></div><div className="pa-table-controls"><label className="field"><span>{tr("Filter perhatian")}</span><select value={attention} onChange={event => setAttention(event.target.value as AttentionFilter)}>{attentionOptions.map(([value,label]) => <option key={value} value={value}>{tr(label)}</option>)}</select></label><label className="field"><span>{tr("Urutkan produk")}</span><select value={sort} onChange={event => setSort(event.target.value as SortKey)}>{sortOptions.map(([value,label]) => <option key={value} value={value}>{tr(label)}</option>)}</select></label></div></div>
        {visibleRows.length ? <div className="table-wrap pa-table-wrap" tabIndex={0} role="region" aria-label={tr("Tabel promosi produk; geser horizontal untuk kolom lainnya")}><table className="data-table pa-table"><thead><tr><th><button onClick={() => setSort("name")}>{tr("Produk")}<ChevronDown size={12}/></button></th><th>{tr("Presentasi")}</th><th>{tr("Demo")}</th><th>{tr("Training")}</th><th title={tr("Pameran, refreshment, dan kunjungan")}>{tr("Lainnya")}</th><th><button onClick={() => setSort(sort === "most" ? "rare" : "most")}>{tr("Total selesai")}<ChevronDown size={12}/></button></th><th>{tr("Pembanding / Δ")}</th><th>{tr("Rencana 30 hari")}</th><th><button onClick={() => setSort("idle")}>{tr("Promosi terakhir / jeda")}<ChevronDown size={12}/></button></th><th>{tr("Pipeline aktif")}</th><th>{tr("Tugas terbuka")}</th><th><span className="pa-sr-only">{tr("Detail")}</span></th></tr></thead><tbody>{visibleRows.map(row => <tr key={row.product.id}>
          <td><button className="pa-product-name" onClick={() => showDetails(row)}>{row.product.name}</button><small className="pa-cell-meta">{row.product.brand} · {row.product.category}</small><span className={`pa-attention pa-attention-${row.attention}`}>{attentionLabel(row.attention)}</span>{row.product.active === false && <small className="pa-cell-meta">{tr("Nonaktif")}</small>}</td>
          <td>{number(row.countsByType.presentation)}</td><td>{number(row.countsByType.demo)}</td><td>{number(row.countsByType.training)}</td><td>{number(otherCount(row))}</td><td className="pa-total">{number(row.actual)}</td><td><span>{number(row.previous)}</span><Trend row={row}/></td>
          <td>{number(row.planned)}<small className="pa-cell-meta">{tr("{{value0}} berlangsung",{value0:row.inProgress})}</small></td>
          <td>{row.lastCompletedAt ? <>{displayDate(row.lastCompletedAt)}<small className="pa-cell-meta">{tr("{{value0}} hari jeda",{value0: number(row.idleDays!)})}</small></> : <span className="muted">{tr("Belum tercatat")}</span>}</td>
          <td>{number(row.activePipelineCount)}<small className="pa-cell-meta">{shortMoney(row.activePipelineValue)}</small></td><td>{number(row.openTasks)}{row.overdueTasks > 0 && <small className="pa-overdue">{tr("{{value0}} terlambat",{value0:row.overdueTasks})}</small>}</td>
          <td><button className="btn secondary pa-detail-btn" aria-label={tr("Lihat analitik {{value0}}",{value0:row.product.name})} onClick={() => showDetails(row)}>{tr("Detail")}</button></td>
        </tr>)}</tbody></table></div> : <Empty title={tr("Tidak ada produk yang sesuai filter")} description={tr("Ubah pencarian, kategori, brand, atau filter perhatian untuk melihat produk lainnya.")}/>}
      </section>
      <details className="card pa-method"><summary><Info size={16}/>{tr("Metode perhitungan dan kualitas pencatatan")}<ChevronDown size={15}/></summary><div><p>{tr("Hanya presentasi, demo, pameran, training, refreshment, dan kunjungan berstatus selesai dengan jadwal berakhir. Periode memakai tanggal mulai WIB.")}</p><p>{tr("Periode pembanding langsung mendahului periode terpilih dengan jumlah hari yang sama. Kegiatan internal, lainnya, draft, batal, dan kegiatan belum selesai tidak menambah realisasi.")}</p><p>{tr("Rencana: pengajuan/disetujui yang mulai dalam 30 hari mendatang. Pipeline aktif dan tugas terbuka merupakan kondisi saat ini, terlepas dari periode analisis.")}</p><p>{tr("Riwayat dan jeda memakai seluruh catatan selesai yang tersedia dalam cakupan anggota. Nol bukan bukti produk tidak pernah dipromosikan di luar CRM.")}</p><p>{tr("Promosi terakhir memakai akhir jadwal kegiatan, bukan waktu perubahan status. Tanggal penambahan katalog bukan tanggal peluncuran produk.")}</p><p>{tr("Filter anggota memakai pemilik atau peserta kegiatan, pemilik opportunity, dan penerima tugas. Satu tugas yang terhubung lewat kegiatan dan opportunity produk yang sama dihitung sekali.")}</p><div className="pa-quality"><strong>{tr("Catatan belum terhubung ke produk")}</strong><span>{tr("Selesai periode ini: {{value0}} tanpa produk, {{value1}} produk tak dikenal",{value0:result.coverage.unlinkedCompleted,value1:result.coverage.unknownProductCompleted})}</span><span>{tr("Rencana 30 hari: {{value0}} tanpa produk, {{value1}} produk tak dikenal",{value0:result.coverage.unlinkedPlanned,value1:result.coverage.unknownProductPlanned})}</span><span>{tr("{{value0}} jadwal tidak valid · {{value1}} produk nonaktif dikecualikan",{value0:result.coverage.invalidActivityDates,value1:result.coverage.excludedInactiveProducts})}</span><small>{tr("Diagnostik ini memakai cakupan anggota dan periode sebelum filter kategori, brand, dan pencarian. Catatan tanpa produk tidak dialokasikan secara perkiraan.")}</small></div></div></details>
    </>}
    {selected && result.valid && <Dialog title={selected.product.name} onClose={() => setSelectedId(null)} wide><div className="dialog-body pa-detail">
      <div className="pa-detail-heading"><span>{selected.product.brand} · {selected.product.category}</span><span className={`pa-attention pa-attention-${selected.attention}`}>{attentionLabel(selected.attention)}</span></div>
      <p className="pa-detail-period">{memberName} · {dateRange(from,to)}</p>
      {selected.flags.newProduct && <div className="info-banner"><Info size={16}/><span>{tr("Produk baru ditambahkan ke katalog pada atau setelah periode ini. Target digunakan untuk rencana awal, bukan penilaian kinerja; ini bukan tanggal peluncuran produk.")}</span></div>}
      <div className="pa-detail-metrics"><div><span>{tr("Selesai periode ini")}</span><strong>{number(selected.actual)}</strong></div><div><span>{tr("Selesai periode pembanding")}</span><strong>{number(selected.previous)}</strong></div><div><span>{tr("Perubahan")}</span><strong><Trend row={selected}/></strong></div><div><span>{tr("Pelanggan unik periode ini")}</span><strong>{number(selected.uniqueAccounts)}</strong></div></div>
      <div className="table-wrap"><table className="data-table"><caption>{tr("Rincian jenis kegiatan selesai")}</caption><thead><tr><th>{tr("Jenis kegiatan")}</th><th>{tr("Periode ini")}</th><th>{tr("Periode pembanding")}</th></tr></thead><tbody>{PROMOTION_TYPES.map(type => <tr key={type}><td>{ACTIVITY_LABEL[type]}</td><td>{number(selected.countsByType[type])}</td><td>{number(selected.previousByType[type])}</td></tr>)}</tbody></table></div>
      <div className="pa-detail-grid"><section><h3>{tr("Riwayat yang tersedia")}</h3><p>{tr("{{value0}} kegiatan selesai tercatat dalam cakupan anggota",{value0:selected.historyCount})}</p>{selected.lastCompletedAt ? <p><strong>{tr("Akhir jadwal promosi terakhir")}</strong><br/>{displayDate(selected.lastCompletedAt)} · {displayTime(selected.lastCompletedAt)} WIB<br/>{tr("{{value0}} hari jeda",{value0:number(selected.idleDays!)})}</p> : <p>{tr("Belum ada promosi selesai yang memenuhi kriteria dalam catatan yang tersedia untuk cakupan anggota ini.")}</p>}</section><section><h3>{tr("Rencana dan pekerjaan saat ini")}</h3><p>{tr("{{value0}} rencana 30 hari · {{value1}} sedang berlangsung",{value0:selected.planned,value1:selected.inProgress})}</p>{selected.nextPlannedAt && <p><strong>{tr("Rencana terdekat")}</strong><br/>{displayDate(selected.nextPlannedAt)} · {displayTime(selected.nextPlannedAt)} WIB</p>}<p>{tr("{{value0}} tugas terbuka · {{value1}} terlambat",{value0:selected.openTasks,value1:selected.overdueTasks})}</p></section><section><h3>{tr("Pipeline aktif saat ini")}</h3><p>{tr("{{value0}} opportunity aktif",{value0:selected.activePipelineCount})}</p><p><strong>{money(selected.activePipelineValue)}</strong><br/>{tr("Nilai tertimbang:")} {money(selected.weightedPipelineValue)}</p><small>{tr("Snapshot pipeline bukan pendapatan dan tidak dibatasi tanggal penutupan.")}</small></section><section><h3>{tr("Langkah perencanaan")}</h3><p>{tr("Bandingkan kebutuhan pelanggan, kapasitas tim, dan rencana yang sudah ada sebelum menambah kegiatan.")}</p><p>{tr("Target {{value0}} kegiatan / produk dalam periode terpilih.",{value0:target})}</p></section></div>
      <p className="pa-detail-method">{tr("Promosi terakhir memakai akhir jadwal kegiatan, bukan waktu perubahan status. Tanggal penambahan katalog bukan tanggal peluncuran produk.")}</p>
    </div><div className="dialog-footer"><button className="btn secondary" onClick={() => setSelectedId(null)}>{tr("Tutup")}</button>{onPlanActivity ? <button className="btn primary" disabled={profile.role === "viewer" || selected.product.active === false} title={profile.role === "viewer" ? tr("Viewer hanya dapat melihat analitik.") : selected.product.active === false ? tr("Aktifkan produk sebelum membuat rencana kegiatan.") : undefined} onClick={() => { if (profile.role !== "viewer" && selected.product.active !== false) { setSelectedId(null); onPlanActivity(selected.product.id); } }}><CalendarPlus size={16}/>{tr("Rencanakan kegiatan")}</button> : <span className="muted pa-plan-guide">{tr("Buka Kalender Kegiatan untuk membuat rencana dengan produk ini.")}</span>}</div></Dialog>}
  </div>;
}
