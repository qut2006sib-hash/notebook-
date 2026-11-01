import { normalizeTitle, referencedPages, resolveReference } from "./references";
import {
  CALLOUT_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  type Block,
  type Link,
  type Page,
  type TaskItem,
} from "@/lib/notebook/model";

export function normalizeArabic(input: string): string {
  return normalizeTitle(input);
}

export function blockPlain(block: Block): string {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "code":
    case "callout":
      return block.text;
    case "math":
      return block.tex;
    case "image":
      return block.alt;
    case "table":
      return [...block.headers, ...block.rows.flat()].join(" ");
    case "tasks":
      return block.items.map((item) => item.text).join("\n");
  }
}

export function pageText(page: Page): string {
  return page.blocks.map(blockPlain).join("\n");
}

const WIKI = /\[\[([^\]\n]{1,160})\]\]/g;

export function wikiTitles(text: string): string[] {
  return [...text.matchAll(WIKI)].map((match) => match[1]?.trim() ?? "").filter(Boolean);
}

export function findPageByTitle(pages: Page[], title: string): Page | undefined {
  return resolveReference(pages, title);
}

export type Related = {
  page: Page;
  via: "link" | "mention";
  linkId?: string;
};

export function relatedPages(page: Page, pages: Page[], links: Link[]): Related[] {
  const found = new Map<string, Related>();
  for (const link of links) {
    const otherId =
      link.fromPageId === page.id ? link.toPageId : link.toPageId === page.id ? link.fromPageId : null;
    if (!otherId || otherId === page.id) continue;
    const other = pages.find((item) => item.id === otherId);
    if (!other) continue;
    found.set(other.id, { page: other, via: "link", linkId: link.id });
  }

  for (const other of page.blocks.flatMap((block) => referencedPages(block, pages))) {
    if (other.id !== page.id && !found.has(other.id)) found.set(other.id, { page: other, via: "mention" });
  }
  for (const other of pages) {
    if (other.id !== page.id && other.blocks.some((block) => referencedPages(block, pages).some((target) => target.id === page.id))) {
      if (!found.has(other.id)) found.set(other.id, { page: other, via: "mention" });
    }
  }
  return [...found.values()];
}

export type SearchHit = {
  page: Page;
  inTitle: boolean;
  snippet: string;
};

export function searchPages(pages: Page[], query: string): SearchHit[] {
  const q = normalizeArabic(query);
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const page of pages) {
    const inTitle = normalizeArabic(page.title).includes(q);
    const inMeta = normalizeArabic(`${page.subject} ${page.source}`).includes(q);
    const body = pageText(page);
    const inBody = normalizeArabic(body).includes(q);
    if (!inTitle && !inMeta && !inBody) continue;
    const line = body.split(/\n+/).find((row) => normalizeArabic(row).includes(q)) ?? "";
    hits.push({
      page,
      inTitle,
      snippet: (line || body).trim().slice(0, 180),
    });
  }
  hits.sort((a, b) => Number(b.inTitle) - Number(a.inTitle) || a.page.title.localeCompare(b.page.title, "ar"));
  return hits;
}

export type OpenTask = {
  page: Page;
  blockId: string;
  item: TaskItem;
};

export function openTasks(pages: Page[]): OpenTask[] {
  const out: OpenTask[] = [];
  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.type !== "tasks") continue;
      for (const item of block.items) {
        if (!item.done && item.text.trim()) out.push({ page, blockId: block.id, item });
      }
    }
  }
  return out;
}

export function pageToMarkdown(page: Page, pages: Page[], links: Link[]): string {
  const related = relatedPages(page, pages, links).map((item) => item.page.title);
  const lines: string[] = [`# ${page.title}`, ""];
  lines.push(`- النوع: ${TYPE_LABEL[page.type]}`);
  if (page.status) lines.push(`- الحالة: ${STATUS_LABEL[page.status]}`);
  if (page.subject) lines.push(`- المادة: ${page.subject}`);
  if (page.studiedAt) lines.push(`- تاريخ الدراسة: ${page.studiedAt}`);
  if (page.source) lines.push(`- المصدر: ${page.source}`);
  if (related.length) lines.push(`- صفحات مرتبطة: ${related.join("، ")}`);
  lines.push("");
  for (const block of page.blocks) {
    lines.push(blockToMarkdown(block), "");
  }
  return lines.join("\n").trim() + "\n";
}

function blockToMarkdown(block: Block): string {
  switch (block.type) {
    case "heading":
      return `${"#".repeat(block.level)} ${block.text}`;
    case "paragraph":
      return block.text;
    case "code":
      return "\x60".repeat(Math.max(3, ...[...block.text.matchAll(/\x60+/g)].map((match) => match[0].length + 1))) + block.lang + "\n" + block.text + "\n" + "\x60".repeat(Math.max(3, ...[...block.text.matchAll(/\x60+/g)].map((match) => match[0].length + 1)));
    case "math":
      return "$$\n" + block.tex + "\n$$";
    case "image":
      return `![${block.alt}](${block.src})`;
    case "callout":
      return `> **${CALLOUT_LABEL[block.kind]}:** ${block.text}`;
    case "tasks":
      return block.items.map((item) => `- [${item.done ? "x" : " "}] ${item.text}`).join("\n");
    case "table": {
      const escape = (cell: string) => cell.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
      const head = `| ${block.headers.map(escape).join(" | ")} |`;
      const rule = `| ${block.headers.map(() => "---").join(" | ")} |`;
      const rows = block.rows.map((row) => `| ${row.map(escape).join(" | ")} |`);
      return [head, rule, ...rows].join("\n");
    }
  }
}

export function safeFileName(title: string, ext: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|]/g, " ").trim() || "صفحة";
  return `${cleaned}.${ext}`;
}
