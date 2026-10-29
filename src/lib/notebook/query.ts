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
  return input
    .toLowerCase()
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
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
  const key = normalizeArabic(title);
  return pages.find((page) => normalizeArabic(page.title) === key);
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

  const mention = (other: Page, title: string) => {
    if (other.id === page.id || found.has(other.id)) return;
    if (normalizeArabic(other.title) !== normalizeArabic(title)) return;
    found.set(other.id, { page: other, via: "mention" });
  };

  for (const title of wikiTitles(pageText(page))) {
    const hit = findPageByTitle(pages, title);
    if (hit) mention(hit, hit.title);
  }
  for (const other of pages) {
    if (wikiTitles(pageText(other)).some((title) => normalizeArabic(title) === normalizeArabic(page.title))) {
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
      return "```" + block.lang + "\n" + block.text + "\n```";
    case "math":
      return "$$\n" + block.tex + "\n$$";
    case "image":
      return `![${block.alt}](${block.src})`;
    case "callout":
      return `> **${CALLOUT_LABEL[block.kind]}:** ${block.text}`;
    case "tasks":
      return block.items.map((item) => `- [${item.done ? "x" : " "}] ${item.text}`).join("\n");
    case "table": {
      const head = `| ${block.headers.join(" | ")} |`;
      const rule = `| ${block.headers.map(() => "---").join(" | ")} |`;
      const rows = block.rows.map((row) => `| ${row.join(" | ")} |`);
      return [head, rule, ...rows].join("\n");
    }
  }
}

export function safeFileName(title: string, ext: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|]/g, " ").trim() || "صفحة";
  return `${cleaned}.${ext}`;
}
