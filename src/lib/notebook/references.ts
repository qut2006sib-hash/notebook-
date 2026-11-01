import type { Block, Page } from "./model";

export function normalizeTitle(input: string): string {
  return input.toLowerCase().replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();
}

export function resolveReference(pages: Page[], text: string): Page | undefined {
  if (text.startsWith("id:")) return pages.find((page) => page.id === text.slice(3).split("|")[0]);
  const matches = pages.filter((page) => normalizeTitle(page.title) === normalizeTitle(text));
  return matches.length === 1 ? matches[0] : undefined;
}

export function bindPageReferences(block: Block, pages: Page[]): Block {
  if (block.type !== "paragraph" && block.type !== "callout") return block;
  const references: Record<string, string> = Object.create(null);
  for (const match of block.text.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
    const title = match[1]!.trim();
    const key = normalizeTitle(title);
    const existing = block.references && Object.hasOwn(block.references, key) ? block.references[key] : undefined;
    const target = existing ?? resolveReference(pages, title)?.id;
    if (target) references[key] = target;
  }
  return { ...block, references };
}

export function referencedPages(block: Block, pages: Page[]): Page[] {
  if (block.type !== "paragraph" && block.type !== "callout") return [];
  return [...block.text.matchAll(/\[\[([^\]\n]+)\]\]/g)].flatMap((match) => {
    const title = match[1]!.trim();
    const targetId = block.references?.[normalizeTitle(title)];
    const target = targetId ? pages.find((page) => page.id === targetId) : resolveReference(pages, title);
    return target ? [target] : [];
  });
}

export function localStudyDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
