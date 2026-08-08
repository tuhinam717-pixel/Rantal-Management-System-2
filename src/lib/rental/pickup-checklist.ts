/**
 * The handover checklist the brief asks for.
 *
 * Stored on `Pickup.checklist` as JSON rather than its own table: the items are
 * a fixed operational list, not something customers or reports query across.
 */

export interface ChecklistItem {
  id: string;
  label: string;
  hint?: string;
  /** Blocks confirmation until ticked. */
  required: boolean;
  done: boolean;
}

const TEMPLATE: Omit<ChecklistItem, "done">[] = [
  {
    id: "identity",
    label: "Customer identity verified",
    hint: "Photo ID matches the name on the order",
    required: true,
  },
  {
    id: "condition",
    label: "Product inspected and working",
    hint: "Powers on, no visible damage",
    required: true,
  },
  {
    id: "accessories",
    label: "All accessories included",
    hint: "Chargers, cables, cases, manuals",
    required: true,
  },
  {
    id: "deposit",
    label: "Security deposit confirmed as held",
    required: true,
  },
  {
    id: "return-date",
    label: "Return date and late-fee terms explained",
    required: true,
  },
  {
    id: "photos",
    label: "Condition photos taken",
    hint: "Optional, but settles disputes fast",
    required: false,
  },
];

export function defaultChecklist(): ChecklistItem[] {
  return TEMPLATE.map((item) => ({ ...item, done: false }));
}

/**
 * Reads a stored checklist back, tolerating older or malformed shapes by
 * falling back to the template. Ticked state is preserved by id, so editing
 * the template doesn't lose progress on in-flight pickups.
 */
export function parseChecklist(value: unknown): ChecklistItem[] {
  const stored = Array.isArray(value)
    ? (value as Partial<ChecklistItem>[])
    : [];

  const doneById = new Map(
    stored
      .filter((i) => typeof i?.id === "string")
      .map((i) => [i.id as string, Boolean(i.done)])
  );

  return TEMPLATE.map((item) => ({
    ...item,
    done: doneById.get(item.id) ?? false,
  }));
}

export function checklistProgress(items: ChecklistItem[]) {
  const required = items.filter((i) => i.required);
  const doneRequired = required.filter((i) => i.done).length;

  return {
    done: items.filter((i) => i.done).length,
    total: items.length,
    requiredDone: doneRequired,
    requiredTotal: required.length,
    /** Confirmation is gated on the required items only. */
    complete: doneRequired === required.length,
  };
}
