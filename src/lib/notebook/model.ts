export type PageType = "lesson" | "concept";

export type Status = "started" | "need-understanding" | "understood" | "need-review";

export type CalloutKind = "idea" | "mistake" | "unclear" | "summary";

export type TaskItem = {
  id: string;
  text: string;
  done: boolean;
};

export type ParagraphBlock = { id: string; type: "paragraph"; text: string; references?: Record<string, string> };
export type HeadingBlock = { id: string; type: "heading"; text: string; level: 2 | 3 };
export type CodeBlock = { id: string; type: "code"; text: string; lang: string };
export type MathBlock = { id: string; type: "math"; tex: string };
export type ImageBlock = { id: string; type: "image"; src: string; alt: string };
export type TableBlock = { id: string; type: "table"; headers: string[]; rows: string[][] };
export type CalloutBlock = { id: string; type: "callout"; kind: CalloutKind; text: string; references?: Record<string, string> };
export type TasksBlock = { id: string; type: "tasks"; items: TaskItem[] };

export type Block =
  | ParagraphBlock
  | HeadingBlock
  | CodeBlock
  | MathBlock
  | ImageBlock
  | TableBlock
  | CalloutBlock
  | TasksBlock;

export type Notebook = {
  id: string;
  title: string;
  order: number;
};

export type Section = {
  id: string;
  notebookId: string;
  title: string;
  order: number;
};

export type Page = {
  id: string;
  notebookId: string;
  sectionId: string;
  type: PageType;
  title: string;
  status: Status | null;
  subject: string;
  source: string;
  studiedAt: string;
  blocks: Block[];
  createdAt: string;
  updatedAt: string;
};

export type Link = {
  id: string;
  fromPageId: string;
  toPageId: string;
};

export type View = "write" | "review";

export type ThemeName = "paper" | "ink";

export type Persisted = {
  version: 1;
  notebooks: Notebook[];
  sections: Section[];
  pages: Page[];
  links: Link[];
  activePageId: string | null;
  view: View;
};

export const STATUSES: Status[] = ["started", "need-understanding", "understood", "need-review"];

export const STATUS_LABEL: Record<Status, string> = {
  started: "بدأت",
  "need-understanding": "أحتاج فهماً",
  understood: "فهمت",
  "need-review": "أحتاج مراجعة",
};

export const TYPE_LABEL: Record<PageType, string> = {
  lesson: "درس",
  concept: "مفهوم",
};

export const CALLOUT_LABEL: Record<CalloutKind, string> = {
  idea: "فكرة",
  mistake: "خطأ وقعت فيه",
  unclear: "لم أفهم بعد",
  summary: "خلاصة",
};

export const CODE_LANGS = ["python", "text", "javascript", "sql", "bash"] as const;

export function uid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createBlock(type: Block["type"]): Block {
  const id = uid();
  switch (type) {
    case "paragraph":
      return { id, type, text: "" };
    case "heading":
      return { id, type, text: "", level: 2 };
    case "code":
      return { id, type, text: "", lang: "python" };
    case "math":
      return { id, type, tex: "" };
    case "image":
      return { id, type, src: "", alt: "" };
    case "table":
      return { id, type, headers: ["", ""], rows: [["", ""]] };
    case "callout":
      return { id, type, kind: "idea", text: "" };
    case "tasks":
      return { id, type, items: [{ id: uid(), text: "", done: false }] };
  }
}

function heading(text: string): HeadingBlock {
  return { id: uid(), type: "heading", text, level: 2 };
}

function paragraph(): ParagraphBlock {
  return { id: uid(), type: "paragraph", text: "" };
}

export function lessonBlocks(): Block[] {
  return [
    heading("الفكرة الأساسية"),
    paragraph(),
    heading("التعريفات والقوانين"),
    paragraph(),
    createBlock("math"),
    heading("مثال"),
    paragraph(),
    heading("أخطاء وقعت فيها"),
    { id: uid(), type: "callout", kind: "mistake", text: "" },
    heading("لم أفهم بعد"),
    { id: uid(), type: "callout", kind: "unclear", text: "" },
    heading("أسئلة لاختبار الفهم"),
    createBlock("tasks"),
    heading("خلاصة المراجعة"),
    { id: uid(), type: "callout", kind: "summary", text: "" },
  ];
}

export function conceptBlocks(): Block[] {
  return [
    heading("التعريف"),
    paragraph(),
    createBlock("math"),
    heading("أين يظهر"),
    paragraph(),
    heading("مثال قصير"),
    paragraph(),
    heading("خلاصة"),
    { id: uid(), type: "callout", kind: "summary", text: "" },
  ];
}

export function byOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}
