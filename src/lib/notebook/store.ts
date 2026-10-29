import { create } from "zustand";
import {
  byOrder,
  conceptBlocks,
  createBlock,
  lessonBlocks,
  uid,
  type Block,
  type Link,
  type Notebook,
  type Page,
  type Persisted,
  type Section,
  type Status,
  type TaskItem,
  type ThemeName,
  type View,
} from "@/lib/notebook/model";
import { validateSnapshot } from "./schema";
import { readSnapshot, SaveQueue, StorageConflict } from "./storage";
import { bindPageReferences, localStudyDate } from "./references";
import { buildSeed } from "@/lib/notebook/seed";

type PagePatch = Partial<Pick<Page, "title" | "status" | "subject" | "source" | "studiedAt">>;

type NotebookState = Persisted & {
  ready: boolean;
  loadError: string | null;
  readOnly: boolean;
  busy: boolean;
  saveStatus: "saved" | "pending" | "saving" | "error" | "conflict";
  saveError: string | null;
  canUndo: boolean;
  rollbackAvailable: boolean;
  retryLoad: () => Promise<void>;
  flush: () => Promise<boolean>;
  restore: (data: unknown) => Promise<void>;
  rollback: () => Promise<void>;
  undo: () => void;
  theme: ThemeName;
  notice: string | null;
  searchOpen: boolean;
  sidebarOpen: boolean;
  hydrate: () => Promise<void>;
  setTheme: (theme: ThemeName) => void;
  setView: (view: View) => void;
  setNotice: (notice: string | null) => void;
  setSearchOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  openPage: (id: string) => void;
  addNotebook: (title: string) => void;
  renameNotebook: (id: string, title: string) => void;
  removeNotebook: (id: string) => void;
  addSection: (notebookId: string, title: string) => void;
  renameSection: (id: string, title: string) => void;
  removeSection: (id: string) => void;
  addPage: (input: { notebookId: string; sectionId: string; type: Page["type"] }) => string;
  updatePage: (id: string, patch: PagePatch) => void;
  removePage: (id: string) => void;
  updateBlock: (pageId: string, block: Block) => void;
  addBlock: (pageId: string, type: Block["type"]) => void;
  moveBlock: (pageId: string, blockId: string, dir: -1 | 1) => void;
  removeBlock: (pageId: string, blockId: string) => void;
  addTask: (pageId: string, blockId: string) => void;
  updateTask: (pageId: string, blockId: string, taskId: string, patch: Partial<TaskItem>) => void;
  removeTask: (pageId: string, blockId: string, taskId: string) => void;
  linkPages: (a: string, b: string) => void;
  unlink: (linkId: string) => void;
};

function stamp(page: Page): Page {
  return { ...page, updatedAt: new Date().toISOString() };
}

function mapPage(pages: Page[], id: string, fn: (page: Page) => Page): Page[] {
  return pages.map((page) => (page.id === id ? stamp(fn(page)) : page));
}

function nextOrder(items: { order: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.order), -1) + 1;
}

