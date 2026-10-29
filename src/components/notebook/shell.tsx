import { useEffect } from "react";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { openTasks } from "@/lib/notebook/query";
import { useNotebook } from "@/lib/notebook/store";
import { Editor } from "@/components/notebook/editor";
import { Relations } from "@/components/notebook/relations";
import { Review } from "@/components/notebook/review";
import { SearchDialog } from "@/components/notebook/search-dialog";
import { Sidebar } from "@/components/notebook/sidebar";
import { Button } from "@/components/notebook/ui";

export function NotebookApp() {
  const ready = useNotebook((state) => state.ready);
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

  const reviewCount = pages.filter((page) => page.status === "need-review").length + openTasks(pages).length;

  return (
    <div className="flex h-dvh overflow-hidden bg-paper text-ink">
      <aside className="hidden h-full w-80 shrink-0 overflow-hidden border-e border-line lg:block">
        <Sidebar />
      </aside>
      {sidebarOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="إغلاق القائمة" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 start-0 flex w-80 max-w-[86%] flex-col border-e border-line bg-paper">
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-line px-3 py-2">
          <Button variant="ghost" className="lg:hidden" aria-label="فتح الدفاتر" onClick={() => setSidebarOpen(true)}>
            <Menu className="size-4" />
          </Button>
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
          <div className="ms-auto flex">
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
        {notice ? (
          <p className="border-b border-line bg-accent-soft px-4 py-2 text-sm text-ink" role="status">
            {notice}
          </p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {view === "review" ? <Review /> : <Editor />}
        </div>
      </div>
      {view === "write" && activePageId ? (
        <aside className="hidden h-full w-72 shrink-0 overflow-y-auto border-s border-line px-4 py-6 xl:block">
          <Relations pageId={activePageId} />
        </aside>
      ) : null}
      <SearchDialog />
    </div>
  );
}
