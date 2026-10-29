import { validateSnapshot } from "./schema";
import type { Persisted } from "./model";

/** Strict parsing: never discard records from a backup. */
export function sanitize(value: unknown): Persisted | null {
  try { return validateSnapshot(value); } catch { return null; }
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
