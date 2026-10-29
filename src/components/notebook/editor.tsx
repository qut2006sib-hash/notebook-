import { STATUSES, STATUS_LABEL, TYPE_LABEL } from "@/lib/notebook/model";
import { useNotebook } from "@/lib/notebook/store";
import { AddBlockBar, BlockView } from "@/components/notebook/blocks";
import { Relations } from "@/components/notebook/relations";
import { Field, fieldClass } from "@/components/notebook/ui";

export function Editor() {
  const pages = useNotebook((state) => state.pages);
  const notebooks = useNotebook((state) => state.notebooks);
  const sections = useNotebook((state) => state.sections);
  const activePageId = useNotebook((state) => state.activePageId);
  const updatePage = useNotebook((state) => state.updatePage);
  const page = pages.find((item) => item.id === activePageId);
  if (!page) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-balance">لا صفحة مفتوحة</h1>
          <p className="mt-2 text-muted">أنشئ درساً أو مفهوماً من الدفتر.</p>
        </div>
      </div>
    );
  }
  const notebook = notebooks.find((item) => item.id === page.notebookId);
  const section = sections.find((item) => item.id === page.sectionId);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-6 sm:px-8">
      <article className="relative rounded-md border border-line bg-sheet px-5 py-6 sm:px-12">
        <div className="pointer-events-none absolute inset-y-0 start-8 hidden w-px bg-accent/40 sm:block" aria-hidden />
        <p className="text-sm text-muted">
          {notebook?.title ?? "دفتر"}
          {" · "}
          {section?.title ?? "قسم"}
          {" · "}
          {TYPE_LABEL[page.type]}
        </p>
        <input
          className="mt-3 w-full bg-transparent text-3xl font-semibold text-balance text-ink"
          value={page.title}
          aria-label="عنوان الصفحة"
          onChange={(event) => updatePage(page.id, { title: event.target.value })}
          onBlur={(event) => {
            const title = event.target.value.trim();
            if (!title) updatePage(page.id, { title: page.type === "lesson" ? "درس جديد" : "مفهوم جديد" });
          }}
        />
        {page.type === "lesson" ? (
          <div className="mt-4">
            <div role="radiogroup" aria-label="حالة الدرس" className="flex flex-wrap gap-2">
              {STATUSES.map((status) => {
                const selected = page.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`min-h-11 rounded-md px-3 text-sm ${selected ? "bg-accent-soft text-accent" : "text-muted hover:bg-accent-soft"}`}
                    onClick={() => updatePage(page.id, { status })}
                  >
                    {STATUS_LABEL[status]}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">الحالة أحددها بنفسي، ولا تتغير لأنني كتبت الملخص.</p>
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="المادة">
            <input className={fieldClass} value={page.subject} onChange={(event) => updatePage(page.id, { subject: event.target.value })} />
          </Field>
          <Field label="المصدر">
            <input className={fieldClass} value={page.source} onChange={(event) => updatePage(page.id, { source: event.target.value })} />
          </Field>
          <Field label="تاريخ الدراسة">
            <input
              type="date"
              className={fieldClass}
              value={page.studiedAt}
              onChange={(event) => updatePage(page.id, { studiedAt: event.target.value })}
            />
          </Field>
        </div>
        <div className="mt-6">
          {page.blocks.map((block) => (
            <BlockView key={block.id} pageId={page.id} block={block} />
          ))}
          <AddBlockBar pageId={page.id} />
        </div>
      </article>
      <div className="xl:hidden">
        <Relations pageId={page.id} />
      </div>
    </div>
  );
}
