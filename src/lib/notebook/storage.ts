import type { Persisted } from "./model";

export class StorageConflict extends Error {
  constructor() { super("حُفظ تعديل من نافذة أخرى. نزّل تعديلاتك قبل إعادة فتح الدفتر."); }
}
export type StoredSnapshot = { data: unknown; revision: number; rollback: unknown };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("الحفظ المحلي غير متاح في هذا المتصفح.")); return; }
    const request = indexedDB.open("midad", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("kv")) request.result.createObjectStore("kv");
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("أغلق نوافذ مداد الأخرى ثم أعد المحاولة."));
  });
}

export async function readSnapshot(): Promise<StoredSnapshot> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("kv", "readonly");
      const store = tx.objectStore("kv");
      const data = store.get("state");
      const revision = store.get("revision");
      const rollback = store.get("rollback");
      tx.oncomplete = () => {
        const current = revision.result ?? 0;
        if (!Number.isSafeInteger(current) || current < 0) { reject(new Error("تعذر قراءة إصدار الحفظ. بياناتك لم تتغير.")); return; }
        resolve({ data: data.result ?? null, revision: current, rollback: rollback.result ?? null });
      };
      tx.onerror = tx.onabort = () => reject(tx.error ?? new Error("تعذر قراءة الدفتر."));
    });
  } finally { db.close(); }
}

/** Compare and write in ONE transaction; legacy snapshots start at revision 0. */
export async function commitSnapshot(data: Persisted, expected: number, rollback?: Persisted): Promise<number> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("kv", "readwrite");
      const store = tx.objectStore("kv");
      let conflict = false;
      const request = store.get("revision");
      request.onsuccess = () => {
        if ((request.result ?? 0) !== expected) { conflict = true; tx.abort(); return; }
        store.put(data, "state");
        store.put(expected + 1, "revision");
        if (rollback !== undefined) store.put(rollback, "rollback");
      };
      tx.oncomplete = () => resolve(expected + 1);
      tx.onerror = tx.onabort = () => reject(conflict ? new StorageConflict() : tx.error ?? new Error("تعذر إتمام الحفظ."));
    });
  } finally { db.close(); }
}

/** Serial writer: an acknowledged revision always means a completed transaction. */
export class SaveQueue {
  private tail: Promise<void> = Promise.resolve();
  revision: number;
  private write: typeof commitSnapshot;
  constructor(revision: number, write: typeof commitSnapshot = commitSnapshot) { this.revision = revision; this.write = write; }
  commit(data: Persisted, rollback?: Persisted): Promise<void> {
    const operation = this.tail.then(async () => { this.revision = await this.write(data, this.revision, rollback); });
    this.tail = operation.catch(() => {});
    return operation;
  }
}
