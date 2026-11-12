// @vitest-environment happy-dom
import React, {useState} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {CustomerRegionFields} from './CustomerRegionFields';
import {AccountForm} from './AccountForm';
import {bundledProvinces, bundledRegencies, clearRegionCache, loadProvinces, provinceCodeFor, REGION_API_BASE} from './indonesia-regions';
import {setLanguage} from './i18n';

const apiPayload = (rows: {code: string; name: string}[]) => ({data: rows.map(row => ({id: row.code, name: row.name})), meta: {updated_at: '2026-11-08'}});
function response(rows: {code: string; name: string}[]) {return {ok: true, json: async () => apiPayload(rows)} as Response;}
const fetchRegions = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  const code = url.match(/regencies\/(\d{2})\.json$/)?.[1];
  return response(code ? bundledRegencies(code) : bundledProvinces);
});

beforeEach(() => {
  clearRegionCache(); setLanguage('id');
  fetchRegions.mockReset();
  fetchRegions.mockImplementation(async input => {
    const code = String(input).match(/regencies\/(\d{2})\.json$/)?.[1];
    return response(code ? bundledRegencies(code) : bundledProvinces);
  });
  vi.stubGlobal('fetch', fetchRegions);
});
afterEach(() => {cleanup(); vi.unstubAllGlobals(); setLanguage('id');});

function Harness({initialProvince = '', initialCity = '', onSave = () => undefined}: {initialProvince?: string; initialCity?: string; onSave?: (value: {province: string; city: string}) => void}) {
  const [value, setValue] = useState({province: initialProvince, city: initialCity});
  return <form onSubmit={event => {event.preventDefault(); onSave(value);}}><CustomerRegionFields {...value} onChange={setValue}/><button>Simpan alamat</button></form>;
}

describe('bundled Indonesian region reference', () => {
  it('contains all 38 provinces and 514 unique regencies/cities with valid parents, including Papua DOB', () => {
    expect(bundledProvinces).toHaveLength(38);
    const rows = bundledProvinces.flatMap(province => bundledRegencies(province.code));
    expect(rows).toHaveLength(514);
    expect(new Set(rows.map(row => row.code)).size).toBe(514);
    for (const province of bundledProvinces) expect(bundledRegencies(province.code).every(row => row.code.startsWith(province.code + '.'))).toBe(true);
    for (const code of ['93', '94', '95', '96']) expect(bundledProvinces.some(province => province.code === code)).toBe(true);
    expect(provinceCodeFor('DKI Jakarta')).toBe('31');
    expect(provinceCodeFor('DI Yogyakarta')).toBe('34');
  });

  it('rejects a stale 34-province API response and returns the validated fallback', async () => {
    fetchRegions.mockResolvedValue(response(bundledProvinces.slice(0, 34)));
    const result = await loadProvinces();
    expect(result.source).toBe('snapshot');
    expect(result.unavailable).toBe(true);
    expect(result.rows).toHaveLength(38);
  });
});

