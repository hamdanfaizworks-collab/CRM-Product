import {describe, expect, it} from 'vitest';
import {conflictFor, csvText, dateOnly, displayDate, fromLocal, localInput, overlaps, pipelineStats} from './rules';
import type {Activity, ActivityStatus, Data, Opportunity, Stage} from './types';

const activity = (changes: Partial<Activity> = {}): Activity => ({
  id: 'activity-1', title: 'Demo USG', type: 'demo', account_id: null,
  product_id: null, opportunity_id: null, owner_id: 'ps-1',
  start_at: '2026-11-11T02:00:00Z', end_at: '2026-11-11T03:00:00Z',
  timezone: 'Asia/Jakarta', location: 'Makassar', objective: 'Evaluasi produk',
  notes: '', priority: 'normal', status: 'approved', report: '', outcome: '',
  follow_up_date: null, participant_ids: ['as-1'], equipment_ids: ['unit-1'],
  approval_note: '', budget: 0, actual_cost: 0, attendance_count: 0,
  ...changes,
});

describe('interval kegiatan', () => {
  it('memesan interval half-open sehingga sesi berurutan tidak bentrok', () => {
    expect(overlaps('2026-11-11T02:00Z', '2026-11-11T03:00Z', '2026-11-11T03:00Z', '2026-11-11T04:00Z')).toBe(false);
    expect(overlaps('2026-11-11T03:00Z', '2026-11-11T04:00Z', '2026-11-11T02:00Z', '2026-11-11T03:00Z')).toBe(false);
  });

  it('menemukan overlap satu milidetik dan sesi yang sepenuhnya berada di dalam sesi lain', () => {
    expect(overlaps('2026-11-11T02:00:00Z', '2026-11-11T03:00:00Z', '2026-11-11T02:59:59.999Z', '2026-11-11T04:00:00Z')).toBe(true);
    expect(overlaps('2026-11-11T02:00Z', '2026-11-11T05:00Z', '2026-11-11T03:00Z', '2026-11-11T04:00Z')).toBe(true);
  });

  it('membandingkan waktu absolut meskipun offset penulisannya berbeda', () => {
    expect(overlaps('2026-11-11T09:00:00+07:00', '2026-11-11T10:00:00+07:00', '2026-11-11T02:30:00Z', '2026-11-11T03:30:00Z')).toBe(true);
    expect(overlaps('2026-11-11T09:00:00+07:00', '2026-11-11T10:00:00+07:00', '2026-11-11T03:00:00Z', '2026-11-11T04:00:00Z')).toBe(false);
  });

  it('menemukan bentrok lintas hari dan pergantian bulan', () => {
    expect(overlaps('2026-11-30T23:00:00+07:00', '2026-12-01T01:00:00+07:00', '2026-12-01T00:30:00+07:00', '2026-12-01T02:00:00+07:00')).toBe(true);
  });
});

describe('reservasi personel dan unit demo', () => {
  const existing = activity();
  const candidate = (changes: Partial<Activity> = {}) => activity({id: 'activity-2', owner_id: 'ps-2', participant_ids: ['as-2'], equipment_ids: ['unit-2'], status: 'submitted', ...changes});

  it('menolak waktu selesai sama atau lebih awal dari waktu mulai', () => {
    expect(conflictFor(candidate({end_at: existing.start_at}), [])).toMatch(/selesai harus setelah/);
    expect(conflictFor(candidate({end_at: '2026-11-11T01:59:00Z'}), [])).toMatch(/selesai harus setelah/);
  });

  it('mengizinkan kegiatan paralel yang memakai orang dan unit berbeda', () => {
    expect(conflictFor(candidate(), [existing])).toBe('');
  });

  it('menemukan bentrok koordinator, peserta, dan silang peran', () => {
    for (const changes of [
      {owner_id: 'ps-1'},
      {participant_ids: ['as-1']},
      {owner_id: 'as-1'},
      {participant_ids: ['ps-1']},
    ]) expect(conflictFor(candidate(changes), [existing])).toContain('Demo USG');
  });

  it('menemukan unit demo sama walau personelnya berbeda', () => {
    expect(conflictFor(candidate({equipment_ids: ['unit-1']}), [existing])).toMatch(/Jadwal bentrok/);
  });

  it('tidak membenturkan kegiatan dengan dirinya sendiri ketika diedit', () => {
    expect(conflictFor(existing, [existing])).toBe('');
  });

  it('mengizinkan booking dengan sumber daya sama tepat setelah sesi sebelumnya selesai', () => {
    expect(conflictFor(candidate({owner_id: 'ps-1', equipment_ids: ['unit-1'], start_at: existing.end_at, end_at: '2026-11-11T04:00:00Z'}), [existing])).toBe('');
  });

  it.each<ActivityStatus>(['submitted', 'approved', 'in_progress'])('status %s menahan reservasi', status => {
    expect(conflictFor(candidate({owner_id: 'ps-1'}), [activity({status})])).toMatch(/Jadwal bentrok/);
  });

  it.each<ActivityStatus>(['draft', 'cancelled', 'rejected', 'completed'])('kegiatan lain berstatus %s tidak menahan reservasi', status => {
    expect(conflictFor(candidate({owner_id: 'ps-1'}), [activity({status})])).toBe('');
  });

  it.each<ActivityStatus>(['draft', 'cancelled', 'rejected', 'completed'])('kandidat berstatus %s tidak meminta reservasi', status => {
    expect(conflictFor(candidate({owner_id: 'ps-1', status}), [existing])).toBe('');
  });
});

