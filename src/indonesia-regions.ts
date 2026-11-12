import snapshot from './data/indonesia-regions.json';

export interface RegionOption {code: string; name: string}
export interface RegionResult {rows: RegionOption[]; source: 'api' | 'snapshot'; updatedAt: string; unavailable: boolean}
export const REGION_API_BASE = 'https://www.emsifa.com/api-wilayah-indonesia/v2';
export const REGION_SNAPSHOT_DATE = snapshot.updated_at;
export const bundledProvinces: RegionOption[] = snapshot.provinces;
const bundledRegencyMap = snapshot.regencies as Record<string, RegionOption[]>;
export const bundledRegencies = (provinceCode: string): RegionOption[] => bundledRegencyMap[provinceCode] || [];
const cache = new Map<string, {result: RegionResult; expires: number}>();
const normalized = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase('id-ID').replace(/[.,]/g, '').replace(/\s+/g, ' ');

/** Resolve familiar saved abbreviations without rewriting the saved text. */
export function provinceCodeFor(name: string, provinces: RegionOption[] = bundledProvinces) {
  const value = normalized(name);
  const exact = provinces.find(province => normalized(province.name) === value);
  if (exact) return exact.code;
  const aliases: Record<string, string> = {
    'dki jakarta': '31', jakarta: '31', 'di yogyakarta': '34', 'd i yogyakarta': '34',
    yogyakarta: '34', 'nanggroe aceh darussalam': '11',
  };
  const code = aliases[value];
  return provinces.some(province => province.code === code) ? code : '';
}

function parseRows(payload: unknown, provinceCode?: string): {rows: RegionOption[]; updatedAt: string} {
  if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) throw Error('Invalid regional response');
  const rows = payload.data.map((row: unknown) => {
    if (!row || typeof row !== 'object' || !('id' in row) || !('name' in row) || typeof row.id !== 'string' || typeof row.name !== 'string') throw Error('Invalid region');
    const codePattern = provinceCode ? new RegExp(`^${provinceCode}\\.\\d{2}$`) : /^\d{2}$/;
    if (!codePattern.test(row.id) || !row.name.trim() || row.name.length > 150) throw Error('Invalid regional identity');
    return {code: row.id, name: row.name.trim()};
  });
  if (!rows.length || new Set(rows.map(row => row.code)).size !== rows.length || rows.length > (provinceCode ? 100 : 100)) throw Error('Incomplete regional response');
  if (!provinceCode && (rows.length < 38 || ['93', '94', '95', '96'].some(code => !rows.some(row => row.code === code)))) throw Error('Outdated province response');
  const meta = 'meta' in payload && payload.meta && typeof payload.meta === 'object' ? payload.meta as Record<string, unknown> : {};
  return {rows, updatedAt: typeof meta.updated_at === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(meta.updated_at) ? meta.updated_at : REGION_SNAPSHOT_DATE};
}

async function load(path: string, fallback: RegionOption[], provinceCode: string | undefined, signal?: AbortSignal, force = false): Promise<RegionResult> {
  const existing = cache.get(path);
  if (!force && existing && existing.expires > Date.now()) return existing.result;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, {once: true});
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${REGION_API_BASE}/${path}`, {signal: controller.signal, mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', headers: {Accept: 'application/json'}});
    if (!response.ok) throw Error(`Region API HTTP ${response.status}`);
    const parsed = parseRows(await response.json(), provinceCode);
    const result: RegionResult = {...parsed, source: 'api', unavailable: false};
    cache.set(path, {result, expires: Date.now() + 24 * 60 * 60 * 1000});
    return result;
  } catch (error) {
    if (signal?.aborted) throw error;
    return {rows: fallback, source: 'snapshot', updatedAt: REGION_SNAPSHOT_DATE, unavailable: true};
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export const loadProvinces = (signal?: AbortSignal, force = false) => load('provinces.json', bundledProvinces, undefined, signal, force);
export function loadRegencies(provinceCode: string, signal?: AbortSignal, force = false) {
  if (!/^\d{2}$/.test(provinceCode)) throw Error('Invalid province code');
  return load(`regencies/${provinceCode}.json`, bundledRegencies(provinceCode), provinceCode, signal, force);
}

/** Clears only public region-reference cache, never customer records. */
export function clearRegionCache() {cache.clear();}
