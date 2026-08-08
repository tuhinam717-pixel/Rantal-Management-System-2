"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldRow } from "@/components/ui/form-shell";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/field";
import {
  saveTrackerAction,
  type FormState,
} from "@/app/(admin)/admin/assets/actions";

const STATUSES = [
  { value: "IDLE", label: "In the warehouse" },
  { value: "OUT_ON_RENT", label: "Out on rent" },
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "MISSING", label: "Missing" },
];

export function TrackerDialog({
  initial,
  products,
  trigger,
}: {
  initial?: {
    id: string;
    deviceId: string;
    label: string;
    productId: string;
    status: string;
  };
  products: { id: string; name: string; sku: string }[];
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    saveTrackerAction,
    {}
  );

  const editing = Boolean(initial?.id);

  useEffect(() => {
    if (state.ok && open) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, open, router]);

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Pair a tracker
        </Button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit tracker" : "Pair a tracker"}
        description="The device ID is what the tag sends with every reading. Pair it before it starts reporting — unknown IDs are rejected."
      >
        <form action={formAction} className="space-y-5">
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}

          {state.error && <Alert tone="error">{state.error}</Alert>}

          <FieldRow>
            <Input
              label="Device ID"
              name="deviceId"
              defaultValue={initial?.deviceId}
              placeholder="TRK-0001"
              required
              autoFocus
            />
            <Input
              label="Label"
              name="label"
              defaultValue={initial?.label}
              placeholder="Body no. 2"
              hint="Optional, for your own reference."
            />
          </FieldRow>

          <Select
            label="Product"
            name="productId"
            defaultValue={initial?.productId}
            required
          >
            <option value="">Select a product…</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </option>
            ))}
          </Select>

          <Select
            label="Status"
            name="status"
            defaultValue={initial?.status ?? "IDLE"}
          >
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              {editing ? "Save changes" : "Pair tracker"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
