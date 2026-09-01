import type { RegionType } from '../messages';

export type HistoryRecord = {
  id: string;
  title: string;
  url: string;
  createdAt: number;
  regionType: RegionType;
  visionEnabled: boolean;
  markdown: string;
};

const DB_NAME = 'html2md';
const STORE = 'records';
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function canonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.href;
  } catch {
    return url;
  }
}

export function matchesQuery(record: HistoryRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [record.title, record.url, record.markdown].some((s) => s.toLowerCase().includes(q));
}

export function overflowIds(records: Pick<HistoryRecord, 'id' | 'createdAt'>[], limit: number): string[] {
  if (records.length <= limit) return [];
  return [...records]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, records.length - limit)
    .map((r) => r.id);
}

const DAY_MS = 86_400_000;

export function expiredIds(
  records: Pick<HistoryRecord, 'id' | 'createdAt'>[],
  maxAgeDays: number,
  now = Date.now(),
): string[] {
  if (maxAgeDays <= 0) return [];
  const cutoff = now - maxAgeDays * DAY_MS;
  return records.filter((r) => r.createdAt < cutoff).map((r) => r.id);
}

export async function findLatestByUrl(url: string): Promise<HistoryRecord | null> {
  if (!url) return null;
  const key = canonicalUrl(url);
  const rows = await listRecords();
  return rows.find((r) => canonicalUrl(r.url) === key) ?? null;
}

export async function listRecords(): Promise<HistoryRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const rows = (req.result as HistoryRecord[]).sort((a, b) => b.createdAt - a.createdAt);
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function addRecord(
  input: Omit<HistoryRecord, 'id' | 'createdAt'> & { createdAt?: number },
  limit: number,
): Promise<HistoryRecord> {
  const record: HistoryRecord = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: input.createdAt ?? Date.now(),
  };
  const db = await openDb();
  const existing = await listRecords();
  const doomed = overflowIds([...existing, record], limit);
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  store.put(record);
  for (const id of doomed) store.delete(id);
  await txDone(tx);
  return record;
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
}

export async function clearRecords(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).clear();
  await txDone(tx);
}

export async function pruneOldRecords(maxAgeDays: number): Promise<void> {
  if (maxAgeDays <= 0) return;
  const existing = await listRecords();
  const doomed = expiredIds(existing, maxAgeDays);
  if (doomed.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  for (const id of doomed) store.delete(id);
  await txDone(tx);
}
