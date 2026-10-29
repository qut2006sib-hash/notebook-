import { useEffect, useRef, useState, type RefObject } from "react";
import { TYPE_LABEL, type Page } from "@/lib/notebook/model";
import { searchPages } from "@/lib/notebook/query";
import { useNotebook } from "@/lib/notebook/store";

export function SearchDialog() {
  const open = useNotebook((state) => state.searchOpen);
  const setSearchOpen = useNotebook((state) => state.setSearchOpen);
  const pages = useNotebook((state) => state.pages);
  const openPage = useNotebook((state) => state.openPage);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setSearchOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-ink/40">
      <button type="button" aria-label="إغلاق البحث" className="absolute inset-0" onClick={() => setSearchOpen(false)} />
      <div className="relative z-10 mx-auto mt-16 w-full max-w-xl px-4">
        <SearchBody pages={pages} openPage={openPage} inputRef={inputRef} />
      </div>
    </div>
  );
}

function SearchBody({
  pages,
  openPage,
  inputRef,
}: {
  pages: Page[];
  openPage: (id: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const [value, setValue] = useState("");
  const hits = searchPages(pages, value);
  return (
    <div className="rounded-md border border-line bg-sheet p-4">
      <label className="block text-sm text-muted" htmlFor="midad-search">
        بحث في العناوين والنص
      </label>
      <input
        id="midad-search"
        ref={inputRef}
        className="mt-2 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-ink"
        value={value}
        placeholder="جرّب: تباين، أو np.cov"
        onChange={(event) => setValue(event.target.value)}
      />
      <p className="mt-2 text-xs text-muted">الألف مع همزاتها، والألف المقصورة، والتاء المربوطة تُعامل كحرف واحد.</p>
      <ul className="mt-3 max-h-96 overflow-y-auto">
        {value.trim() && hits.length === 0 ? <li className="py-3 text-sm text-muted">لا نتائج.</li> : null}
        {hits.map((hit) => (
          <li key={hit.page.id}>
            <button type="button" className="flex min-h-11 w-full flex-col items-start py-2 text-start" onClick={() => openPage(hit.page.id)}>
              <span className="font-semibold">
                {hit.page.title} <span className="text-xs font-normal text-muted">{TYPE_LABEL[hit.page.type]}</span>
              </span>
              {hit.snippet ? <span className="line-clamp-2 text-sm text-muted">{hit.snippet}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
