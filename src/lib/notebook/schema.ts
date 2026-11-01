import { z } from "zod";
import type { Persisted } from "./model";

const id = z.string().min(1);
const task = z.object({ id, text: z.string(), done: z.boolean() }).strict();
const block = z.discriminatedUnion("type", [
  z.object({ id, type: z.literal("paragraph"), text: z.string(), references: z.record(z.string(), id).optional() }).strict(),
  z.object({ id, type: z.literal("heading"), text: z.string(), level: z.union([z.literal(2), z.literal(3)]) }).strict(),
  z.object({ id, type: z.literal("code"), text: z.string(), lang: z.string() }).strict(),
  z.object({ id, type: z.literal("math"), tex: z.string() }).strict(),
  z.object({ id, type: z.literal("image"), src: z.string(), alt: z.string() }).strict(),
  z.object({ id, type: z.literal("table"), headers: z.array(z.string()).min(1), rows: z.array(z.array(z.string())) }).strict(),
  z.object({ id, type: z.literal("callout"), kind: z.enum(["idea", "mistake", "unclear", "summary"]), text: z.string(), references: z.record(z.string(), id).optional() }).strict(),
  z.object({ id, type: z.literal("tasks"), items: z.array(task) }).strict(),
]);
const snapshot = z.object({
  version: z.literal(1),
  notebooks: z.array(z.object({ id, title: z.string(), order: z.number().finite() }).strict()),
  sections: z.array(z.object({ id, notebookId: id, title: z.string(), order: z.number().finite() }).strict()),
  pages: z.array(z.object({
    id, notebookId: id, sectionId: id, type: z.enum(["lesson", "concept"]), title: z.string(),
    status: z.enum(["started", "need-understanding", "understood", "need-review"]).nullable(),
    subject: z.string(), source: z.string(), studiedAt: z.string(), blocks: z.array(block),
    createdAt: z.string(), updatedAt: z.string(),
  }).strict()),
  links: z.array(z.object({ id, fromPageId: id, toPageId: id }).strict()),
  activePageId: id.nullable(), view: z.enum(["write", "review"]),
}).strict();

export function validateSnapshot(value: unknown): Persisted {
  const result = snapshot.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`نسخة غير صالحة: ${issue?.path.join(".") || "الملف"}. لم تُحذف أي بيانات.`);
  }
  const data = result.data;
  const allIds = new Set<string>();
  const unique = (value: string) => {
    if (allIds.has(value)) throw new Error(`معرّف مكرر في النسخة: ${value}`);
    allIds.add(value);
  };
  const notebooks = new Set(data.notebooks.map((row) => row.id));
  const sections = new Map(data.sections.map((row) => [row.id, row.notebookId]));
  const pages = new Set(data.pages.map((row) => row.id));
  for (const row of data.notebooks) unique(row.id);
  for (const row of data.sections) {
    unique(row.id);
    if (!notebooks.has(row.notebookId)) throw new Error("قسم يشير إلى دفتر غير موجود.");
  }
  for (const page of data.pages) {
    unique(page.id);
    if (!notebooks.has(page.notebookId) || sections.get(page.sectionId) !== page.notebookId) {
      throw new Error("الدرس والقسم لا ينتميان إلى الدفتر نفسه.");
    }
    if ((page.type === "concept" && page.status !== null) || (page.type === "lesson" && page.status === null)) {
      throw new Error("حالة الصفحة لا توافق نوعها.");
    }
    for (const row of page.blocks) {
      unique(row.id);
      if (row.type === "tasks") for (const item of row.items) unique(item.id);
      if (row.type === "table" && row.rows.some((cells) => cells.length !== row.headers.length)) {
        throw new Error("عدد خلايا الجدول لا يوافق عدد الأعمدة.");
      }
    }
  }
  const pairs = new Set<string>();
  for (const link of data.links) {
    unique(link.id);
    const pair = [link.fromPageId, link.toPageId].sort().join("\u0000");
    if (!pages.has(link.fromPageId) || !pages.has(link.toPageId) || link.fromPageId === link.toPageId || pairs.has(pair)) {
      throw new Error("رابط مكرر أو يشير إلى صفحة غير موجودة.");
    }
    pairs.add(pair);
  }
  if (data.activePageId !== null && !pages.has(data.activePageId)) throw new Error("الصفحة المفتوحة غير موجودة في النسخة.");
  return data;
}
