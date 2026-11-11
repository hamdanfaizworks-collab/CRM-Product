import {useEffect, useRef, useState, type FormEvent} from 'react';
import {Archive, BookOpen, CheckCircle2, Download, Edit3, FileText, Languages, LoaderCircle, Paperclip, RotateCcw, ShieldCheck, Upload, X} from 'lucide-react';
import {useCRM, supabase, friendlyError} from './store';
import {Badge, Dialog, Empty, PageHead, SearchToolbar} from './ui';
import {getLocale, tr, useLanguage} from './i18n';
import {displayDate, isManager} from './rules';
import type {KnowledgeDocument} from './types';
import {
  KNOWLEDGE_ACCEPT, KNOWLEDGE_BUCKET, deleteDemoKnowledgeFile, downloadKnowledgeBlob,
  getDemoKnowledgeFile, knowledgeFileDetails, saveDemoKnowledgeFile, triggerKnowledgeDownload,
} from './knowledge-files';

const DOCUMENT_TYPES: Record<KnowledgeDocument['document_type'], string> = {
  datasheet: 'Lembar data', brochure: 'Brosur', presentation: 'Materi presentasi',
  user_manual: 'Panduan pengguna', training: 'Materi training', other: 'Dokumen lainnya',
};
const DOCUMENT_LANGUAGES: Record<KnowledgeDocument['language'], string> = {
  en: 'Bahasa Inggris', id: 'Bahasa Indonesia', multilingual: 'Multibahasa',
};
interface DocumentDraft {
  source: KnowledgeDocument | null;
  title: string;
  product_id: string;
  document_type: KnowledgeDocument['document_type'] | '';
  description: string;
  version: string;
  language: KnowledgeDocument['language'] | '';
  tags: string;
  file: File | null;
}

function fileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toLocaleString(getLocale(), {maximumFractionDigits: 1})} MiB`;
  return `${Math.max(1, Math.ceil(bytes / 1024)).toLocaleString(getLocale())} KiB`;
}

function extension(fileName: string) {
  return fileName.split('.').pop()?.toUpperCase() || tr('File');
}

export function KnowledgeBasePage({initialProductId = 'all'}: {initialProductId?: string}) {
  useLanguage();
  const {data, profile, demo, save, notify, refresh} = useCRM();
  const [search, setSearch] = useState('');
  const [product, setProduct] = useState(initialProductId);
  const [type, setType] = useState('all');
  const [language, setLanguage] = useState('all');
  const [status, setStatus] = useState('active');
  const [detailId, setDetailId] = useState('');
  const [editor, setEditor] = useState<DocumentDraft | null>(null);
  const [confirmation, setConfirmation] = useState<KnowledgeDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {setProduct(initialProductId);}, [initialProductId]);

  const documents = data.knowledge_documents || [];
  const writable = profile.role !== 'viewer';
  const canManage = (document: KnowledgeDocument) => writable && (isManager(profile.role) || document.created_by === profile.id);
  const productName = (id: string | null) => id ? data.products.find(item => item.id === id)?.name || tr('Produk tidak ditemukan') : tr('Umum / lintas produk');
  const authorName = (id: string) => data.profiles.find(person => person.id === id)?.full_name || tr('Anggota tidak ditemukan');
  const normalizedSearch = search.trim().toLocaleLowerCase(getLocale());
  const rows = documents.filter(document =>
    (product === 'all' || product === 'general' && !document.product_id || document.product_id === product) &&
    (type === 'all' || document.document_type === type) &&
    (language === 'all' || document.language === language) &&
    (status === 'all' || document.status === status) &&
    (!normalizedSearch || [document.title, document.file_name, ...document.tags].some(value => value.toLocaleLowerCase(getLocale()).includes(normalizedSearch)))
  ).sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '') || a.title.localeCompare(b.title, getLocale()));
  const activeDocuments = documents.filter(document => document.status === 'active');
  const coveredProducts = new Set(activeDocuments.map(document => document.product_id).filter(Boolean)).size;
  const detail = documents.find(document => document.id === detailId);

  function newDocument() {
    setFormError('');
    setEditor({source: null, title: '', product_id: ['all', 'general'].includes(product) ? '' : product, document_type: '', description: '', version: '1.0', language: 'en', tags: '', file: null});
  }

  function editDocument(document: KnowledgeDocument) {
    if (!canManage(document)) return;
    setFormError('');
    setEditor({source: document, title: document.title, product_id: document.product_id || '', document_type: document.document_type, description: document.description, version: document.version, language: document.language, tags: document.tags.join(', '), file: null});
  }

  function chooseFile(file: File | undefined) {
    if (!file || !editor || editor.source || saving) return;
    try {
      knowledgeFileDetails(file);
      setEditor({...editor, file});
      setFormError('');
    } catch (error) {
      setEditor({...editor, file: null});
      setFormError(friendlyError(error));
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function download(document: KnowledgeDocument) {
    if (downloading) return;
    setDownloading(document.id);
    setError('');
    try {
      if (demo) {
        downloadKnowledgeBlob(await getDemoKnowledgeFile(document.storage_path), document.file_name);
      } else {
        if (!supabase) throw Error(tr('Konfigurasi Supabase belum tersedia.'));
        const {data: signed, error} = await supabase.storage.from(KNOWLEDGE_BUCKET).createSignedUrl(document.storage_path, 60, {download: document.file_name});
        if (error) throw error;
        if (!signed?.signedUrl) throw Error(tr('Tautan unduhan tidak tersedia. Coba kembali.'));
        triggerKnowledgeDownload(signed.signedUrl, document.file_name);
      }
    } catch (error) {
      setError(friendlyError(error));
    } finally {
      setDownloading('');
    }
  }

  // Verify the newly uploaded object is still unreferenced before removing it.
  // The database also protects referenced Storage objects with a restrictive FK.
  async function cleanupNewUpload(id: string, path: string): Promise<'removed' | 'linked' | 'unverified'> {
    if (!path.startsWith(`${profile.id}/${id}/`)) return 'unverified';
    if (demo) {
      try {await deleteDemoKnowledgeFile(path); return 'removed';} catch {return 'unverified';}
    }
    if (!supabase) return 'unverified';
    try {
      const {data: linked, error: lookupError} = await supabase.from('knowledge_documents').select('id,storage_path').eq('id', id).maybeSingle();
      if (lookupError) return 'unverified';
      if (linked) return linked.storage_path === path ? 'linked' : 'unverified';
      const {error: removalError} = await supabase.storage.from(KNOWLEDGE_BUCKET).remove([path]);
      return removalError ? 'unverified' : 'removed';
    } catch {return 'unverified';}
  }

  async function saveDocument(event: FormEvent) {
    event.preventDefault();
    if (!editor || saving) return;
    if (!writable || editor.source && !canManage(editor.source)) {setFormError(tr('Anda tidak memiliki izin untuk mengubah dokumen ini.')); return;}
    setFormError('');
    setSaving(true);
    let uploadedPath = '';
    const id = editor.source?.id || crypto.randomUUID();
    try {
      const tags = [...new Set(editor.tags.split(',').map(tag => tag.trim()).filter(Boolean))];
      const title = editor.title.trim();
      if (!title || !editor.document_type || !editor.language) throw Error(tr('Lengkapi judul, jenis dokumen, dan bahasa dokumen.'));
      if (!editor.version.trim()) throw Error(tr('Versi materi wajib diisi, maksimal 40 karakter.'));
      if (tags.length > 20 || tags.some(tag => tag.length > 60)) throw Error(tr('Gunakan maksimum 20 tag, masing-masing sampai 60 karakter.'));
      const metadata = {title, product_id: editor.product_id || null, document_type: editor.document_type, description: editor.description.trim(), version: editor.version.trim(), language: editor.language, tags};
      if (editor.source) {
        await save('knowledge_documents', {id, ...metadata});
      } else {
        if (!editor.file) throw Error(tr('Pilih file dokumen sebelum menyimpan.'));
        const {extension: safeExtension, mimeType} = knowledgeFileDetails(editor.file);
        const path = `${profile.id}/${id}/${crypto.randomUUID()}.${safeExtension}`;
        if (demo) await saveDemoKnowledgeFile(path, editor.file, mimeType);
        else {
          if (!supabase) throw Error(tr('Konfigurasi Supabase belum tersedia.'));
          const {error} = await supabase.storage.from(KNOWLEDGE_BUCKET).upload(path, editor.file, {upsert: false, contentType: mimeType});
          if (error) throw error;
        }
        uploadedPath = path;
        await save('knowledge_documents', {id, ...metadata, status: 'active', file_name: editor.file.name, storage_path: path, mime_type: mimeType, size_bytes: editor.file.size});
      }
      setEditor(null);
      setDetailId(id);
      notify(tr(demo ? 'Dokumen dan file tersimpan di sandbox browser ini.' : 'Dokumen berhasil disimpan.'));
    } catch (error) {
      if (uploadedPath) {
        const cleanup = await cleanupNewUpload(id, uploadedPath);
        if (cleanup === 'linked') {
          try {await refresh();} catch {/* The saved record can be loaded by the refresh action. */}
          setEditor(null);
          setDetailId(id);
          notify(tr('Dokumen telah tersimpan. Muat ulang daftar bila perubahan belum terlihat.'));
          return;
        }
        if (cleanup === 'unverified') {
          setFormError(tr('Metadata belum terkonfirmasi. File dipertahankan untuk mencegah penghapusan dokumen yang sudah tersimpan. Hubungi administrator sebelum mencoba ulang.') + ` ${friendlyError(error)}`);
          return;
        }
      }
      setFormError(friendlyError(error));
    } finally {setSaving(false);}
  }

  async function changeStatus() {
    if (!confirmation || saving || !canManage(confirmation)) return;
    setSaving(true);
    setError('');
    try {
      const nextStatus = confirmation.status === 'active' ? 'archived' : 'active';
      await save('knowledge_documents', {id: confirmation.id, status: nextStatus});
      setConfirmation(null);
      notify(tr(nextStatus === 'archived' ? 'Dokumen diarsipkan. File tetap tersimpan.' : 'Dokumen dipulihkan ke pustaka aktif.'));
    } catch (error) {setError(friendlyError(error));} finally {setSaving(false);}
  }

  const updateDraft = <K extends keyof DocumentDraft>(key: K, value: DocumentDraft[K]) => setEditor(current => current ? {...current, [key]: value} : current);
  const uploadButton = writable ? <button className="btn primary" onClick={newDocument}><Upload size={16}/>{tr('Unggah dokumen')}</button> : undefined;

  return <div className="knowledge-library">
    <PageHead eyebrow={tr('PRODUCT ENABLEMENT')} title={tr('Pustaka pengetahuan')} description={tr('Dokumen produk yang terorganisasi untuk presentasi, pembelajaran, dan dukungan tim.')} action={uploadButton}/>
    <section className="card knowledge-overview">
      <div className="knowledge-overview-copy"><span className="knowledge-overview-icon"><BookOpen size={27}/></span><div><h2>{tr('Referensi produk, satu tempat')}</h2><p>{tr('Temukan materi yang tepat, lihat versi dan bahasa, lalu unduh file aslinya.')}</p></div></div>
      <div className="knowledge-metrics"><div><strong>{activeDocuments.length}</strong><span>{tr('Dokumen aktif')}</span></div><div><strong>{coveredProducts}</strong><span>{tr('Produk dengan materi')}</span></div></div>
    </section>
    {demo && <div className="knowledge-demo-note"><ShieldCheck size={17}/><p>{tr('Dalam mode demo, file hanya tersimpan di browser dan perangkat ini. File tidak diunggah ke workspace TTM.')}</p></div>}
    <section className="card knowledge-results">
      <SearchToolbar search={search} setSearch={setSearch} placeholder={tr('Cari judul, tag, atau nama file…')}>
        <select aria-label={tr('Filter produk dokumen')} value={product} onChange={event => setProduct(event.target.value)}><option value="all">{tr('Semua produk')}</option><option value="general">{tr('Umum / lintas produk')}</option>{data.products.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select aria-label={tr('Filter jenis dokumen')} value={type} onChange={event => setType(event.target.value)}><option value="all">{tr('Semua jenis dokumen')}</option>{Object.entries(DOCUMENT_TYPES).map(([value, label]) => <option key={value} value={value}>{tr(label)}</option>)}</select>
        <select aria-label={tr('Filter bahasa dokumen')} value={language} onChange={event => setLanguage(event.target.value)}><option value="all">{tr('Semua bahasa')}</option>{Object.entries(DOCUMENT_LANGUAGES).map(([value, label]) => <option key={value} value={value}>{tr(label)}</option>)}</select>
        <select aria-label={tr('Filter status dokumen')} value={status} onChange={event => setStatus(event.target.value)}><option value="active">{tr('Aktif')}</option><option value="archived">{tr('Diarsipkan')}</option><option value="all">{tr('Semua status')}</option></select>
      </SearchToolbar>
      <div className="knowledge-list-heading"><span aria-live="polite">{tr('{{value0}} dokumen ditampilkan', {value0: rows.length})}</span><span><ShieldCheck size={13}/>{tr('Pustaka internal TTM')}</span></div>
      {error && <div className="form-error knowledge-error" role="alert">{error}<button className="icon-btn" aria-label={tr('Tutup pesan kesalahan')} onClick={() => setError('')}><X size={15}/></button></div>}
      {rows.length ? <div className="table-wrap"><table className="data-table knowledge-table"><thead><tr><th>{tr('Dokumen')}</th><th>{tr('Produk')}</th><th>{tr('Jenis & bahasa')}</th><th>{tr('Versi & pembaruan')}</th><th>{tr('File')}</th><th><span className="knowledge-sr-only">{tr('Aksi')}</span></th></tr></thead><tbody>{rows.map(document => <tr key={document.id}>
        <td><div className="knowledge-doc-cell"><span className={`knowledge-file-icon format-${extension(document.file_name).toLowerCase()}`}><FileText size={22}/><small>{extension(document.file_name)}</small></span><div className="knowledge-doc-summary"><button className="text-button knowledge-title" onClick={() => setDetailId(document.id)}><strong>{document.title}</strong></button>{document.status === 'archived' && <Badge value="inactive" label={tr('Diarsipkan')}/>}<p className="knowledge-description">{document.description || document.file_name}</p><div className="knowledge-tags">{document.tags.slice(0, 3).map(tag => <button key={tag} className="knowledge-tag" onClick={() => setSearch(tag)} aria-label={tr('Cari tag {{value0}}', {value0: tag})}>{tag}</button>)}{document.tags.length > 3 && <span className="muted">+{document.tags.length - 3}</span>}</div></div></div></td>
        <td><span className="knowledge-product-name">{productName(document.product_id)}</span></td>
        <td><span>{tr(DOCUMENT_TYPES[document.document_type])}</span><small className="muted">{tr(DOCUMENT_LANGUAGES[document.language])}</small></td>
        <td><span>{document.version || '—'}</span><small className="muted">{displayDate(document.updated_at || document.created_at)}</small></td>
        <td><span>{fileSize(document.size_bytes)}</span><small className="muted">{extension(document.file_name)}</small></td>
        <td><div className="inline-actions"><button className="btn secondary small" disabled={!!downloading} onClick={() => void download(document)} aria-label={tr('Unduh {{value0}}', {value0: document.title})}>{downloading === document.id ? <LoaderCircle className="spin" size={15}/> : <Download size={15}/>}<span>{tr('Unduh')}</span></button><button className="icon-btn" onClick={() => setDetailId(document.id)} aria-label={tr('Detail {{value0}}', {value0: document.title})}><BookOpen size={17}/></button></div></td>
      </tr>)}</tbody></table></div> : <Empty title={documents.length ? tr('Dokumen tidak ditemukan') : tr('Bangun pustaka produk tim Anda')} description={documents.length ? tr('Sesuaikan pencarian atau filter untuk menemukan materi yang Anda butuhkan.') : tr('Mulai dengan lembar data, brosur, presentasi, panduan pengguna, atau materi training yang telah diverifikasi.')} action={uploadButton}/>}
      <div className="card-foot"><span>{tr('PDF, Office, PNG, JPEG · maksimum 25 MiB per file')}</span><span>{writable ? tr('Kelola dokumen milik Anda; administrator dapat mengelola seluruh pustaka.') : tr('Akses baca dan unduh untuk anggota tim aktif.')}</span></div>
    </section>

    {detail && !editor && !confirmation && <Dialog title={detail.title} onClose={() => setDetailId('')} wide><div className="dialog-body knowledge-detail">
      <div className="knowledge-detail-header"><span className="knowledge-detail-icon"><FileText size={32}/><strong>{extension(detail.file_name)}</strong></span><div><div className="knowledge-detail-badges"><Badge value={detail.status === 'active' ? 'active' : 'inactive'} label={tr(detail.status === 'active' ? 'Aktif' : 'Diarsipkan')}/><span>{tr(DOCUMENT_TYPES[detail.document_type])}</span></div><p className="muted">{productName(detail.product_id)}</p><p className="knowledge-file-name">{detail.file_name}</p></div></div>
      {detail.description && <section className="knowledge-detail-section"><h3>{tr('Tentang dokumen')}</h3><p className="pre-wrap">{detail.description}</p></section>}
      <dl className="knowledge-detail-meta"><div><dt>{tr('Versi dokumen')}</dt><dd>{detail.version || tr('Tidak dicantumkan')}</dd></div><div><dt><Languages size={14}/>{tr('Bahasa dokumen')}</dt><dd>{tr(DOCUMENT_LANGUAGES[detail.language])}</dd></div><div><dt>{tr('Ukuran file')}</dt><dd>{fileSize(detail.size_bytes)}</dd></div><div><dt>{tr('Diunggah oleh')}</dt><dd>{authorName(detail.created_by)}</dd></div><div><dt>{tr('Tanggal unggah')}</dt><dd>{displayDate(detail.created_at)}</dd></div><div><dt>{tr('Terakhir diperbarui')}</dt><dd>{displayDate(detail.updated_at)}</dd></div></dl>
      {detail.tags.length > 0 && <section className="knowledge-detail-section"><h3>{tr('Tag dokumen')}</h3><div className="knowledge-tags">{detail.tags.map(tag => <span className="knowledge-tag" key={tag}>{tag}</span>)}</div></section>}
      <div className="knowledge-access-note"><ShieldCheck size={16}/><p>{tr(demo ? 'File demo diunduh dari penyimpanan browser ini.' : 'Dokumen disimpan privat. Tautan unduhan berlaku selama 60 detik.')}</p></div>
      {error && <div className="form-error" role="alert">{error}</div>}
    </div><div className="dialog-footer wrap knowledge-detail-actions">{canManage(detail) && <><button className="btn secondary" onClick={() => editDocument(detail)}><Edit3 size={15}/>{tr('Edit metadata')}</button><button className="btn secondary" onClick={() => {setError(''); setConfirmation(detail);}}>{detail.status === 'active' ? <Archive size={15}/> : <RotateCcw size={15}/>} {tr(detail.status === 'active' ? 'Arsipkan' : 'Pulihkan')}</button></>}<button className="btn primary" disabled={!!downloading} onClick={() => void download(detail)}>{downloading === detail.id ? <LoaderCircle className="spin" size={16}/> : <Download size={16}/>} {tr('Unduh file asli')}</button></div></Dialog>}

    {editor && <Dialog title={tr(editor.source ? 'Edit metadata dokumen' : 'Unggah dokumen produk')} onClose={() => {if (!saving) setEditor(null);}} wide><form onSubmit={event => void saveDocument(event)}>
      <div className="dialog-body knowledge-editor">
        {!editor.source ? <label className={`knowledge-dropzone ${editor.file ? 'has-file' : ''}`} onDragOver={event => event.preventDefault()} onDrop={event => {event.preventDefault(); chooseFile(event.dataTransfer.files[0]);}}><Upload size={26}/><strong>{editor.file?.name || tr('Pilih file atau letakkan di sini')}</strong><span>{editor.file ? `${fileSize(editor.file.size)} · ${extension(editor.file.name)}` : tr('PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, PNG, JPEG · maks. 25 MiB')}</span><input ref={fileInput} type="file" accept={KNOWLEDGE_ACCEPT} aria-label={tr('File dokumen')} disabled={saving} onChange={event => chooseFile(event.target.files?.[0])}/>{editor.file && <span className="knowledge-file-selected"><CheckCircle2 size={14}/>{tr('File dipilih')}</span>}</label> : <div className="knowledge-immutable-file"><Paperclip size={19}/><div><strong>{editor.source.file_name}</strong><p>{tr('File asli tidak diganti melalui edit metadata. Unggah dokumen baru untuk versi file berikutnya.')}</p></div></div>}
        <div className="form-grid">
          <label className="field full"><span>{tr('Judul dokumen')}<b className="required"> *</b></span><input autoFocus type="text" maxLength={200} required value={editor.title} disabled={saving} onChange={event => updateDraft('title', event.target.value)} placeholder={tr('Contoh: Panduan workflow produk')}/></label>
          <label className="field"><span>{tr('Produk terkait')}</span><select value={editor.product_id} disabled={saving} onChange={event => updateDraft('product_id', event.target.value)}><option value="">{tr('Umum / lintas produk')}</option>{data.products.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="field"><span>{tr('Jenis dokumen')}<b className="required"> *</b></span><select required value={editor.document_type} disabled={saving} onChange={event => updateDraft('document_type', event.target.value as DocumentDraft['document_type'])}><option value="">{tr('Pilih jenis dokumen')}</option>{Object.entries(DOCUMENT_TYPES).map(([value, label]) => <option key={value} value={value}>{tr(label)}</option>)}</select></label>
          <label className="field"><span>{tr('Versi dokumen')}<b className="required"> *</b></span><input required maxLength={40} value={editor.version} disabled={saving} onChange={event => updateDraft('version', event.target.value)} placeholder={tr('Contoh: 1.0 atau revisi 2026')}/></label>
          <label className="field"><span>{tr('Bahasa dokumen')}<b className="required"> *</b></span><select required value={editor.language} disabled={saving} onChange={event => updateDraft('language', event.target.value as DocumentDraft['language'])}><option value="">{tr('Pilih bahasa dokumen')}</option>{Object.entries(DOCUMENT_LANGUAGES).map(([value, label]) => <option key={value} value={value}>{tr(label)}</option>)}</select></label>
          <label className="field full"><span>{tr('Tag dokumen')}</span><input value={editor.tags} maxLength={1220} disabled={saving} onChange={event => updateDraft('tags', event.target.value)} placeholder={tr('Contoh: USG, workflow, onboarding')}/><small>{tr('Pisahkan dengan koma. Maksimum 20 tag, masing-masing 60 karakter.')}</small></label>
          <label className="field full"><span>{tr('Deskripsi dokumen')}</span><textarea rows={4} maxLength={5000} value={editor.description} disabled={saving} onChange={event => updateDraft('description', event.target.value)} placeholder={tr('Jelaskan isi dan tujuan penggunaan materi ini.')}/></label>
        </div>
        {formError && <div className="form-error" role="alert">{formError}</div>}
      </div><div className="dialog-footer"><button type="button" className="btn secondary" disabled={saving} onClick={() => setEditor(null)}>{tr('Batal')}</button><button type="submit" className="btn primary" disabled={saving}>{saving && <LoaderCircle className="spin" size={16}/>} {tr(editor.source ? 'Simpan metadata' : 'Simpan dokumen')}</button></div>
    </form></Dialog>}

    {confirmation && <Dialog title={tr(confirmation.status === 'active' ? 'Arsipkan dokumen?' : 'Pulihkan dokumen?')} onClose={() => {if (!saving) setConfirmation(null);}}><div className="dialog-body knowledge-confirmation"><strong>{confirmation.title}</strong><p>{tr(confirmation.status === 'active' ? 'Dokumen akan disembunyikan dari pustaka aktif. File dan metadata tetap tersimpan serta dapat dipulihkan.' : 'Dokumen akan kembali tampil dalam pustaka aktif dengan file dan metadata yang sama.')}</p>{error && <div className="form-error" role="alert">{error}</div>}</div><div className="dialog-footer"><button className="btn secondary" disabled={saving} onClick={() => setConfirmation(null)}>{tr('Batal')}</button><button className="btn primary" disabled={saving} onClick={() => void changeStatus()}>{saving && <LoaderCircle className="spin" size={16}/>} {tr(confirmation.status === 'active' ? 'Arsipkan dokumen' : 'Pulihkan dokumen')}</button></div></Dialog>}
  </div>;
}
