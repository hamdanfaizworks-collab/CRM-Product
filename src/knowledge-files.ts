import {tr} from './i18n';

export const KNOWLEDGE_BUCKET = 'product-knowledge';
export const MAX_KNOWLEDGE_BYTES = 25 * 1024 * 1024;
export const KNOWLEDGE_ACCEPT = '.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

export function knowledgeFileDetails(file: File) {
  const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  const mimeType = MIME_BY_EXTENSION[extension];
  if (!mimeType) throw Error(tr('Gunakan PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, PNG, atau JPEG.'));
  if (!file.size) throw Error(tr('File kosong tidak dapat diunggah.'));
  if (file.size > MAX_KNOWLEDGE_BYTES) throw Error(tr('Ukuran file maksimum 25 MiB.'));
  return {extension, mimeType};
}

interface StoredKnowledgeFile {
  storage_path: string;
  bytes: ArrayBuffer;
  mime_type: string;
}
const DB_NAME = 'ttm.crm.knowledge.files.v1';
const STORE_NAME = 'files';

function openFiles(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(Error(tr('Penyimpanan file demo tidak tersedia. Izinkan penyimpanan browser atau gunakan browser lain.')));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, {keyPath: 'storage_path'});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(Error(tr('Penyimpanan file demo gagal dibuka. Periksa izin dan ruang penyimpanan browser.')));
    request.onblocked = () => reject(Error(tr('Penyimpanan file demo sedang digunakan tab lain. Tutup tab demo lain lalu coba kembali.')));
  });
}

async function fileTransaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const database = await openFiles();
  return new Promise<T>((resolve, reject) => {
    let result: T;
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => {result = request.result as T;};
    } catch (error) {
      database.close();
      reject(error);
      return;
    }
    transaction.oncomplete = () => {database.close(); resolve(result);};
    const failed = () => {
      database.close();
      reject(Error(tr('File demo tidak tersimpan. Periksa ruang penyimpanan dan izin browser.')));
    };
    transaction.onabort = failed;
    transaction.onerror = failed;
  });
}

export async function saveDemoKnowledgeFile(path: string, file: File, mimeType: string) {
  const record: StoredKnowledgeFile = {storage_path: path, bytes: await file.arrayBuffer(), mime_type: mimeType};
  await fileTransaction('readwrite', store => store.put(record));
}

export async function getDemoKnowledgeFile(path: string): Promise<Blob> {
  const record = await fileTransaction<StoredKnowledgeFile | undefined>('readonly', store => store.get(path));
  if (!record) throw Error(tr('File demo tidak ditemukan di browser ini. Unggah kembali file dari perangkat yang sama.'));
  return new Blob([record.bytes], {type: record.mime_type});
}

export async function deleteDemoKnowledgeFile(path: string) {
  await fileTransaction('readwrite', store => store.delete(path));
}

/** Used only by an explicit reset of the sandbox, never for cloud Storage. */
export async function clearDemoKnowledgeFiles() {
  if (typeof indexedDB === 'undefined') return;
  await fileTransaction('readwrite', store => store.clear());
}

export function triggerKnowledgeDownload(url: string, fileName: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener noreferrer';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

export function downloadKnowledgeBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  triggerKnowledgeDownload(url, fileName);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