it('keeps dropdowns usable while refreshing and cascades city choices only after a user province change', async () => {
  const user = userEvent.setup(); const saved = vi.fn();
  let resolveProvinces!: (result: Response) => void;
  fetchRegions.mockImplementation(input => String(input).endsWith('/provinces.json') ? new Promise(resolve => {resolveProvinces = resolve;}) : Promise.resolve(response(bundledRegencies(String(input).match(/regencies\/(\d{2})\.json$/)![1]))));
  render(<Harness onSave={saved}/>);
  expect(screen.getByText('Memperbarui pilihan wilayah…')).toBeTruthy();
  const province = screen.getByRole('combobox', {name: 'Provinsi'});
  expect(within(province).getAllByRole('option')).toHaveLength(39);
  await user.selectOptions(province, 'Jawa Barat');
  const city = screen.getByRole('combobox', {name: 'Kabupaten / kota'});
  await user.selectOptions(city, 'Kota Bandung');
  resolveProvinces(response(bundledProvinces));
  await waitFor(() => expect((city as HTMLSelectElement).value).toBe('Kota Bandung'));
  await user.click(screen.getByRole('button', {name: 'Simpan alamat'}));
  expect(saved).toHaveBeenLastCalledWith({province: 'Jawa Barat', city: 'Kota Bandung'});
  await user.selectOptions(province, 'Sulawesi Selatan');
  expect((city as HTMLSelectElement).value).toBe('');
  expect(within(city).queryByRole('option', {name: 'Kota Bandung'})).toBeNull();
  await user.selectOptions(city, 'Kota Makassar');
  await user.click(screen.getByRole('button', {name: 'Simpan alamat'}));
  expect(saved).toHaveBeenLastCalledWith({province: 'Sulawesi Selatan', city: 'Kota Makassar'});
  for (const [url, options] of fetchRegions.mock.calls as any[]) {
    expect(url).toMatch(new RegExp('^' + REGION_API_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/(provinces\\.json|regencies/\\d{2}\\.json)$'));
    expect(options.credentials).toBe('omit');
    expect(options.referrerPolicy).toBe('no-referrer');
  }
});

it('uses bundled regions during an API outage and retries without erasing the selected address', async () => {
  const user = userEvent.setup(); const saved = vi.fn();
  fetchRegions.mockRejectedValue(Error('Offline'));
  render(<Harness initialProvince="Jawa Barat" initialCity="Kota Bandung" onSave={saved}/>);
  await screen.findByText(/Layanan wilayah belum tersedia/);
  await user.click(screen.getByRole('button', {name: 'Simpan alamat'}));
  expect(saved).toHaveBeenCalledWith({province: 'Jawa Barat', city: 'Kota Bandung'});
  fetchRegions.mockImplementation(async input => {
    const code = String(input).match(/regencies\/(\d{2})\.json$/)?.[1];
    return response(code ? bundledRegencies(code) : bundledProvinces);
  });
  await user.click(screen.getByRole('button', {name: 'Coba muat ulang'}));
  await waitFor(() => expect(screen.queryByText(/Layanan wilayah belum tersedia/)).toBeNull());
  expect((screen.getByRole('combobox', {name: 'Kabupaten / kota'}) as HTMLSelectElement).value).toBe('Kota Bandung');
});

it('ignores a late city response for a previously selected province', async () => {
  const user = userEvent.setup(); let resolveWestJava!: (result: Response) => void;
  fetchRegions.mockImplementation(input => {
    const code = String(input).match(/regencies\/(\d{2})\.json$/)?.[1];
    if (code === '32') return new Promise(resolve => {resolveWestJava = resolve;});
    return Promise.resolve(response(code ? bundledRegencies(code) : bundledProvinces));
  });
  render(<Harness/>);
  await user.selectOptions(screen.getByRole('combobox', {name: 'Provinsi'}), 'Jawa Barat');
  await user.selectOptions(screen.getByRole('combobox', {name: 'Provinsi'}), 'Sulawesi Selatan');
  resolveWestJava(response(bundledRegencies('32')));
  const city = screen.getByRole('combobox', {name: 'Kabupaten / kota'});
  await waitFor(() => expect(within(city).getByRole('option', {name: 'Kota Makassar'})).toBeTruthy());
  expect(within(city).queryByRole('option', {name: 'Kota Bandung'})).toBeNull();
});

it('preserves legacy raw province/city text when another customer field is edited', async () => {
  const user = userEvent.setup(); const saved = vi.fn(async () => undefined);
  render(<AccountForm title="Edit pelanggan" initial={{name: 'RS Lama', province: 'DKI Jakarta', city: 'Jakarta'}} fields={[{key: 'name', label: 'Nama instansi', required: true}, {key: 'province', label: 'Provinsi'}, {key: 'city', label: 'Kabupaten / kota'}]} onSave={saved} onClose={() => undefined}/>);
  expect(screen.getByText(/Nilai wilayah lama dipertahankan/)).toBeTruthy();
  expect((screen.getByRole('combobox', {name: 'Provinsi'}) as HTMLSelectElement).value).toBe('DKI Jakarta');
  expect((screen.getByRole('combobox', {name: 'Kabupaten / kota'}) as HTMLSelectElement).value).toBe('Jakarta');
  await user.type(screen.getByLabelText(/Nama instansi/), ' Diperbarui');
  await user.click(screen.getByRole('button', {name: 'Simpan'}));
  await waitFor(() => expect(saved).toHaveBeenCalledWith({name: 'RS Lama Diperbarui', province: 'DKI Jakarta', city: 'Jakarta'}));
});
