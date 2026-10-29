import { useMemo, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { TYPE_LABEL } from "@/lib/notebook/model";
import { pageToMarkdown, relatedPages, safeFileName } from "@/lib/notebook/query";
import { downloadText } from "@/lib/notebook/persist";
import { useNotebook } from "@/lib/notebook/store";
import { Button } from "@/components/notebook/ui";

export function Relations({ pageId }: { pageId: string }) {
  const pages = useNotebook((state) => state.pages);
  const links = useNotebook((state) => state.links);
  const sections = useNotebook((state) => state.sections);
  const notebooks = useNotebook((state) => state.notebooks);
  const openPage = useNotebook((state) => state.openPage);
  const linkPages = useNotebook((state) => state.linkPages);
  const unlink = useNotebook((state) => state.unlink);
  const removePage = useNotebook((state) => state.removePage);
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState(false);
  const page = pages.find((item) => item.id === pageId);
  const related = useMemo(() => (page ? relatedPages(page, pages, links) : []), [page, pages, links]);
  if (!page) return null;
  const q = query.trim();
  const candidates = pages
    .filter((item) => item.id !== page.id)
    .filter((item) => !q || item.title.includes(q) || item.subject.includes(q))
    .slice(0, 6);

  return (
    <div className="grid gap-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold">صفحات مرتبطة</h2>
        {related.length === 0 ? <p className="text-sm text-muted">لا روابط بعد. اربط صفحة من الحقل، أو اكتب [[عنوان الصفحة]] داخل النص.</p> : null}
        <ul className="grid gap-2">
          {related.map((item) => (
            <li key={item.page.id} className="flex items-center gap-2">
              <button type="button" className="min-h-11 min-w-0 flex-1 text-start" onClick={() => openPage(item.page.id)}>
                <span className="block truncate">{item.page.title}</span>
                <span className="text-xs text-muted">
                  {TYPE_LABEL[item.page.type]}
                  {item.via === "mention" ? " · مذكورة في النص" : ""}
                </span>
              </button>
              {item.linkId ? (
                <Button variant="ghost" aria-label={`فك الربط مع ${item.page.title}`} onClick={() => unlink(item.linkId!)}>
                  فك
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold">ربط صفحة</h2>
        <input
          className="min-h-11 w-full rounded-md border border-line bg-paper px-3 text-sm"
          value={query}
          placeholder="ابحث عن درس أو مفهوم"
          onChange={(event) => setQuery(event.target.value)}
        />
        <ul className="mt-2 grid gap-1">
          {candidates.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-2 text-start text-sm hover:bg-accent-soft"
                onClick={() => {
                  linkPages(page.id, item.id);
                  setQuery("");
                }}
              >
                <span className="min-w-0"><span className="block truncate">{item.title}</span><span className="block text-xs text-muted">{notebooks.find((row) => row.id === item.notebookId)?.title} · {sections.find((row) => row.id === item.sectionId)?.title}</span></span>
                <span className="text-xs text-muted">{TYPE_LABEL[item.type]}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-2">
        <Button
          variant="quiet"
          onClick={() => downloadText(safeFileName(page.title, "md"), pageToMarkdown(page, pages, links), "text/markdown;charset=utf-8")}
        >
          <Download className="size-4" />
          تصدير Markdown
        </Button>
        {confirm ? (
          <div className="grid gap-2 rounded-md border border-line p-3">
            <p className="text-sm">حذف «{page.title}»؟ الروابط إليها تُحذف أيضاً.</p>
            <div className="flex gap-2">
              <Button variant="solid" onClick={() => removePage(page.id)}>
                حذف
              </Button>
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirm(true)}>
            <Trash2 className="size-4" />
            حذف الصفحة
          </Button>
        )}
      </section>
    </div>
  );
}
