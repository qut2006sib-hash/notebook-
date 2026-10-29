import { useState } from "react";
import { STATUS_LABEL, TYPE_LABEL } from "@/lib/notebook/model";
import { openTasks, relatedPages } from "@/lib/notebook/query";
import { sectionsOf, useNotebook } from "@/lib/notebook/store";
import { Button } from "@/components/notebook/ui";

export function Review() {
  const notebooks = useNotebook((state) => state.notebooks);
  const sections = useNotebook((state) => state.sections);
  const pages = useNotebook((state) => state.pages);
  const links = useNotebook((state) => state.links);
  const openPage = useNotebook((state) => state.openPage);
  const updateTask = useNotebook((state) => state.updateTask);
  const addPage = useNotebook((state) => state.addPage);
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? "");
  const reviewPages = pages.filter((page) => page.status === "need-review");
  const building = pages.filter((page) => page.status === "started" || page.status === "need-understanding");
  const questions = openTasks(pages);
  const orderedSections = [...notebooks].sort((a, b) => a.order - b.order).flatMap((notebook) =>
    sectionsOf(sections, notebook.id).map((section) => ({ notebook, section })),
  );

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-6 sm:px-8">
      <header>
        <h1 className="text-3xl font-semibold text-balance">مراجعة الدراسة</h1>
        <p className="mt-2 text-muted">ما يحتاج رجوعاً، والأسئلة التي لم تُغلق. التعليم هنا لا يغيّر حالة الدرس.</p>
      </header>

      <section className="rounded-md border border-line bg-sheet p-4">
        <h2 className="text-lg font-semibold">درس بالقالب</h2>
        <p className="mt-1 text-sm text-muted">القالب يضع الفكرة والتعريف والمثال والخطأ والسؤال والخلاصة. الحالة تبدأ «بدأت».</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select
            className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-paper px-3"
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
          >
            {orderedSections.map(({ notebook, section }) => (
              <option key={section.id} value={section.id}>
                {notebook.title} · {section.title}
              </option>
            ))}
          </select>
          <Button
            variant="solid"
            disabled={!sectionId}
            onClick={() => {
              const section = sections.find((item) => item.id === sectionId);
              if (!section) return;
              addPage({ notebookId: section.notebookId, sectionId: section.id, type: "lesson" });
            }}
          >
            إنشاء الدرس
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">تحتاج مراجعة</h2>
        {reviewPages.length === 0 ? <p className="text-sm text-muted">لا دروس في هذه الحالة.</p> : null}
        <ul className="grid gap-3">
          {reviewPages.map((page) => {
            const related = relatedPages(page, pages, links);
            return (
              <li key={page.id} className="rounded-md border border-line bg-sheet p-4">
                <button type="button" className="min-h-11 text-start text-lg font-semibold" onClick={() => openPage(page.id)}>
                  {page.title}
                </button>
                <p className="text-sm text-muted">
                  {page.subject || "بلا مادة"} · {STATUS_LABEL[page.status ?? "need-review"]}
                </p>
                {related.length ? (
                  <p className="mt-2 text-sm">
                    مرتبط بـ{" "}
                    {related.map((item, index) => (
                      <span key={item.page.id}>
                        {index ? "، " : ""}
                        <button type="button" className="text-accent underline decoration-accent/40 underline-offset-4" onClick={() => openPage(item.page.id)}>
                          {item.page.title}
                        </button>
                        <span className="text-muted"> ({TYPE_LABEL[item.page.type]})</span>
                      </span>
                    ))}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">أسئلة لم تُغلق</h2>
        {questions.length === 0 ? <p className="text-sm text-muted">لا أسئلة مفتوحة.</p> : null}
        <ul className="grid gap-2">
          {questions.map((row) => (
            <li key={row.item.id} className="flex items-start gap-3 rounded-md border border-line bg-sheet p-3">
              <input
                type="checkbox"
                className="mt-1 size-5 accent-accent"
                checked={false}
                aria-label="تعليم السؤال محلولاً"
                onChange={() => updateTask(row.page.id, row.blockId, row.item.id, { done: true })}
              />
              <div className="min-w-0">
                <p>{row.item.text}</p>
                <button type="button" className="mt-1 min-h-11 text-sm text-accent" onClick={() => openPage(row.page.id)}>
                  {row.page.title}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">ما زلت أبني فهمها</h2>
        {building.length === 0 ? <p className="text-sm text-muted">لا دروس في «بدأت» أو «أحتاج فهماً».</p> : null}
        <ul className="grid gap-2">
          {building.map((page) => (
            <li key={page.id}>
              <button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 text-start" onClick={() => openPage(page.id)}>
                <span className="truncate">{page.title}</span>
                <span className="shrink-0 text-sm text-muted">{page.status ? STATUS_LABEL[page.status] : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