describe('ekspor CSV aman untuk spreadsheet', () => {
  it('menjaga BOM, unicode, koma, tanda petik, dan baris baru di dalam field', () => {
    expect(csvText([['Pelanggan', 'Catatan'], ['RS, Jakarta', 'Dokter berkata "setuju"\nTindak lanjut: presentasi']] ))
      .toBe('\uFEFF"Pelanggan","Catatan"\r\n"RS, Jakarta","Dokter berkata ""setuju""\nTindak lanjut: presentasi"');
  });

  it.each(['=1+1', '+SUM(A1:A2)', '-123', '@SUM(A1:A2)', '  =HYPERLINK("x")', '\t+1', '\r\n-2'])('menetralkan awalan formula %j', value => {
    expect(csvText([[value]])).toBe('\uFEFF"\'' + value.replaceAll('"', '""') + '"');
  });

  it('mempertahankan nilai biasa dan mengubah null/undefined menjadi field kosong', () => {
    expect(csvText([[0, false, null, undefined, 'hasil = 1', 'Pelatihan aplikasi']]))
      .toBe('\uFEFF"0","false","","","hasil = 1","Pelatihan aplikasi"');
  });
});

describe('KPI pipeline', () => {
  const opportunity = (stage: Stage, value: number, probability: number) => ({stage, value, probability}) as Opportunity;
  const data = (opportunities: Opportunity[]) => ({opportunities}) as Data;

  it('menghitung peluang aktif dan weighted value terpisah dari won/lost', () => {
    const result = pipelineStats(data([
      opportunity('lead', 10_000_000, 25),
      opportunity('proposal', 20_000_000, 50),
      opportunity('negotiation', 5_000_000, 80),
      opportunity('won', 60_000_000, 100),
      opportunity('lost', 900_000_000, 0),
    ]));
    expect(result).toEqual({count: 3, total: 35_000_000, weighted: 16_500_000, won: 60_000_000});
  });

  it('memasukkan qualified dan demo sebagai pipeline aktif', () => {
    expect(pipelineStats(data([opportunity('qualified', 1_000_000, 0), opportunity('demo', 1_000_000, 100)])))
      .toEqual({count: 2, total: 2_000_000, weighted: 1_000_000, won: 0});
  });

  it('menghasilkan nol untuk data kosong', () => {
    expect(pipelineStats(data([]))).toEqual({count: 0, total: 0, weighted: 0, won: 0});
  });
});

describe('tanggal operasional WIB', () => {
  it('memakai hari Jakarta saat hari UTC belum berganti', () => {
    expect(dateOnly('2026-11-10T16:59:59Z')).toBe('2026-11-10');
    expect(dateOnly('2026-11-10T17:00:00Z')).toBe('2026-11-11');
    expect(dateOnly('2026-12-31T17:00:00Z')).toBe('2027-01-01');
  });

  it('mengonversi input WIB ke UTC dan kembali tanpa bergantung timezone mesin', () => {
    expect(fromLocal('2026-11-11T00:30')).toBe('2026-11-10T17:30:00.000Z');
    expect(localInput('2026-11-10T17:30:00Z')).toBe('2026-11-11T00:30');
    expect(fromLocal(localInput('2026-11-10T17:30:00Z'))).toBe('2026-11-10T17:30:00.000Z');
  });

  it('menampilkan date-only pada tanggal yang sama tanpa bergeser ke hari sebelumnya', () => {
    expect(displayDate('2026-11-11', {year: 'numeric', month: '2-digit', day: '2-digit'})).toBe('11/11/2026');
    expect(displayDate(null)).toBe('—');
  });
});
