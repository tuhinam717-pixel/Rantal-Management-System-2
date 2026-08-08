"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";

/**
 * The top-bar jump into the catalogue.
 *
 * Unlike the list toolbars this one is not debounced — it moves you to another
 * page, so it fires on submit. `router.push` keeps that a client navigation
 * rather than the full document reload a plain GET form would cause.
 */
export function CatalogueSearch() {
  const router = useRouter();
  const inputId = useId();
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      role="search"
      action="/products"
      onSubmit={(event) => {
        event.preventDefault();
        const term = value.trim();
        startTransition(() => {
          router.push(term ? `/products?q=${encodeURIComponent(term)}` : "/products");
        });
      }}
      className="hidden min-w-0 max-w-sm flex-1 sm:block"
    >
      <label htmlFor={inputId} className="sr-only">
        Search rentals
      </label>
      <div className="relative">
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
          placeholder="Search rentals…"
          autoComplete="off"
          className="w-full rounded-lg border-0 bg-slate-50 py-2 pl-9 pr-9 text-sm text-ink-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-brand-600"
        />
        {isPending && (
          <Loader2
            className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-brand-600"
            aria-label="Searching"
          />
        )}
      </div>
    </form>
  );
}
