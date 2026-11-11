// @vitest-environment happy-dom
import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const boundary = vi.hoisted(() => ({
  context: null as any,
  files: new Map<string, Blob>(),
  upload: vi.fn(), remove: vi.fn(), signed: vi.fn(), lookup: vi.fn(), fromTable: vi.fn(),
  saveFile: vi.fn(), getFile: vi.fn(), deleteFile: vi.fn(),
}));

vi.mock('./store', () => ({
  useCRM: () => boundary.context,
  friendlyError: (error: unknown) => error instanceof Error ? error.message : String(error),
  supabase: {
    storage: {from: () => ({upload: boundary.upload, remove: boundary.remove, createSignedUrl: boundary.signed})},
    from: (table: string) => {
      boundary.fromTable(table);
      return {select: () => ({eq: () => ({maybeSingle: boundary.lookup})})};
    },
  },
}));

// IndexedDB is the browser boundary. Preserve real file bytes across component
// remounts while keeping these DOM tests independent of an IndexedDB polyfill.
vi.mock('./knowledge-files', async original => {
  const actual = await original<typeof import('./knowledge-files')>();
  return {...actual, saveDemoKnowledgeFile: boundary.saveFile, getDemoKnowledgeFile: boundary.getFile, deleteDemoKnowledgeFile: boundary.deleteFile};
});

import {KnowledgeBasePage} from './KnowledgeBasePage';
import {knowledgeFileDetails, MAX_KNOWLEDGE_BYTES} from './knowledge-files';
import {demoData, DEMO_USER, demoId} from './demo';
import {setLanguage} from './i18n';
import type {KnowledgeDocument} from './types';

const PDF_CONTENT = '%PDF-1.4\nKnowledge test document bytes\n%%EOF';
const pdfFile = () => new File([PDF_CONTENT], 'Workflow.PDF', {type: 'application/octet-stream'});
const fixtureDocument = (overrides: Partial<KnowledgeDocument> = {}): KnowledgeDocument => ({
  id: demoId(9000), product_id: null, title: 'Presentasi', document_type: 'datasheet',
  description: 'Dokumen uji yang isinya harus tetap asli.', version: '1.0', language: 'en', tags: ['Cardiac'],
  file_name: 'Workflow.PDF', storage_path: `${DEMO_USER}/${demoId(9000)}/immutable.pdf`,
  mime_type: 'application/pdf', size_bytes: PDF_CONTENT.length, status: 'active', created_by: DEMO_USER,
  created_at: '2026-11-11T02:00:00Z', updated_at: '2026-11-11T02:00:00Z', ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  setLanguage('id');
  boundary.files.clear();
  const data = demoData();
  boundary.context = {
    data, profile: data.profiles.find(person => person.id === DEMO_USER)!, demo: true,
    notify: vi.fn(), refresh: vi.fn(async () => undefined),
    save: vi.fn(async (table: string, patch: any) => {
      const previous = boundary.context.data[table].find((row: any) => row.id === patch.id);
      const record = {...previous, ...patch, created_by: previous?.created_by || boundary.context.profile.id, created_at: previous?.created_at || '2026-11-11T02:00:00Z', updated_at: '2026-11-11T03:00:00Z'};
      boundary.context.data[table] = previous ? boundary.context.data[table].map((row: any) => row.id === patch.id ? record : row) : [...boundary.context.data[table], record];
      return record;
    }),
  };
  boundary.saveFile.mockImplementation(async (path: string, file: File) => {boundary.files.set(path, file);});
  boundary.getFile.mockImplementation(async (path: string) => {
    const file = boundary.files.get(path);
    if (!file) throw Error('File missing');
    return file;
  });
  boundary.deleteFile.mockImplementation(async (path: string) => {boundary.files.delete(path);});
  boundary.upload.mockResolvedValue({data: {}, error: null});
  boundary.remove.mockResolvedValue({data: [], error: null});
  boundary.lookup.mockResolvedValue({data: null, error: null});
  boundary.signed.mockResolvedValue({data: {signedUrl: 'https://example.test/private-download?token=test'}, error: null});
});

afterEach(() => {cleanup(); vi.restoreAllMocks(); setLanguage('id');});

async function prepareUpload(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole('button', {name: 'Unggah dokumen'})[0]);
  const form = within(await screen.findByRole('dialog'));
  await user.upload(form.getByLabelText('File dokumen'), pdfFile());
  await user.type(form.getByLabelText(/Judul dokumen/), 'Presentasi');
  await user.selectOptions(form.getByLabelText(/Jenis dokumen/), 'datasheet');
  expect((form.getByLabelText(/Versi dokumen/) as HTMLInputElement).value).toBe('1.0');
  expect((form.getByLabelText(/Bahasa dokumen/) as HTMLSelectElement).value).toBe('en');
  await user.type(form.getByLabelText(/Tag dokumen/), 'Cardiac, workflow');
  return form;
}

