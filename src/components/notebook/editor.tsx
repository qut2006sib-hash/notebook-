import { useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { STATUSES, STATUS_LABEL, TYPE_LABEL, type Block } from "@/lib/notebook/model";
import { useNotebook } from "@/lib/notebook/store";
import { AddBlockBar, BlockView } from "@/components/notebook/blocks";
import { Relations } from "@/components/notebook/relations";
import { Button, Field, fieldClass } from "@/components/notebook/ui";

const BLOCK_LABEL: Record<Block["type"], string> = { paragraph: "فقرة", heading: "عنوان", code: "كود", math: "معادلة", image: "صورة", table: "جدول", callout: "ملاحظة", tasks: "أسئلة" };

export function Editor() {
  const pages = useNotebook((state) => state.pages);
  const home = useNotebook((state) => state.home);
  const notebooks = useNotebook((state) => state.notebooks);
  const sections = useNotebook((state) => state.sections);
  const activePageId = useNotebook((state) => state.activePageId);
  const updatePage = useNotebook((state) => state.updatePage);
  const newPage = useNotebook((state) => state.newPage);
  const openPage = useNotebook((state) => state.openPage);
  const moveBlock = useNotebook((state) => state.moveBlock);
  const removeBlock = useNotebook((state) => state.removeBlock);
  const [focusedBlock, setFocusedBlock] = useState<string | null>(null);
  const page = home ? undefined : pages.find((item) => item.id === activePageId);

  if (!page) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold">مساحة لأفكارك</h1>
        <p className="mt-3 text-muted">ابدأ بعنوان، ثم أضف ما تحتاجه.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="solid" onClick={() => newPage("lesson")}>صفحة جديدة</Button>
          <Button onClick={() => newPage("concept")}>مفهوم جديد</Button>
        </div>
        {pages.length ? <section className="mt-12">
          <h2 className="text-sm text-muted">ملاحظاتك المحفوظة</h2>
          <ul className="mt-3 grid gap-2">
            {[...pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6).map((item) => <li key={item.id}>
              <button type="button" className="min-h-11 text-start text-lg hover:text-accent" onClick={() => openPage(item.id)}>{item.title || "صفحة بلا عنوان"}</button>
            </li>)}
          </ul>
        </section> : null}
      </main>
    );
  }

  const notebook = notebooks.find((item) => item.id === page.notebookId);
  const section = sections.find((item) => item.id === page.sectionId);
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-6 sm:px-8">
      <article className="rounded-md border border-line bg-sheet px-5 py-6 sm:px-12">
        <input
          className="w-full bg-transparent text-3xl font-semibold text-ink"
          autoFocus={!page.title && page.blocks.length === 0}
          value={page.title} placeholder={page.type === "concept" ? "عنوان المفهوم" : "عنوان الصفحة"}
          aria-label="عنوان الصفحة" dir="auto"
          onChange={(event) => updatePage(page.id, { title: event.target.value })}
        />
        <details className="mt-3 text-sm text-muted">
          <summary className="min-h-9 cursor-pointer py-2">تفاصيل الصفحة</summary>
          <p className="my-3">{notebook?.title} · {section?.title} · {TYPE_LABEL[page.type]}</p>
          {page.type === "lesson" ? <div role="radiogroup" aria-label="حالة الدرس" className="mb-3 flex flex-wrap gap-2">
            {STATUSES.map((status) => <button key={status} type="button" role="radio" aria-checked={page.status === status}
              className={`min-h-11 rounded-md px-3 ${page.status === status ? "bg-accent-soft text-accent" : "text-muted"}`}
              onClick={() => updatePage(page.id, { status })}>{STATUS_LABEL[status]}</button>)}
          </div> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="المادة"><input className={fieldClass} value={page.subject} onChange={(event) => updatePage(page.id, { subject: event.target.value })} /></Field>
            <Field label="المصدر"><input className={fieldClass} value={page.source} onChange={(event) => updatePage(page.id, { source: event.target.value })} /></Field>
            <Field label="تاريخ الدراسة"><input type="date" className={fieldClass} value={page.studiedAt} onChange={(event) => updatePage(page.id, { studiedAt: event.target.value })} /></Field>
          </div>
        </details>
        <div className="mt-6 min-h-40">
          {page.blocks.map((block) => <BlockView key={block.id} pageId={page.id} block={block} focusOnMount={focusedBlock === block.id} />)}
        </div>
        <div className="border-t border-line pt-3">
          <p className="text-xs text-muted">أضف إلى الصفحة</p>
          <AddBlockBar pageId={page.id} onAdded={setFocusedBlock} />
        </div>
        {page.blocks.length ? <details className="mt-6 border-t border-line pt-3 text-sm text-muted">
          <summary className="min-h-11 cursor-pointer py-3">إدارة العناصر</summary>
          <p className="mb-3">التحريك والحذف من هنا فقط. يمكنك التراجع عن آخر حذف قبل أي تعديل جديد.</p>
          <ol className="grid gap-2">
            {page.blocks.map((block, index) => <li key={block.id} className="flex items-center justify-between gap-3 rounded-md border border-line p-2">
              <span>{index + 1}. {BLOCK_LABEL[block.type]}</span>
              <div className="flex gap-1">
                <Button variant="ghost" disabled={index === 0} aria-label={`تحريك العنصر ${index + 1} لأعلى`} onClick={() => moveBlock(page.id, block.id, -1)}><ArrowUp className="size-4" /></Button>
                <Button variant="ghost" disabled={index === page.blocks.length - 1} aria-label={`تحريك العنصر ${index + 1} لأسفل`} onClick={() => moveBlock(page.id, block.id, 1)}><ArrowDown className="size-4" /></Button>
                <Button variant="ghost" aria-label={`حذف العنصر ${index + 1}`} onClick={() => removeBlock(page.id, block.id)}><Trash2 className="size-4" /></Button>
              </div>
            </li>)}
          </ol>
        </details> : null}
      </article>
      <details className="text-sm text-muted"><summary className="min-h-11 cursor-pointer py-3">روابط الصفحة وتصديرها</summary><div className="rounded-md border border-line bg-sheet p-4"><Relations pageId={page.id} /></div></details>
    </div>
  );
}
