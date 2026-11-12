import {useEffect, useState} from 'react';
import {LoaderCircle, RefreshCw} from 'lucide-react';
import {tr, useLanguage} from './i18n';
import {displayDate} from './rules';
import {bundledProvinces, bundledRegencies, loadProvinces, loadRegencies, provinceCodeFor, REGION_SNAPSHOT_DATE, type RegionResult} from './indonesia-regions';

export function CustomerRegionFields({province, city, onChange, disabled = false}: {
  province: string; city: string; onChange: (values: {province: string; city: string}) => void; disabled?: boolean;
}) {
  useLanguage();
  const [retry, setRetry] = useState(0);
  const [provinces, setProvinces] = useState<RegionResult>({rows: bundledProvinces, source: 'snapshot', updatedAt: REGION_SNAPSHOT_DATE, unavailable: false});
  const [provinceLoading, setProvinceLoading] = useState(true);
  const code = provinceCodeFor(province, provinces.rows);
  const [regencies, setRegencies] = useState<RegionResult & {provinceCode: string}>({rows: bundledRegencies(code), source: 'snapshot', updatedAt: REGION_SNAPSHOT_DATE, unavailable: false, provinceCode: code});
  const [cityLoading, setCityLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setProvinceLoading(true);
    loadProvinces(controller.signal, retry > 0).then(result => {if (active) setProvinces(result);}).catch(() => {}).finally(() => {if (active) setProvinceLoading(false);});
    return () => {active = false; controller.abort();};
  }, [retry]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setRegencies({rows: bundledRegencies(code), source: 'snapshot', updatedAt: REGION_SNAPSHOT_DATE, unavailable: false, provinceCode: code});
    if (!code) {setCityLoading(false); return () => controller.abort();}
    setCityLoading(true);
    loadRegencies(code, controller.signal, retry > 0).then(result => {if (active) setRegencies({...result, provinceCode: code});}).catch(() => {}).finally(() => {if (active) setCityLoading(false);});
    return () => {active = false; controller.abort();};
  }, [code, retry]);
  const cityOptions = regencies.provinceCode === code ? regencies.rows : bundledRegencies(code);
  const legacyProvince = !!province && !provinces.rows.some(row => row.name === province);
  const legacyCity = !!city && !cityOptions.some(row => row.name === city);
  const loading = provinceLoading || cityLoading;
  const fallback = provinces.unavailable || regencies.provinceCode === code && regencies.unavailable;
  return <fieldset className="customer-region-fields full" disabled={disabled}>
    <legend className="customer-region-legend">{tr('Wilayah pelanggan')}</legend>
    <div className="customer-region-selects">
      <label className="field"><span>{tr('Provinsi')}</span><select aria-describedby="customer-region-note" value={province} onChange={event => {const next = event.target.value; onChange({province: next, city: next === province ? city : ''});}}>
        <option value="">{tr('Pilih provinsi')}</option>
        {legacyProvince && <option value={province}>{province} — {tr('nilai tersimpan')}</option>}
        {provinces.rows.map(row => <option key={row.code} value={row.name}>{row.name}</option>)}
      </select></label>
      <label className="field"><span>{tr('Kabupaten / kota')}</span><select aria-describedby="customer-region-note" value={city} disabled={!code || disabled} onChange={event => onChange({province, city: event.target.value})}>
        <option value="">{tr(code ? 'Pilih kabupaten / kota' : 'Pilih provinsi terlebih dahulu')}</option>
        {legacyCity && <option value={city}>{city} — {tr('nilai tersimpan')}</option>}
        {cityOptions.map(row => <option key={row.code} value={row.name}>{row.name}</option>)}
      </select></label>
    </div>
    <div id="customer-region-note" className="customer-region-note" aria-live="polite">
      {loading && <span className="customer-region-loading"><LoaderCircle className="spin" size={13}/>{tr('Memperbarui pilihan wilayah…')}</span>}
      {fallback && <span className="customer-region-fallback">{tr('Layanan wilayah belum tersedia. Data referensi tersimpan tetap dapat dipilih.')} <button type="button" className="text-btn" disabled={loading || disabled} onClick={() => setRetry(value => value + 1)}><RefreshCw size={12}/>{tr('Coba muat ulang')}</button></span>}
      {!loading && !fallback && <span>{tr('Data referensi wilayah diperbarui {{value0}}.', {value0: displayDate(provinces.updatedAt)})}</span>}
      {(legacyProvince || legacyCity) && <p className="customer-region-legacy">{tr('Nilai wilayah lama dipertahankan. Pilih nama referensi untuk memperbaruinya; mengganti provinsi akan mengosongkan kabupaten/kota.')}</p>}
    </div>
  </fieldset>;
}