describe('knowledge file validation', () => {
  it('uses canonical MIME types for every allowed extension, including unreliable browser MIME', () => {
    const expected: Record<string, string> = {pdf: 'application/pdf', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg'};
    for (const [extension, mimeType] of Object.entries(expected)) {
      expect(knowledgeFileDetails(new File(['bytes'], `document.${extension.toUpperCase()}`, {type: 'application/octet-stream'}))).toEqual({extension, mimeType});
    }
  });

  it('rejects empty, unsupported, and oversized files while accepting the 25 MiB boundary', () => {
    expect(() => knowledgeFileDetails(new File([], 'empty.pdf'))).toThrow(/File kosong/);
    expect(() => knowledgeFileDetails(new File(['html'], 'unsafe.html', {type: 'application/pdf'}))).toThrow(/Gunakan PDF/);
    const file = pdfFile();
    Object.defineProperty(file, 'size', {value: MAX_KNOWLEDGE_BYTES + 1, configurable: true});
    expect(() => knowledgeFileDetails(file)).toThrow(/25 MiB/);
    Object.defineProperty(file, 'size', {value: MAX_KNOWLEDGE_BYTES});
    expect(knowledgeFileDetails(file).mimeType).toBe('application/pdf');
  });
});

it('clears a previously valid selection when a replacement file is rejected', async () => {
  const user = userEvent.setup();
  render(<KnowledgeBasePage/>);
  const form = await prepareUpload(user);
  fireEvent.change(form.getByLabelText('File dokumen'), {target: {files: [new File(['html'], 'replacement.html')]}});
  expect(form.getByRole('alert').textContent).toContain('Gunakan PDF');
  expect(form.queryByText('Workflow.PDF', {exact: true})).toBeNull();
  await user.click(form.getByRole('button', {name: 'Simpan dokumen'}));
  await waitFor(() => expect(form.getByRole('alert').textContent).toContain('Pilih file dokumen sebelum menyimpan.'));
  expect(boundary.saveFile).not.toHaveBeenCalled();
  expect(boundary.context.save).not.toHaveBeenCalled();
});

it('uploads actual demo file bytes, edits metadata without replacement, archives/restores, and downloads after remount', async () => {
  const user = userEvent.setup();
  const view = render(<KnowledgeBasePage/>);
  const form = await prepareUpload(user);
  await user.click(form.getByRole('button', {name: 'Simpan dokumen'}));
  let detail = within(await screen.findByRole('dialog'));
  await detail.findByRole('button', {name: 'Unduh file asli'});
  const stored = boundary.context.data.knowledge_documents[0] as KnowledgeDocument;
  expect(stored.mime_type).toBe('application/pdf');
  expect(stored.storage_path.startsWith(`${DEMO_USER}/${stored.id}/`)).toBe(true);
  expect(boundary.files.has(stored.storage_path)).toBe(true);
  expect(boundary.upload).not.toHaveBeenCalled();

  await user.click(detail.getByRole('button', {name: 'Edit metadata'}));
  let editor = within(await screen.findByRole('dialog'));
  expect(editor.queryByLabelText('File dokumen')).toBeNull();
  await user.clear(editor.getByLabelText(/Versi dokumen/));
  await user.type(editor.getByLabelText(/Versi dokumen/), '2.0');
  await user.click(editor.getByRole('button', {name: 'Simpan metadata'}));
  detail = within(await screen.findByRole('dialog'));
  await user.click(await detail.findByRole('button', {name: 'Arsipkan'}));
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', {name: 'Arsipkan dokumen'}));
  detail = within(await screen.findByRole('dialog'));
  await user.click(await detail.findByRole('button', {name: 'Pulihkan'}));
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', {name: 'Pulihkan dokumen'}));
  detail = within(await screen.findByRole('dialog'));
  await detail.findByRole('button', {name: 'Arsipkan'});
  expect(boundary.context.data.knowledge_documents[0].status).toBe('active');
  expect(boundary.context.data.knowledge_documents[0].storage_path).toBe(stored.storage_path);
  expect(boundary.saveFile).toHaveBeenCalledTimes(1);
  expect(boundary.deleteFile).not.toHaveBeenCalled();

  view.unmount();
  render(<KnowledgeBasePage/>);
  await user.type(screen.getByRole('textbox', {name: 'Cari judul, tag, atau nama file…'}), 'Cardiac');
  expect(screen.getByRole('button', {name: 'Presentasi'})).toBeTruthy();
  let downloaded: Blob | undefined;
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {downloaded = blob as Blob; return 'blob:knowledge-test';});
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  await user.click(screen.getByRole('button', {name: 'Unduh Presentasi'}));
  await waitFor(() => expect(anchorClick).toHaveBeenCalledTimes(1));
  expect(await downloaded!.text()).toBe(PDF_CONTENT);
  expect(boundary.getFile).toHaveBeenCalledWith(stored.storage_path);
}, 20000);

