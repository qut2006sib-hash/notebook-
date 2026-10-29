import type { Persisted } from "@/lib/notebook/model";
import { validateSnapshot } from "@/lib/notebook/schema";
import { useEffect, useRef, useState } from "react";
import { Download, FileText, Lightbulb, Plus, Upload } from "lucide-react";
import { downloadText } from "@/lib/notebook/persist";
import { pagesOf, sectionsOf, useNotebook } from "@/lib/notebook/store";
import { Button } from "@/components/notebook/ui";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const notebooks = useNotebook((state) => state.notebooks);
  const sections = useNotebook((state) => state.sections);
  const pages = useNotebook((state) => state.pages);
  const links = useNotebook((state) => state.links);
  const activePageId = useNotebook((state) => state.activePageId);
  const view = useNotebook((state) => state.view);
  const openPage = useNotebook((state) => state.openPage);
  const addNotebook = useNotebook((state) => state.addNotebook);
  const renameNotebook = useNotebook((state) => state.renameNotebook);
  const removeNotebook = useNotebook((state) => state.removeNotebook);
  const addSection = useNotebook((state) => state.addSection);
  const renameSection = useNotebook((state) => state.renameSection);
  const removeSection = useNotebook((state) => state.removeSection);
  const addPage = useNotebook((state) => state.addPage);
  const restore = useNotebook((state) => state.restore);
  const rollback = useNotebook((state) => state.rollback);
  const rollbackAvailable = useNotebook((state) => state.rollbackAvailable);
  const busy = useNotebook((state) => state.busy);
  const [pendingBackup, setPendingBackup] = useState<Persisted | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (pendingBackup && !dialogRef.current?.open) dialogRef.current?.showModal(); }, [pendingBackup]);
  const setNotice = useNotebook((state) => state.setNotice);
  const [notebookName, setNotebookName] = useState("");
  const [sectionFor, setSectionFor] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [rename, setRename] = useState<{ kind: "nb" | "sec"; id: string; value: string } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "nb" | "sec"; id: string; title: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ordered = [...notebooks].sort((a, b) => a.order - b.order);

  return (
    <div className="flex h-full flex-col bg-paper">
      <div className="flex items-center gap-3 px-4 py-4">
        <span className="grid size-10 place-items-center rounded-md bg-accent text-on-accent" aria-hidden>
          م
        </span>
        <div>
          <p className="text-lg font-semibold leading-none">مداد</p>
          <p className="mt-1 text-xs text-muted">دفتر دراسة شخصي</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {ordered.map((notebook) => (
          <section key={notebook.id} className="mb-4">
            <div className="flex items-center gap-1">
              {rename?.kind === "nb" && rename.id === notebook.id ? (
                <form
                  className="min-w-0 flex-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    renameNotebook(notebook.id, rename.value);
                    setRename(null);
                  }}
                >
                  <input
                    autoFocus
                    className="min-h-11 w-full rounded-md border border-line bg-sheet px-2 text-sm"
                    value={rename.value}
                    onChange={(event) => setRename({ ...rename, value: event.target.value })}
                    onBlur={() => {
                      renameNotebook(notebook.id, rename.value);
                      setRename(null);
                    }}
                  />
                </form>
              ) : (
                <button
                  type="button"
                  className="min-h-11 min-w-0 flex-1 truncate text-start text-sm font-semibold"
                  onClick={() => setRename({ kind: "nb", id: notebook.id, value: notebook.title })}
                >
                  {notebook.title}
                </button>
              )}
              <Button variant="ghost" aria-label={`قسم في ${notebook.title}`} onClick={() => setSectionFor(notebook.id)}>
                <Plus className="size-4" />
              </Button>
              <Button variant="ghost" aria-label={`حذف ${notebook.title}`} onClick={() => setConfirm({ kind: "nb", id: notebook.id, title: notebook.title })}>
                ×
              </Button>
            </div>
            {sectionFor === notebook.id ? (
              <form
                className="mb-2 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  addSection(notebook.id, sectionName);
                  setSectionName("");
                  setSectionFor(null);
                }}
              >
                <input
                  autoFocus
                  className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-sheet px-2 text-sm"
                  placeholder="اسم القسم"
                  value={sectionName}
                  onChange={(event) => setSectionName(event.target.value)}
                />
                <Button type="submit" variant="solid">
                  أضف
                </Button>
              </form>
            ) : null}
            {confirm?.kind === "nb" && confirm.id === notebook.id ? (
              <ConfirmLine
                label={`حذف الدفتر «${confirm.title}» وكل ما فيه؟`}
                onYes={() => {
                  removeNotebook(notebook.id);
                  setConfirm(null);
                }}
                onNo={() => setConfirm(null)}
              />
            ) : null}
            {sectionsOf(sections, notebook.id).map((section) => (
              <div key={section.id} className="mt-2 ps-2">
                <div className="flex items-center gap-1">
                  {rename?.kind === "sec" && rename.id === section.id ? (
                    <form
                      className="min-w-0 flex-1"
                      onSubmit={(event) => {
                        event.preventDefault();
                        renameSection(section.id, rename.value);
                        setRename(null);
                      }}
                    >
                      <input
                        autoFocus
                        className="min-h-11 w-full rounded-md border border-line bg-sheet px-2 text-sm"
                        value={rename.value}
                        onChange={(event) => setRename({ ...rename, value: event.target.value })}
                        onBlur={() => {
                          renameSection(section.id, rename.value);
                          setRename(null);
                        }}
                      />
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="min-h-11 min-w-0 flex-1 truncate text-start text-sm text-muted"
                      onClick={() => setRename({ kind: "sec", id: section.id, value: section.title })}
                    >
                      {section.title}
                    </button>
                  )}
                  <Button
                    variant="ghost"
                    aria-label={`درس في ${section.title}`}
                    onClick={() => {
                      addPage({ notebookId: notebook.id, sectionId: section.id, type: "lesson" });
                      onNavigate?.();
                    }}
                  >
                    درس
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`مفهوم في ${section.title}`}
                    onClick={() => {
                      addPage({ notebookId: notebook.id, sectionId: section.id, type: "concept" });
                      onNavigate?.();
                    }}
                  >
                    مفهوم
                  </Button>
                  <Button variant="ghost" aria-label={`حذف القسم ${section.title}`} onClick={() => setConfirm({ kind: "sec", id: section.id, title: section.title })}>
                    ×
                  </Button>
                </div>
                {confirm?.kind === "sec" && confirm.id === section.id ? (
                  <ConfirmLine
                    label={`حذف القسم «${confirm.title}»؟`}
                    onYes={() => {
                      removeSection(section.id);
                      setConfirm(null);
                    }}
                    onNo={() => setConfirm(null)}
                  />
                ) : null}
                <ul>
                  {pagesOf(pages, section.id).map((page) => {
                    const active = view === "write" && page.id === activePageId;
                    return (
                      <li key={page.id}>
                        <button
                          type="button"
                          onClick={() => {
                            openPage(page.id);
                            onNavigate?.();
                          }}
                          className={`flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-start text-sm ${
                            active ? "bg-accent-soft text-ink" : "hover:bg-accent-soft"
                          }`}
                        >
                          {page.type === "concept" ? <Lightbulb className="size-4 shrink-0 text-accent" /> : <FileText className="size-4 shrink-0" />}
                          <span className="min-w-0 flex-1 truncate">{page.title}</span>
                          {page.type === "lesson" && page.status && page.status !== "understood" ? (
                            <span className="shrink-0 text-xs text-muted">{page.status === "need-review" ? "مراجعة" : page.status === "need-understanding" ? "فهم" : "بدأت"}</span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        ))}
        <form
          className="mt-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            addNotebook(notebookName);
            setNotebookName("");
          }}
        >
          <input
            className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-sheet px-3 text-sm"
            placeholder="دفتر جديد"
            value={notebookName}
            onChange={(event) => setNotebookName(event.target.value)}
          />
          <Button type="submit" variant="solid" aria-label="إضافة دفتر">
            <Plus className="size-4" />
          </Button>
        </form>
      </div>
      <div className="grid gap-2 border-t border-line p-3">
        <p className="px-1 text-xs text-muted">الحفظ على هذا الجهاز. النسخة الكاملة غير تصدير صفحة واحدة.</p>
        <Button
          variant="quiet"
          onClick={() => {
            const payload = {
              version: 1 as const,
              notebooks,
              sections,
              pages,
              links,
              activePageId,
              view,
            };
            downloadText(`midad-backup.json`, JSON.stringify(payload, null, 2), "application/json");
          }}
        >
          <Download className="size-4" />
          تنزيل النسخة
        </Button>
        <Button variant="quiet" onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" />
          استعادة نسخة
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (file.size > 64 * 1024 * 1024) { setNotice("النسخة أكبر من ٦٤ ميغابايت."); return; }
            void file.text().then((text) => {
              try {
                setRestoreError(null);
                setPendingBackup(validateSnapshot(JSON.parse(text)));
              } catch (error) {
                setNotice(error instanceof Error ? error.message : "تعذر قراءة ملف النسخة.");
              }
            }).catch(() => setNotice("تعذر قراءة ملف النسخة."));
          }}
        />
        {rollbackAvailable ? <Button variant="quiet" disabled={busy} onClick={() => {
          if (!window.confirm("الرجوع إلى النسخة السابقة للاستعادة؟ ستُحفظ النسخة الحالية للرجوع إليها.")) return;
          void rollback().catch((error: unknown) => setNotice(error instanceof Error ? error.message : "تعذر الرجوع."));
        }}>الرجوع إلى ما قبل الاستعادة</Button> : null}
      </div>
      {pendingBackup ? (
        <dialog ref={dialogRef} aria-labelledby="restore-title" className="m-auto max-w-lg rounded-md border border-line bg-sheet p-6 text-ink backdrop:bg-black/40" onCancel={(event) => { if (busy) event.preventDefault(); else setPendingBackup(null); }}>
          <h2 id="restore-title" className="text-xl font-semibold">استعادة نسخة كاملة</h2>
          <p className="my-3">ستستبدل الدفاتر الحالية بـ {pendingBackup.notebooks.length} دفاتر، {pendingBackup.sections.length} أقسام، {pendingBackup.pages.length} صفحات، و{pendingBackup.links.length} روابط. تُحفظ نسخة للرجوع قبل الاستبدال.</p>
          {restoreError ? <p role="alert" className="mb-3 text-accent">{restoreError}</p> : null}
          <div className="flex gap-3">
            <Button disabled={busy} variant="solid" onClick={() => {
              void restore(pendingBackup).then(() => setPendingBackup(null)).catch((error: unknown) => setRestoreError(error instanceof Error ? error.message : "تعذرت الاستعادة."));
            }}>{busy ? "أستعيد النسخة…" : "تأكيد الاستبدال"}</Button>
            <Button autoFocus disabled={busy} onClick={() => setPendingBackup(null)}>إلغاء</Button>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}

function ConfirmLine({ label, onYes, onNo }: { label: string; onYes: () => void; onNo: () => void }) {
  return (
    <div className="mb-2 grid gap-2 rounded-md border border-line p-2">
      <p className="text-xs">{label}</p>
      <div className="flex gap-2">
        <Button variant="solid" onClick={onYes}>
          حذف
        </Button>
        <Button variant="ghost" onClick={onNo}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}
