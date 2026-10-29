import { useLayoutEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { CALLOUT_LABEL, CODE_LANGS, type Block, type CalloutKind } from "@/lib/notebook/model";
import { normalizeTitle, resolveReference } from "@/lib/notebook/references";
import { readImageFile } from "@/lib/notebook/persist";
import { useNotebook } from "@/lib/notebook/store";
import { Button } from "@/components/notebook/ui";

function MathHtml({ tex, display }: { tex: string; display: boolean }) {
  if (!tex.trim()) {
    return <p className="text-sm text-muted">اكتب معادلة LaTeX، مثل Av = \lambda v</p>;
  }
  const html = katex.renderToString(tex, { throwOnError: false, displayMode: display });
  return (
    <div
      dir="ltr"
      className="isolate-bidi math-scroll text-ink"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function AutoText({
  value,
  onChange,
  dir = "auto",
  mono = false,
  placeholder,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  dir?: "auto" | "ltr" | "rtl";
  mono?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      autoFocus={autoFocus}
      value={value}
      placeholder={placeholder}
      dir={dir}
      rows={1}
      onChange={(event) => onChange(event.target.value)}
      className={`w-full resize-none overflow-hidden bg-transparent text-ink placeholder:text-muted ${
        mono ? "isolate-bidi font-mono text-sm" : "text-pretty"
      }`}
    />
  );
}

function RichText({ text, references }: { text: string; references?: Record<string, string> }) {
  const pages = useNotebook((state) => state.pages);
  const openPage = useNotebook((state) => state.openPage);
  if (!text) return <span className="text-muted">اكتب هنا…</span>;
  const parts = text.split(/(\[\[[^\]\n]+\]\]|\$[^$\n]+\$)/g);
  return (
    <>
      {parts.map((part, index) => {
        const wiki = part.match(/^\[\[([^\]\n]+)\]\]$/);
        if (wiki) {
          const title = wiki[1]?.trim() ?? "";
          const targetId = references?.[normalizeTitle(title)];
          const target = targetId ? pages.find((page) => page.id === targetId) : resolveReference(pages, title);
          if (!target) {
            return (
              <span key={index} className="text-muted underline decoration-dotted underline-offset-4">
                {title}
              </span>
            );
          }
          return (
            <button
              key={index}
              type="button"
              className="text-accent underline decoration-accent/40 underline-offset-4"
              onClick={(event) => {
                event.stopPropagation();
                openPage(target.id);
              }}
            >
              {target.title}
            </button>
          );
        }
        const math = part.match(/^\$([^$\n]+)\$$/);
        if (math?.[1]) {
          const html = katex.renderToString(math[1], { throwOnError: false, displayMode: false });
          return (
            <span
              key={index}
              dir="ltr"
              className="isolate-bidi inline-block align-middle"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

function Toolbar({
  pageId,
  block,
}: {
  pageId: string;
  block: Block;
}) {
  const moveBlock = useNotebook((state) => state.moveBlock);
  const removeBlock = useNotebook((state) => state.removeBlock);
  return (
    <div className="absolute -top-4 end-0 z-10 flex flex-wrap gap-2 rounded-md border border-line bg-sheet shadow-sm">
      <Button variant="ghost" aria-label="تحريك لأعلى" onMouseDown={(event) => event.preventDefault()} onClick={() => moveBlock(pageId, block.id, -1)}>
        <ArrowUp className="size-4" />
      </Button>
      <Button variant="ghost" aria-label="تحريك لأسفل" onMouseDown={(event) => event.preventDefault()} onClick={() => moveBlock(pageId, block.id, 1)}>
        <ArrowDown className="size-4" />
      </Button>
      <Button variant="ghost" aria-label="حذف الكتلة" onMouseDown={(event) => event.preventDefault()} onClick={() => removeBlock(pageId, block.id)}>
        <Trash2 className="size-4" />
        حذف
      </Button>
    </div>
  );
}

export function BlockView({ pageId, block }: { pageId: string; block: Block }) {
  const updateBlock = useNotebook((state) => state.updateBlock);
  const addTask = useNotebook((state) => state.addTask);
  const updateTask = useNotebook((state) => state.updateTask);
  const removeTask = useNotebook((state) => state.removeTask);
  const setNotice = useNotebook((state) => state.setNotice);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(false);

  const showTools = editing || selected;

  return (
    <section
      className="relative border-b border-line/70 py-4"
      onFocus={() => setSelected(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setSelected(false);
          setEditing(false);
        }
      }}
    >
      {showTools ? <Toolbar pageId={pageId} block={block} /> : null}
      {block.type === "heading" ? (
        editing ? (
          <AutoText
            autoFocus
            value={block.text}
            placeholder="عنوان"
            onChange={(text) => updateBlock(pageId, { ...block, text })}
          />
        ) : (
          <h2>
            <button
              type="button"
              className="w-full text-start text-xl font-semibold text-balance"
              onClick={() => setEditing(true)}
            >
              {block.text || <span className="text-muted">عنوان</span>}
            </button>
          </h2>
        )
      ) : null}

      {block.type === "paragraph" ? (
        editing ? (
          <AutoText
            autoFocus
            value={block.text}
            placeholder="فقرة. المعادلة بين $دولارين$، والصفحة بين [[معقوفين]]."
            onChange={(text) => updateBlock(pageId, { ...block, text })}
          />
        ) : (
          <div
            dir="auto"
            role="button"
            tabIndex={0}
            aria-label="تعديل الفقرة"
            onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setEditing(true); } }}
            className="w-full cursor-text whitespace-pre-wrap text-start text-pretty leading-relaxed"
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest("button")) return;
              setEditing(true);
            }}
          >
            <RichText text={block.text} references={block.references} />
          </div>
        )
      ) : null}

      {block.type === "code" ? (
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm text-muted">
            لغة
            <select
              className="min-h-11 rounded-md border border-line bg-paper px-2 text-ink"
              value={block.lang}
              onChange={(event) => updateBlock(pageId, { ...block, lang: event.target.value })}
            >
              {CODE_LANGS.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </label>
          <div dir="ltr" className="isolate-bidi overflow-x-auto rounded-md border border-line bg-paper p-3">
            <AutoText mono dir="ltr" value={block.text} placeholder="code" onChange={(text) => updateBlock(pageId, { ...block, text })} />
          </div>
        </div>
      ) : null}

      {block.type === "math" ? (
        <div className="grid gap-3">
          <div dir="ltr" className="isolate-bidi rounded-md border border-line bg-paper p-3">
            <AutoText mono dir="ltr" value={block.tex} placeholder="E = mc^2" onChange={(tex) => updateBlock(pageId, { ...block, tex })} />
          </div>
          <MathHtml tex={block.tex} display />
        </div>
      ) : null}

      {block.type === "callout" ? (
        <div className="border-s-2 border-accent ps-4">
          <label className="mb-2 flex items-center gap-2 text-sm text-accent">
            <select
              aria-label="نوع الملاحظة"
              className="min-h-11 rounded-md border border-line bg-paper px-2 text-ink"
              value={block.kind}
              onChange={(event) => updateBlock(pageId, { ...block, kind: event.target.value as CalloutKind })}
            >
              {(Object.keys(CALLOUT_LABEL) as CalloutKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {CALLOUT_LABEL[kind]}
                </option>
              ))}
            </select>
          </label>
          <AutoText
            value={block.text}
            placeholder="اكتب الملاحظة"
            onChange={(text) => updateBlock(pageId, { ...block, text })}
          />
        </div>
      ) : null}

      {block.type === "tasks" ? (
        <ul className="grid gap-2">
          {block.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-3 size-5 accent-accent"
                checked={item.done}
                aria-label={item.done ? "سؤال محلول" : "سؤال مفتوح"}
                onChange={(event) => updateTask(pageId, block.id, item.id, { done: event.target.checked })}
              />
              <div className="min-w-0 flex-1">
                <AutoText
                  value={item.text}
                  placeholder="سؤال مفتوح"
                  onChange={(text) => updateTask(pageId, block.id, item.id, { text })}
                />
              </div>
              <Button variant="ghost" aria-label="حذف السؤال" onClick={() => removeTask(pageId, block.id, item.id)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
          <li>
            <Button variant="quiet" onClick={() => addTask(pageId, block.id)}>
              سؤال جديد
            </Button>
          </li>
        </ul>
      ) : null}

      {block.type === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {block.headers.map((header, col) => (
                  <th key={col} className="border border-line p-1">
                    <input
                      className="min-h-11 w-full min-w-24 bg-transparent px-2 text-ink"
                      value={header}
                      aria-label={`عمود ${col + 1}`}
                      onChange={(event) => {
                        const headers = block.headers.slice();
                        headers[col] = event.target.value;
                        updateBlock(pageId, { ...block, headers });
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, col) => (
                    <td key={col} className="border border-line p-1">
                      <input
                        className="min-h-11 w-full min-w-24 bg-transparent px-2 text-ink"
                        value={cell}
                        aria-label={`خلية ${rowIndex + 1}-${col + 1}`}
                        onChange={(event) => {
                          const rows = block.rows.map((line) => line.slice());
                          const line = rows[rowIndex];
                          if (!line) return;
                          line[col] = event.target.value;
                          updateBlock(pageId, { ...block, rows });
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              variant="quiet"
              onClick={() =>
                updateBlock(pageId, {
                  ...block,
                  rows: [...block.rows, block.headers.map(() => "")],
                })
              }
            >
              صف
            </Button>
            <Button
              variant="quiet"
              onClick={() =>
                updateBlock(pageId, {
                  ...block,
                  headers: [...block.headers, ""],
                  rows: block.rows.map((row) => [...row, ""]),
                })
              }
            >
              عمود
            </Button>
          </div>
        </div>
      ) : null}

      {block.type === "image" ? (
        <figure className="grid gap-3">
          {block.src ? (
            <img src={block.src} alt={block.alt || "صورة في الدرس"} className="max-h-96 w-full rounded-md object-contain" />
          ) : (
            <div className="rounded-md border border-dashed border-line px-4 py-6 text-sm text-muted">لا صورة بعد</div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-line bg-sheet px-3 text-sm">
              {block.src ? "استبدال الصورة" : "إضافة صورة"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  void readImageFile(file)
                    .then((image) => updateBlock(pageId, { ...block, src: image.src, alt: block.alt || image.alt }))
                    .catch((error: unknown) => {
                      setNotice(error instanceof Error ? error.message : "تعذر إضافة الصورة");
                    });
                }}
              />
            </label>
            <input
              className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-paper px-3 text-sm"
              value={block.alt}
              placeholder="وصف الصورة"
              onChange={(event) => updateBlock(pageId, { ...block, alt: event.target.value })}
            />
          </div>
        </figure>
      ) : null}
    </section>
  );
}

const ADDERS: { type: Block["type"]; label: string }[] = [
  { type: "paragraph", label: "فقرة" },
  { type: "heading", label: "عنوان" },
  { type: "code", label: "كود" },
  { type: "math", label: "معادلة" },
  { type: "table", label: "جدول" },
  { type: "image", label: "صورة" },
  { type: "callout", label: "ملاحظة" },
  { type: "tasks", label: "أسئلة" },
];

export function AddBlockBar({ pageId }: { pageId: string }) {
  const addBlock = useNotebook((state) => state.addBlock);
  return (
    <div className="flex flex-wrap gap-2 py-4">
      {ADDERS.map((item) => (
        <Button key={item.type} variant="quiet" onClick={() => addBlock(pageId, item.type)}>
          {item.label}
        </Button>
      ))}
    </div>
  );
}
