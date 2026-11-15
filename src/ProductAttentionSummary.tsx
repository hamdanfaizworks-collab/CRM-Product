import {ArrowRight, Target} from "lucide-react";
import {useCRM} from "./store";
import {getLocale, tr, useLanguage} from "./i18n";
import {buildProductAnalytics} from "./product-analytics";
import {dateOnly} from "./rules";
import "./product-attention.css";

export function ProductAttentionSummary({onOpen}: {onOpen: () => void}) {
  useLanguage();
  const {data} = useCRM();
  const now = Date.now(), to = dateOnly(new Date(now));
  const from = new Date(Date.parse(to + "T12:00:00Z") - 89 * 86400000).toISOString().slice(0, 10);
  const result = buildProductAnalytics(data, {from, to, now});
  if (!result.valid) return null;
  const {summary} = result;
  const priorities = result.rows.filter(row => row.flags.belowTarget).sort((a, b) => a.actual - b.actual || Number(b.flags.idle) - Number(a.flags.idle) || b.activePipelineCount - a.activePipelineCount || a.product.name.localeCompare(b.product.name, getLocale()));
  return <section className="card product-attention-card" aria-labelledby="product-attention-heading">
    <div className="product-attention-head"><div><span className="eyebrow">{tr("PRODUCT MANAGEMENT")}</span><h2 id="product-attention-heading">{tr("Produk Perlu Perhatian")}</h2><p>{tr("Seluruh tim · 90 hari terakhir · produk aktif")}</p></div><Target size={23} aria-hidden="true"/></div>
    <div className="product-attention-metrics">
      <div><strong>{priorities.length}</strong><span>{tr("Di bawah 2 promosi selesai")}</span></div>
      <div><strong>{summary.productsWithoutActivity}</strong><span>{tr("Tanpa promosi selesai pada periode")}</span></div>
      <div><strong>{summary.coveragePercent.toLocaleString(getLocale(), {maximumFractionDigits: 1})}%</strong><span>{tr("Cakupan {{value0}} produk aktif", {value0: summary.products})}</span></div>
    </div>
    {priorities.length ? <ul className="product-attention-list">{priorities.slice(0, 3).map(row => <li key={row.product.id}><strong>{row.product.name}</strong><span>{row.product.brand} · {row.product.category}</span><small>{tr("{{value0}} promosi selesai · {{value1}} peluang aktif", {value0: row.actual, value1: row.activePipelineCount})}</small></li>)}</ul> : <p className="muted">{tr("Seluruh produk dalam cakupan sudah mencapai ambang panduan periode ini.")}</p>}
    <div className="product-attention-foot"><p>{tr("Ambang 2 kegiatan membantu perencanaan promosi; bukan penilaian kinerja. Produk baru dan rencana mendatang ditandai pada analisis.")}</p><button className="btn secondary" onClick={onOpen}>{tr("Buka Analisis Produk")}<ArrowRight size={15}/></button></div>
  </section>;
}
