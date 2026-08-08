"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, LayoutGrid, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { saveWidgetsAction } from "@/app/(admin)/admin/dashboard/actions";
import {
  DEFAULT_WIDGETS,
  WIDGETS,
  type WidgetKey,
} from "@/lib/dashboard-widgets";
import { cn } from "@/lib/utils";

export function CustomizeWidgets({ current }: { current: WidgetKey[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<WidgetKey[]>(current);
  const [isPending, startTransition] = useTransition();

  // Chosen tiles keep their order at the top; the rest are offered below.
  const hidden = WIDGETS.filter((w) => !selection.includes(w.key));

  const labelOf = (key: WidgetKey) =>
    WIDGETS.find((w) => w.key === key)?.label ?? key;

  function move(index: number, delta: number) {
    const next = [...selection];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSelection(next);
  }

  function save() {
    startTransition(async () => {
      await saveWidgetsAction(selection);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <LayoutGrid className="size-4" aria-hidden />
        Customize
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Customize dashboard"
        description="Choose which tiles to show and the order they appear in."
      >
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
              Showing ({selection.length})
            </p>

            {selection.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-sm text-ink-500">
                No tiles selected — the dashboard will show the default set.
              </p>
            ) : (
              <ul className="space-y-1">
                {selection.map((key, index) => (
                  <li
                    key={key}
                    className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 ring-1 ring-inset ring-line"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-900">
                      {labelOf(key)}
                    </span>

                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${labelOf(key)} up`}
                      className={cn(
                        "grid size-7 place-items-center rounded-md text-ink-500 transition-colors hover:bg-brand-50 hover:text-ink-900",
                        index === 0 && "pointer-events-none opacity-30"
                      )}
                    >
                      <ArrowUp className="size-4" aria-hidden />
                    </button>

                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === selection.length - 1}
                      aria-label={`Move ${labelOf(key)} down`}
                      className={cn(
                        "grid size-7 place-items-center rounded-md text-ink-500 transition-colors hover:bg-brand-50 hover:text-ink-900",
                        index === selection.length - 1 &&
                          "pointer-events-none opacity-30"
                      )}
                    >
                      <ArrowDown className="size-4" aria-hidden />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSelection(selection.filter((k) => k !== key))
                      }
                      className="rounded-md px-2 py-1 text-xs font-medium text-ink-500 transition-colors hover:bg-brand-50 hover:text-ink-900"
                    >
                      Hide
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hidden.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
                Hidden
              </p>
              <div className="flex flex-wrap gap-2">
                {hidden.map((widget) => (
                  <button
                    key={widget.key}
                    type="button"
                    onClick={() => setSelection([...selection, widget.key])}
                    className="rounded-full bg-surface px-3 py-1.5 text-sm text-ink-700 ring-1 ring-inset ring-line transition-colors hover:bg-brand-50 hover:ring-brand-300"
                  >
                    + {widget.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelection([...DEFAULT_WIDGETS])}
            >
              <RotateCcw className="size-4" aria-hidden />
              Reset
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={save} isLoading={isPending}>
                Save layout
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