function uniqueTitle(pages: Page[], base: string): string {
  const names = new Set(pages.map((page) => page.title));
  if (!names.has(base)) return base;
  let n = 2;
  while (names.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}

function readTheme(): ThemeName {
  try {
    return localStorage.getItem("midad-theme") === "ink" ? "ink" : "paper";
  } catch {
    return "paper";
  }
}

function pick(state: NotebookState): Persisted {
  return {
    version: 1,
    notebooks: state.notebooks,
    sections: state.sections,
    pages: state.pages,
    links: state.links,
    activePageId: state.activePageId,
    view: state.view,
  };
}

let hydrateOnce: Promise<void> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let writer: SaveQueue | null = null;
let savedJson = "";
let activeFlush: Promise<boolean> | null = null;
let undoSnapshot: Persisted | null = null;
let deletionPending = false;

function queueSave(state: NotebookState) {
  if (!state.ready || state.loadError || state.readOnly || state.busy) return;
  if (JSON.stringify(pick(state)) === savedJson) return;
  if (saveTimer) clearTimeout(saveTimer);
  useNotebook.setState({ saveStatus: "pending" });
  saveTimer = setTimeout(() => { void flush(); }, 200);
}

async function flush(): Promise<boolean> {
  if (saveTimer) clearTimeout(saveTimer);
  if (activeFlush) return activeFlush;
  activeFlush = (async () => {
    const initial = useNotebook.getState();
    if (!writer || !initial.ready || initial.loadError || initial.readOnly) return false;
    while (true) {
      const data = pick(useNotebook.getState());
      const json = JSON.stringify(data);
      if (json === savedJson) { useNotebook.setState({ saveStatus: "saved", saveError: null }); return true; }
      useNotebook.setState({ saveStatus: "saving", saveError: null });
      try {
        await writer.commit(data);
        savedJson = json;
      } catch (error) {
        const conflict = error instanceof StorageConflict;
        useNotebook.setState({ saveStatus: conflict ? "conflict" : "error", readOnly: conflict,
          saveError: error instanceof Error ? error.message : "تعذر الحفظ. نزّل نسخة من تعديلاتك." });
        return false;
      }
    }
  })();
  try { return await activeFlush; } finally { activeFlush = null; }
}

function rememberDeletion() {
  undoSnapshot = pick(useNotebook.getState());
  deletionPending = true;
  useNotebook.setState({ canUndo: true });
}

async function restore(data: unknown) {
  const incoming = validateSnapshot(data);
  const state = useNotebook.getState();
  if (state.busy || state.readOnly || state.loadError || !writer) throw new Error("الحفظ غير متاح الآن.");
  useNotebook.setState({ busy: true });
  try {
    if (!await flush()) throw new Error("احفظ تعديلاتك أو نزّل نسخة منها قبل الاستعادة.");
    const before = pick(useNotebook.getState());
    await writer.commit(incoming, before);
    savedJson = JSON.stringify(incoming);
    undoSnapshot = null;
    useNotebook.setState({ ...incoming, canUndo: false, rollbackAvailable: true, saveStatus: "saved", saveError: null,
      notice: "استُعيدت النسخة وحُفظت. يمكنك الرجوع إلى ما قبل الاستعادة." });
  } catch (error) {
    if (error instanceof StorageConflict) useNotebook.setState({ readOnly: true, saveStatus: "conflict", saveError: error.message });
    throw error;
  } finally { useNotebook.setState({ busy: false }); }
}

const empty: Persisted = {
  version: 1,
  notebooks: [],
  sections: [],
  pages: [],
  links: [],
  activePageId: null,
  view: "write",
};

export const useNotebook = create<NotebookState>((rawSet, get) => {
  const set = (patch: Partial<NotebookState>) => {
    const state = get();
    const contentChange = ["notebooks", "sections", "pages", "links"].some((key) => key in patch);
    if (contentChange && (!state.ready || state.loadError || state.readOnly || state.busy)) return;
    if (contentChange) {
      if (deletionPending) deletionPending = false;
      else if (undoSnapshot) { undoSnapshot = null; patch.canUndo = false; }
    }
    rawSet(patch);
  };
  return ({
  ...empty,
  ready: false,
  loadError: null,
  readOnly: false,
  busy: false,
  saveStatus: "saved",
  saveError: null,
  canUndo: false,
  rollbackAvailable: false,
  flush,
  restore,
  rollback: async () => {
    const stored = await readSnapshot();
    if (!stored.rollback) throw new Error("لا توجد نسخة قبل الاستعادة.");
    await restore(stored.rollback);
  },
  undo: () => {
    if (!undoSnapshot || get().readOnly || get().busy || get().loadError) return;
    const data = undoSnapshot;
    undoSnapshot = null;
    set({ ...data, canUndo: false, notice: "أُلغي آخر حذف." });
  },
  retryLoad: async () => {
    hydrateOnce = null;
    await get().hydrate();
  },
  theme: "paper",
  notice: null,
  searchOpen: false,
  sidebarOpen: false,
  hydrate: () => {
    if (hydrateOnce) return hydrateOnce;
    hydrateOnce = (async () => {
      undoSnapshot = null;
      deletionPending = false;
      rawSet({ ready: false, loadError: null, canUndo: false });
      try {
        const stored = await readSnapshot();
        const data = validateSnapshot(stored.data === null ? buildSeed() : stored.data);
        writer = new SaveQueue(stored.revision);
        if (stored.data === null) await writer.commit(data);
        savedJson = JSON.stringify(data);
        let rollbackAvailable = false;
        try { rollbackAvailable = stored.rollback !== null && !!validateSnapshot(stored.rollback); } catch { /* preserve unreadable rollback */ }
        rawSet({ ...data, ready: true, readOnly: false, loadError: null, saveStatus: "saved", saveError: null,
          theme: readTheme(), rollbackAvailable });
      } catch (error) {
        writer = null;
        rawSet({ ready: true, readOnly: true, loadError: error instanceof Error ? error.message : "تعذر فتح الدفتر. لم تتغير بياناتك." });
      }
    })();
    return hydrateOnce;
  },
  setTheme: (theme) => set({ theme }),
  setView: (view) => set({ view }),
  setNotice: (notice) => set({ notice }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  openPage: (id) => set({ activePageId: id, view: "write", searchOpen: false, sidebarOpen: false }),
  addNotebook: (title) => {
    const name = title.trim();
    if (!name) return;
    const notebook: Notebook = { id: uid(), title: name, order: nextOrder(get().notebooks) };
    set({ notebooks: [...get().notebooks, notebook] });
  },
  renameNotebook: (id, title) => {
    const name = title.trim();
    if (!name) return;
    set({ notebooks: get().notebooks.map((item) => (item.id === id ? { ...item, title: name } : item)) });
  },
  removeNotebook: (id) => {
    rememberDeletion();
    const sections = get().sections.filter((item) => item.notebookId !== id);
    const sectionIds = new Set(sections.map((item) => item.id));
    const pages = get().pages.filter((page) => page.notebookId !== id);
    const pageIds = new Set(pages.map((page) => page.id));
    const links = get().links.filter((link) => pageIds.has(link.fromPageId) && pageIds.has(link.toPageId));
    const active = get().activePageId;
    set({
      notebooks: get().notebooks.filter((item) => item.id !== id),
      sections: sections.filter((item) => sectionIds.has(item.id)),
      pages,
      links,
      activePageId: active && pageIds.has(active) ? active : (pages[0]?.id ?? null),
    });
  },
  addSection: (notebookId, title) => {
    const name = title.trim();
    if (!name) return;
    const section: Section = {
      id: uid(),
      notebookId,
      title: name,
      order: nextOrder(get().sections.filter((item) => item.notebookId === notebookId)),
    };
    set({ sections: [...get().sections, section] });
  },
  renameSection: (id, title) => {
    const name = title.trim();
    if (!name) return;
    set({ sections: get().sections.map((item) => (item.id === id ? { ...item, title: name } : item)) });
  },
  removeSection: (id) => {
    rememberDeletion();
    const pages = get().pages.filter((page) => page.sectionId !== id);
    const pageIds = new Set(pages.map((page) => page.id));
    const active = get().activePageId;
    set({
      sections: get().sections.filter((item) => item.id !== id),
      pages,
      links: get().links.filter((link) => pageIds.has(link.fromPageId) && pageIds.has(link.toPageId)),
      activePageId: active && pageIds.has(active) ? active : (pages[0]?.id ?? null),
    });
  },
  addPage: ({ notebookId, sectionId, type }) => {
    const now = new Date().toISOString();
    const page: Page = {
      id: uid(),
      notebookId,
      sectionId,
      type,
      title: uniqueTitle(get().pages, type === "lesson" ? "درس جديد" : "مفهوم جديد"),
      status: type === "lesson" ? "started" : null,
      subject: "",
      source: "",
      studiedAt: localStudyDate(),
      blocks: type === "lesson" ? lessonBlocks() : conceptBlocks(),
      createdAt: now,
      updatedAt: now,
    };
    set({ pages: [...get().pages, page], activePageId: page.id, view: "write", sidebarOpen: false });
    return page.id;
  },
  updatePage: (id, patch) => {
    const bound = get().pages.map((page) => ({ ...page, blocks: page.blocks.map((block) => bindPageReferences(block, get().pages)) }));
    set({
      pages: mapPage(bound, id, (page) => {
        const next = { ...patch };
        if (page.type !== "lesson") delete next.status;
        if (next.status && !isStatus(next.status)) delete next.status;
        return { ...page, ...next };
      }),
    });
  },
  removePage: (id) => {
    rememberDeletion();
    const pages = get().pages.filter((page) => page.id !== id);
    const active = get().activePageId;
    set({
      pages,
      links: get().links.filter((link) => link.fromPageId !== id && link.toPageId !== id),
      activePageId: active === id ? (pages[0]?.id ?? null) : active,
    });
  },
  updateBlock: (pageId, block) => {
    set({
      pages: mapPage(get().pages, pageId, (page) => ({
        ...page,
        blocks: page.blocks.map((item) => (item.id === block.id ? bindPageReferences(block, get().pages) : item)),
      })),
    });
  },
  addBlock: (pageId, type) => {
    const block = createBlock(type);
    set({
      pages: mapPage(get().pages, pageId, (page) => ({ ...page, blocks: [...page.blocks, block] })),
    });
  },
  moveBlock: (pageId, blockId, dir) => {
    set({
      pages: mapPage(get().pages, pageId, (page) => {
        const index = page.blocks.findIndex((block) => block.id === blockId);
        const target = index + dir;
        if (index < 0 || target < 0 || target >= page.blocks.length) return page;
        const blocks = page.blocks.slice();
        const [item] = blocks.splice(index, 1);
        if (!item) return page;
        blocks.splice(target, 0, item);
        return { ...page, blocks };
      }),
    });
  },
  removeBlock: (pageId, blockId) => {
    rememberDeletion();
    set({
      pages: mapPage(get().pages, pageId, (page) => ({
        ...page,
        blocks: page.blocks.filter((block) => block.id !== blockId),
      })),
    });
  },
  addTask: (pageId, blockId) => {
    set({
      pages: mapPage(get().pages, pageId, (page) => ({
        ...page,
        blocks: page.blocks.map((block) =>
          block.type === "tasks" && block.id === blockId
            ? { ...block, items: [...block.items, { id: uid(), text: "", done: false }] }
            : block,
        ),
      })),
    });
  },
  updateTask: (pageId, blockId, taskId, patch) => {
    set({
      pages: mapPage(get().pages, pageId, (page) => ({
        ...page,
        blocks: page.blocks.map((block) =>
          block.type === "tasks" && block.id === blockId
            ? {
                ...block,
                items: block.items.map((item) => (item.id === taskId ? { ...item, ...patch } : item)),
              }
            : block,
        ),
      })),
    });
  },
  removeTask: (pageId, blockId, taskId) => {
    rememberDeletion();
    set({
      pages: mapPage(get().pages, pageId, (page) => ({
        ...page,
        blocks: page.blocks.map((block) =>
          block.type === "tasks" && block.id === blockId
            ? { ...block, items: block.items.filter((item) => item.id !== taskId) }
            : block,
        ),
      })),
    });
  },
  linkPages: (a, b) => {
    if (a === b) return;
    const exists = get().links.some(
      (link) =>
        (link.fromPageId === a && link.toPageId === b) || (link.fromPageId === b && link.toPageId === a),
    );
    if (exists) return;
    const link: Link = { id: uid(), fromPageId: a, toPageId: b };
    set({ links: [...get().links, link] });
  },
  unlink: (linkId) => set({ links: get().links.filter((link) => link.id !== linkId) }),
  });
});

function isStatus(value: Status): boolean {
  return value === "started" || value === "need-understanding" || value === "understood" || value === "need-review";
}

useNotebook.subscribe((state, previous) => {
  if (state.notebooks !== previous.notebooks || state.sections !== previous.sections || state.pages !== previous.pages ||
      state.links !== previous.links || state.activePageId !== previous.activePageId || state.view !== previous.view) queueSave(state);
});

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
  window.addEventListener("beforeunload", (event) => {
    const state = useNotebook.getState();
    if (state.ready && !state.loadError && JSON.stringify(pick(state)) !== savedJson) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
}

export function exportSnapshot(): Persisted { return pick(useNotebook.getState()); }

export function orderedNotebooks(notebooks: Notebook[]) {
  return byOrder(notebooks);
}

export function sectionsOf(sections: Section[], notebookId: string) {
  return byOrder(sections.filter((item) => item.notebookId === notebookId));
}

export function pagesOf(pages: Page[], sectionId: string) {
  return pages.filter((page) => page.sectionId === sectionId);
}
