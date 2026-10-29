import {
  STATUSES,
  type Block,
  type CalloutKind,
  type Link,
  type Notebook,
  type Page,
  type Persisted,
  type Section,
  type TaskItem,
  type View,
} from "@/lib/notebook/model";

const DB_NAME = "midad";
const STORE = "kv";
const KEY = "state";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbGet(): Promise<unknown> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function idbSet(value: Persisted): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const CALLOUTS = new Set<CalloutKind>(["idea", "mistake", "unclear", "summary"]);
const BLOCK_TYPES = new Set(["paragraph", "heading", "code", "math", "image", "table", "callout", "tasks"]);

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function cleanBlock(value: unknown): Block | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Block> & { id?: unknown };
  if (typeof raw.id !== "string" || typeof raw.type !== "string" || !BLOCK_TYPES.has(raw.type)) return null;
  const id = raw.id;
  switch (raw.type) {
    case "paragraph":
      return { id, type: "paragraph", text: asString((raw as { text?: unknown }).text) };
    case "heading": {
      const level = (raw as { level?: unknown }).level === 3 ? 3 : 2;
      return { id, type: "heading", text: asString((raw as { text?: unknown }).text), level };
    }
    case "code":
      return {
        id,
        type: "code",
        text: asString((raw as { text?: unknown }).text),
        lang: asString((raw as { lang?: unknown }).lang) || "text",
      };
    case "math":
      return { id, type: "math", tex: asString((raw as { tex?: unknown }).tex) };
    case "image":
      return {
        id,
        type: "image",
        src: asString((raw as { src?: unknown }).src),
        alt: asString((raw as { alt?: unknown }).alt),
      };
    case "callout": {
      const kind = (raw as { kind?: unknown }).kind;
      return {
        id,
        type: "callout",
        kind: CALLOUTS.has(kind as CalloutKind) ? (kind as CalloutKind) : "idea",
        text: asString((raw as { text?: unknown }).text),
      };
    }
    case "tasks": {
      const items = Array.isArray((raw as { items?: unknown }).items)
        ? ((raw as { items: unknown[] }).items
            .map((item): TaskItem | null => {
              if (!item || typeof item !== "object") return null;
              const row = item as Partial<TaskItem>;
              if (typeof row.id !== "string") return null;
              return { id: row.id, text: asString(row.text), done: Boolean(row.done) };
            })
            .filter(Boolean) as TaskItem[])
        : [];
      return { id, type: "tasks", items: items.length ? items : [{ id: `${id}-t`, text: "", done: false }] };
    }
    case "table": {
      const headersIn = (raw as { headers?: unknown }).headers;
      const headers = Array.isArray(headersIn) ? headersIn.map((cell) => asString(cell)) : [];
      if (!headers.length) return null;
      const rowsIn = (raw as { rows?: unknown }).rows;
      const rows = Array.isArray(rowsIn)
        ? rowsIn.map((row) => {
            const cells = Array.isArray(row) ? row.map((cell) => asString(cell)) : [];
            while (cells.length < headers.length) cells.push("");
            return cells.slice(0, headers.length);
          })
        : [];
      return { id, type: "table", headers, rows: rows.length ? rows : [headers.map(() => "")] };
    }
    default:
      return null;
  }
}

function cleanPage(value: unknown): Page | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Page>;
  if (typeof raw.id !== "string" || typeof raw.title !== "string") return null;
  if (raw.type !== "lesson" && raw.type !== "concept") return null;
  if (typeof raw.notebookId !== "string" || typeof raw.sectionId !== "string") return null;
  const blocks = Array.isArray(raw.blocks) ? (raw.blocks.map(cleanBlock).filter(Boolean) as Block[]) : [];
  const status = raw.type === "lesson" && STATUSES.includes(raw.status as never) ? raw.status! : raw.type === "lesson" ? "started" : null;
  const now = new Date().toISOString();
  return {
    id: raw.id,
    notebookId: raw.notebookId,
    sectionId: raw.sectionId,
    type: raw.type,
    title: raw.title,
    status,
    subject: asString(raw.subject),
    source: asString(raw.source),
    studiedAt: asString(raw.studiedAt),
    blocks,
    createdAt: asString(raw.createdAt) || now,
    updatedAt: asString(raw.updatedAt) || now,
  };
}

export function sanitize(value: unknown): Persisted | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Persisted>;
  if (raw.version !== 1) return null;
  if (!Array.isArray(raw.notebooks) || !Array.isArray(raw.sections) || !Array.isArray(raw.pages) || !Array.isArray(raw.links)) {
    return null;
  }
  const notebooks = raw.notebooks
    .filter((item): item is Notebook => !!item && typeof item.id === "string" && typeof item.title === "string")
    .map((item, index) => ({ id: item.id, title: item.title, order: Number.isFinite(item.order) ? item.order : index }));
  const notebookIds = new Set(notebooks.map((item) => item.id));
  const sections = raw.sections
    .filter(
      (item): item is Section =>
        !!item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.notebookId === "string" &&
        notebookIds.has(item.notebookId),
    )
    .map((item, index) => ({
      id: item.id,
      notebookId: item.notebookId,
      title: item.title,
      order: Number.isFinite(item.order) ? item.order : index,
    }));
  const sectionIds = new Set(sections.map((item) => item.id));
  const pages = (raw.pages.map(cleanPage).filter(Boolean) as Page[]).filter(
    (page) => notebookIds.has(page.notebookId) && sectionIds.has(page.sectionId),
  );
  const pageIds = new Set(pages.map((page) => page.id));
  const links = raw.links.filter(
    (item): item is Link =>
      !!item &&
      typeof item.id === "string" &&
      typeof item.fromPageId === "string" &&
      typeof item.toPageId === "string" &&
      pageIds.has(item.fromPageId) &&
      pageIds.has(item.toPageId) &&
      item.fromPageId !== item.toPageId,
  );
  const view: View = raw.view === "review" ? "review" : "write";
  const activePageId = typeof raw.activePageId === "string" && pageIds.has(raw.activePageId) ? raw.activePageId : (pages[0]?.id ?? null);
  return { version: 1, notebooks, sections, pages, links, activePageId, view };
}

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function readImageFile(file: File): Promise<{ src: string; alt: string }> {
  if (!file.type.startsWith("image/")) throw new Error("الملف ليس صورة");
  if (file.size > 12 * 1024 * 1024) throw new Error("الصورة أكبر من ١٢ ميغابايت");
  if (file.type === "image/svg+xml") {
    const text = await file.text();
    return { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`, alt: file.name };
  }
  const bitmap = await createImageBitmap(file);
  const max = 1280;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذر قراءة الصورة");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return { src: canvas.toDataURL("image/jpeg", 0.82), alt: file.name };
}
