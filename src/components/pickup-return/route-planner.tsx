import Link from "next/link";
import { ArrowDown, ArrowUp, ListOrdered, MapPin, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PickupChecklist } from "@/components/pickup-return/pickup-checklist";
import {
  assignDayAction,
  assignTeamAction,
  autoSequenceAction,
  moveStopAction,
} from "@/app/(admin)/admin/pickups/actions";
import { parseChecklist } from "@/lib/rental/pickup-checklist";
import { checklistProgress } from "@/lib/rental/pickup-checklist";
import { cn } from "@/lib/utils";

const TEAMS = ["Team A", "Team B", "Team C", "Team D"];

export interface RouteStop {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  place: string;
  scheduledFor: Date;
  routeSequence: number | null;
  assignedTo: string | null;
  checklist: unknown;
}

const timeOf = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

/**
 * The day's run, in the order the crew will drive it.
 *
 * Sequence is stored per pickup, so a reorder rewrites the whole day 1..n
 * rather than swapping two numbers — otherwise gaps and duplicates build up.
 */
export function RoutePlanner({
  day,
  stops,
}: {
  day: string;
  stops: RouteStop[];
}) {
  const unassigned = stops.filter((s) => !s.assignedTo).length;

  const selectClass =
    "rounded-lg border-0 bg-surface py-1.5 pl-2.5 pr-8 text-xs text-ink-900 shadow-sm ring-1 ring-inset ring-line focus:ring-2 focus:ring-inset focus:ring-brand-600 focus:outline-none";

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <ListOrdered className="size-4 text-brand-700" aria-hidden />
            Route for {day}
          </span>
        }
        description={
          stops.length === 0
            ? "No pickups scheduled for this day."
            : `${stops.length} stop${stops.length === 1 ? "" : "s"}${unassigned > 0 ? ` · ${unassigned} unassigned` : " · all assigned"}`
        }
        actions={
          stops.length > 0 ? (
            <>
              <form action={autoSequenceAction}>
                <input type="hidden" name="day" value={day} />
                <Button type="submit" variant="secondary" size="sm">
                  <Wand2 className="size-4" aria-hidden />
                  Auto-sequence
                </Button>
              </form>

              <form action={assignDayAction} className="flex items-center gap-1">
                <input type="hidden" name="day" value={day} />
                <select name="assignedTo" defaultValue="" className={selectClass}>
                  <option value="" disabled>
                    Assign all to…
                  </option>
                  {TEAMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="ghost" size="sm">
                  Apply
                </Button>
              </form>
            </>
          ) : undefined
        }
      />

      {stops.length > 0 && (
        <CardBody className="p-0">
          <ol className="divide-y divide-line">
            {stops.map((stop, index) => {
              const items = parseChecklist(stop.checklist);
              const progress = checklistProgress(items);

              return (
                <li
                  key={stop.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3"
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums",
                      progress.complete
                        ? "bg-brand-600 text-white"
                        : "bg-brand-200 text-brand-800"
                    )}
                  >
                    {stop.routeSequence ?? index + 1}
                  </span>

                  <div className="min-w-48 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/orders/${stop.orderId}`}
                        className="text-sm font-medium text-brand-700 hover:text-brand-800"
                      >
                        {stop.orderNumber}
                      </Link>
                      <Badge tone="neutral">{timeOf(stop.scheduledFor)}</Badge>
                      {progress.complete && (
                        <Badge tone="success">Ready</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-700">
                      {stop.customerName}
                    </p>
                    <p className="mt-0.5 inline-flex items-start gap-1 text-xs text-ink-500">
                      <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
                      {stop.place}
                    </p>
                  </div>

                  <form action={assignTeamAction} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={stop.id} />
                    <select
                      name="assignedTo"
                      defaultValue={stop.assignedTo ?? ""}
                      className={selectClass}
                    >
                      <option value="">Unassigned</option>
                      {TEAMS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" variant="ghost" size="sm">
                      Set
                    </Button>
                  </form>

                  <PickupChecklist
                    pickupId={stop.id}
                    orderNumber={stop.orderNumber}
                    items={items}
                    compact
                  />

                  <div className="flex items-center gap-1">
                    <form action={moveStopAction}>
                      <input type="hidden" name="id" value={stop.id} />
                      <input type="hidden" name="day" value={day} />
                      <input type="hidden" name="direction" value="up" />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        disabled={index === 0}
                        aria-label="Move earlier in the route"
                      >
                        <ArrowUp className="size-4" aria-hidden />
                      </Button>
                    </form>
                    <form action={moveStopAction}>
                      <input type="hidden" name="id" value={stop.id} />
                      <input type="hidden" name="day" value={day} />
                      <input type="hidden" name="direction" value="down" />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        disabled={index === stops.length - 1}
                        aria-label="Move later in the route"
                      >
                        <ArrowDown className="size-4" aria-hidden />
                      </Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardBody>
      )}
    </Card>
  );
}
