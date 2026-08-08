"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

/**
 * How long to wait after the last keystroke before searching. Requested at
 * three seconds; drop it to ~400ms if the wait feels long in use.
 */
const DEBOUNCE_MS = 3000;

/**
 * Debounced search box.
 *
 * Typing no longer reloads the page: the URL is rewritten with `router.replace`
 * so only the server component re-renders, and this input stays mounted, which
 * is what keeps focus and the caret where the user left them. `replace` rather
 * than `push` keeps one history entry per search instead of one per keystroke.
 */
export function SearchInput({ placeholder }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputId = useId();

  const committed = searchParams.get("q") ?? "";
  const [value, setValue] = useState(committed);
  const [isPending, startTransition] = useTransition();

  // What we last asked the URL to hold, so a change made elsewhere (a "clear
  // filters" link, the back button) can be told apart from our own navigation
  // and mirrored back into the box instead of being immediately undone.
  const lastSubmitted = useRef(committed);

  useEffect(() => {
    if (committed !== lastSubmitted.current) {
      lastSubmitted.current = committed;
      setValue(committed);
    }
  }, [committed]);

  const submit = useCallback(
    (next: string) => {
      const term = next.trim();
      if (term === lastSubmitted.current) return;

      lastSubmitted.current = term;

      const params = new URLSearchParams(searchParams.toString());
      if (term) params.set("q", term);
      else params.delete("q");
      // A new search always starts at the first page.
      params.delete("page");

      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (value.trim() === lastSubmitted.current) return;

    const timer = setTimeout(() => submit(value), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, submit]);

  const showClear = value.length > 0;

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <label htmlFor={inputId} className="sr-only">
        Search
      </label>

      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
        aria-hidden
      />

      <input
        id={inputId}
        name="q"
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          // Enter skips the wait rather than submitting the fallback form.
          if (event.key === "Enter") {
            event.preventDefault();
            submit(value);
          }
          if (event.key === "Escape" && value) {
            event.preventDefault();
            setValue("");
            submit("");
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border-0 bg-white py-2 pl-9 pr-16 text-sm text-ink-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600"
      />

      <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {isPending && (
          <Loader2
            className="size-4 animate-spin text-brand-600"
            aria-label="Searching"
          />
        )}
        {showClear && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              submit("");
            }}
            aria-label="Clear search"
            className="grid size-6 place-items-center rounded-md text-ink-400 transition-colors hover:bg-slate-100 hover:text-ink-700"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </span>
    </div>
  );
}
