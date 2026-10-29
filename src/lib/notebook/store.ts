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
import { idbGet, idbSet, sanitize } from "@/lib/notebook/persist";
import { buildSeed } from "@/lib/notebook/seed";

type PagePatch = Partial<Pick<Page, "title" | "status" | "subject" | "source" | "studiedAt">>;

type NotebookState = Persisted & {
  ready: boolean;
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
  replaceAll: (data: Persisted) => void;
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
let lastPayload = "";

function queueSave(state: NotebookState) {
  if (!state.ready) return;
  const payload = pick(state);
  const json = JSON.stringify(payload);
  if (json === lastPayload) return;
  lastPayload = json;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void idbSet(payload);
  }, 200);
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

export const useNotebook = create<NotebookState>((set, get) => ({
  ...empty,
  ready: false,
  theme: "paper",
  notice: null,
  searchOpen: false,
  sidebarOpen: false,
  hydrate: () => {
    if (hydrateOnce) return hydrateOnce;
    hydrateOnce = (async () => {
      try {
        const stored = sanitize(await idbGet());
        const data = stored ?? sanitize(buildSeed())!;
        lastPayload = JSON.stringify(data);
        set({ ...data, ready: true, theme: readTheme() });
        if (!stored) await idbSet(data);
      } catch {
        const data = sanitize(buildSeed())!;
        set({
          ...data,
          ready: true,
          theme: "paper",
          notice: "تعذر فتح الحفظ المحلي، وهذه نسخة للتجربة.",
        });
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
      studiedAt: now.slice(0, 10),
      blocks: type === "lesson" ? lessonBlocks() : conceptBlocks(),
      createdAt: now,
      updatedAt: now,
    };
    set({ pages: [...get().pages, page], activePageId: page.id, view: "write", sidebarOpen: false });
    return page.id;
  },
  updatePage: (id, patch) => {
    set({
      pages: mapPage(get().pages, id, (page) => {
        const next = { ...patch };
        if (page.type !== "lesson") delete next.status;
        if (next.status && !isStatus(next.status)) delete next.status;
        return { ...page, ...next };
      }),
    });
  },
  removePage: (id) => {
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
        blocks: page.blocks.map((item) => (item.id === block.id ? block : item)),
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
  replaceAll: (data) => {
    lastPayload = "";
    set({ ...data, notice: "استُعيدت النسخة على هذا الجهاز." });
  },
}));

function isStatus(value: Status): boolean {
  return value === "started" || value === "need-understanding" || value === "understood" || value === "need-review";
}

useNotebook.subscribe((state) => queueSave(state));

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden") return;
    const state = useNotebook.getState();
    if (!state.ready) return;
    if (saveTimer) clearTimeout(saveTimer);
    const payload = pick(state);
    lastPayload = JSON.stringify(payload);
    void idbSet(payload);
  });
}

export function orderedNotebooks(notebooks: Notebook[]) {
  return byOrder(notebooks);
}

export function sectionsOf(sections: Section[], notebookId: string) {
  return byOrder(sections.filter((item) => item.notebookId === notebookId));
}

export function pagesOf(pages: Page[], sectionId: string) {
  return pages.filter((page) => page.sectionId === sectionId);
}