it('applies the product shortcut when props change and preserves user document titles', async () => {
  const firstProduct = boundary.context.data.products[0].id;
  const secondProduct = boundary.context.data.products[1].id;
  boundary.context.data.knowledge_documents = [fixtureDocument({product_id: firstProduct}), fixtureDocument({id: demoId(9001), product_id: secondProduct, title: 'Panduan kedua'})];
  const view = render(<KnowledgeBasePage initialProductId={firstProduct}/>);
  expect(screen.getByRole('button', {name: 'Presentasi'})).toBeTruthy();
  expect(screen.queryByRole('button', {name: 'Panduan kedua'})).toBeNull();
  view.rerender(<KnowledgeBasePage initialProductId={secondProduct}/>);
  await waitFor(() => expect(screen.getByRole('button', {name: 'Panduan kedua'})).toBeTruthy());
  expect(screen.queryByRole('button', {name: 'Presentasi'})).toBeNull();
});

it('allows viewers to read and download while limiting metadata/archive actions to the author or manager', async () => {
  const user = userEvent.setup();
  boundary.context.data.knowledge_documents = [fixtureDocument()];
  boundary.context.profile = {...boundary.context.profile, role: 'viewer'};
  const view = render(<KnowledgeBasePage/>);
  expect(screen.queryByRole('button', {name: 'Unggah dokumen'})).toBeNull();
  await user.click(screen.getByRole('button', {name: 'Presentasi'}));
  let detail = within(await screen.findByRole('dialog'));
  expect(detail.getByRole('button', {name: 'Unduh file asli'})).toBeTruthy();
  expect(detail.queryByRole('button', {name: 'Edit metadata'})).toBeNull();
  expect(detail.queryByRole('button', {name: 'Arsipkan'})).toBeNull();
  boundary.context.profile = {...boundary.context.profile, id: demoId(2), role: 'product_specialist'};
  view.rerender(<KnowledgeBasePage/>);
  detail = within(screen.getByRole('dialog'));
  expect(detail.queryByRole('button', {name: 'Edit metadata'})).toBeNull();
  boundary.context.profile = {...boundary.context.profile, id: DEMO_USER};
  view.rerender(<KnowledgeBasePage/>);
  expect(within(screen.getByRole('dialog')).getByRole('button', {name: 'Edit metadata'})).toBeTruthy();
});

it('cleans only its newly uploaded unreferenced object when cloud metadata is rejected', async () => {
  const user = userEvent.setup();
  boundary.context.demo = false;
  boundary.context.save.mockRejectedValue(Error('Metadata rejected.'));
  render(<KnowledgeBasePage/>);
  const form = await prepareUpload(user);
  await user.click(form.getByRole('button', {name: 'Simpan dokumen'}));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Metadata rejected.'));
  const [path, , options] = boundary.upload.mock.calls[0];
  expect(path.split('/')).toHaveLength(3);
  expect(path.startsWith(`${DEMO_USER}/`)).toBe(true);
  expect(options).toEqual({upsert: false, contentType: 'application/pdf'});
  expect(boundary.fromTable).toHaveBeenCalledWith('knowledge_documents');
  expect(boundary.remove).toHaveBeenCalledExactlyOnceWith([path]);
  expect(screen.getByRole('dialog')).toBeTruthy();
});

it('retains an uploaded object when the metadata result cannot be verified', async () => {
  const user = userEvent.setup();
  boundary.context.demo = false;
  boundary.context.save.mockRejectedValue(Error('Connection lost.'));
  boundary.lookup.mockResolvedValue({data: null, error: Error('Lookup unavailable.')});
  render(<KnowledgeBasePage/>);
  const form = await prepareUpload(user);
  await user.click(form.getByRole('button', {name: 'Simpan dokumen'}));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Metadata belum terkonfirmasi.'));
  expect(boundary.remove).not.toHaveBeenCalled();
});

it('downloads from a private 60-second signed URL without opening an asynchronous popup', async () => {
  const user = userEvent.setup();
  boundary.context.demo = false;
  const document = fixtureDocument();
  boundary.context.data.knowledge_documents = [document];
  const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  const open = vi.spyOn(window, 'open');
  render(<KnowledgeBasePage/>);
  await user.click(screen.getByRole('button', {name: 'Unduh Presentasi'}));
  await waitFor(() => expect(anchorClick).toHaveBeenCalledTimes(1));
  expect(boundary.signed).toHaveBeenCalledWith(document.storage_path, 60, {download: document.file_name});
  expect(open).not.toHaveBeenCalled();
});
