import { downloadText } from "@/lib/notebook/persist";
import { readSnapshot } from "@/lib/notebook/storage";
import { useEffect } from "react";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { openTasks } from "@/lib/notebook/query";
import { exportSnapshot, useNotebook } from "@/lib/notebook/store";
import { Editor } from "@/components/notebook/editor";
import { Review } from "@/components/notebook/review";
import { SearchDialog } from "@/components/notebook/search-dialog";
import { Sidebar } from "@/components/notebook/sidebar";
import { Button } from "@/components/notebook/ui";

export function NotebookApp() {
  const home = useNotebook((state) => state.home);
  const showHome = useNotebook((state) => state.showHome);
  const ready = useNotebook((state) => state.ready);
  const loadError = useNotebook((state) => state.loadError);
  const readOnly = useNotebook((state) => state.readOnly);
  const busy = useNotebook((state) => state.busy);
  const saveStatus = useNotebook((state) => state.saveStatus);
  const saveError = useNotebook((state) => state.saveError);
  const flush = useNotebook((state) => state.flush);
  const retryLoad = useNotebook((state) => state.retryLoad);
  const canUndo = useNotebook((state) => state.canUndo);
  const undo = useNotebook((state) => state.undo);
  const exportBackup = () => downloadText("midad-backup.json", JSON.stringify(exportSnapshot(), null, 2), "application/json");
  const hydrate = useNotebook((state) => state.hydrate);
  const theme = useNotebook((state) => state.theme);
  const setTheme = useNotebook((state) => state.setTheme);
  const view = useNotebook((state) => state.view);
  const setView = useNotebook((state) => state.setView);
  const sidebarOpen = useNotebook((state) => state.sidebarOpen);
  const setSidebarOpen = useNotebook((state) => state.setSidebarOpen);
  const setSearchOpen = useNotebook((state) => state.setSearchOpen);
  const notice = useNotebook((state) => state.notice);
  const setNotice = useNotebook((state) => state.setNotice);
  const pages = useNotebook((state) => state.pages);
  const activePageId = useNotebook((state) => state.activePageId);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("midad-theme", theme);
    } catch {
      /* ignore quota */
    }
  }, [ready, theme]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice, setNotice]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  if (!ready) {
    return (
      <main className="grid h-dvh place-items-center bg-paper px-6 text-center text-ink">
        <div>
          <h1 className="text-3xl font-semibold">مداد</h1>
          <p className="mt-2 text-muted">أفتح دفتر الدراسة…</p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return <main className="grid min-h-dvh place-items-center bg-paper p-6 text-ink">
      <section className="max-w-lg space-y-4" role="alert">
        <h1 className="text-2xl font-semibold">تعذر فتح دفتر مداد</h1>
        <p>لم نستبدل بياناتك ولم نفتح نسخة تجريبية فوقها.</p><p>{loadError}</p>
        <Button onClick={() => { void retryLoad(); }}>إعادة المحاولة</Button>
        <Button onClick={() => { void readSnapshot().then((stored) => downloadText("midad-recovery.json", JSON.stringify(stored.data, null, 2), "application/json")).catch(() => window.alert("تعذر الوصول إلى التخزين. أبقِ بيانات المتصفح وأعد المحاولة لاحقاً.")); }}>تنزيل البيانات للاسترجاع</Button>
      </section>
    </main>;
  }

  const reviewCount = pages.filter((page) => page.status === "need-review").length + openTasks(pages).length;

  return (
    <div className="flex h-dvh overflow-hidden bg-paper text-ink">
      <aside className="hidden h-full w-80 shrink-0 overflow-hidden border-e border-line lg:block">
        <fieldset disabled={readOnly || busy} className="h-full min-w-0"><Sidebar /></fieldset>
      </aside>
      {sidebarOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="إغلاق القائمة" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 start-0 flex w-80 max-w-[86%] flex-col border-e border-line bg-paper">
            <fieldset disabled={readOnly || busy} className="h-full min-w-0"><Sidebar onNavigate={() => setSidebarOpen(false)} /></fieldset>
          </aside>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-line px-3 py-2">
          <Button variant="ghost" className="lg:hidden" aria-label="فتح الدفاتر" onClick={() => setSidebarOpen(true)}>
            <Menu className="size-4" />
          </Button>
          <Button variant="ghost" onClick={showHome}>البداية</Button>
          <div className="flex rounded-md border border-line p-1">
            <button
              type="button"
              className={`min-h-11 rounded-md px-3 text-sm ${view === "write" ? "bg-accent-soft text-accent" : "text-muted"}`}
              onClick={() => setView("write")}
            >
              كتابة
            </button>
            <button
              type="button"
              className={`min-h-11 rounded-md px-3 text-sm tabular-nums ${view === "review" ? "bg-accent-soft text-accent" : "text-muted"}`}
              onClick={() => setView("review")}
            >
              مراجعة
              {reviewCount > 0 ? (
                <span className="ms-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1 text-xs text-on-accent tabular-nums">
                  {reviewCount}
                </span>
              ) : null}
            </button>
          </div>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <span role="status" className="text-xs text-muted">{({ saved: "محفوظ", pending: "تعديلات لم تُحفظ", saving: "جارٍ الحفظ…", error: "تعذر الحفظ", conflict: "تعارض بين النوافذ" })[saveStatus]}</span>
            <Button variant="ghost" onClick={exportBackup}>نسخة أمان</Button>
            {canUndo && !readOnly ? <Button variant="ghost" disabled={busy} onClick={undo}>تراجع عن الحذف</Button> : null}
            <Button variant="ghost" aria-label="بحث" onClick={() => setSearchOpen(true)}>
              <Search className="size-4" />
            </Button>
            <Button
              variant="ghost"
              aria-label={theme === "paper" ? "مظهر حبر داكن" : "مظهر ورقي"}
              onClick={() => setTheme(theme === "paper" ? "ink" : "paper")}
            >
              {theme === "paper" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </Button>
          </div>
        </header>
        {saveError ? <div className="border-b border-line bg-accent-soft p-3 text-sm" role="alert">
          <p>{saveError} تعديلات هذه النافذة باقية ويمكن تنزيلها.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {!readOnly ? <Button disabled={busy} onClick={() => { void flush(); }}>إعادة محاولة الحفظ</Button> : null}
            <Button onClick={exportBackup}>تنزيل تعديلات هذه النافذة</Button>
            <Button onClick={() => { if (window.confirm("نزّل تعديلاتك أولاً. إعادة الفتح ستعرض النسخة المحفوظة وتترك التعديلات غير المحفوظة.")) { void retryLoad(); } }}>إعادة فتح النسخة المحفوظة</Button>
          </div>
        </div> : null}
        {notice ? (
          <p className="border-b border-line bg-accent-soft px-4 py-2 text-sm text-ink" role="status">
            {notice}
          </p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <fieldset disabled={readOnly || busy} className="min-w-0">{view === "review" ? <Review /> : <Editor key={home ? "home" : activePageId} />}</fieldset>
        </div>
      </div>
      <SearchDialog />
    </div>
  );
}
