"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldRow } from "@/components/ui/form-shell";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/field";
import {
  saveVendorProductAction,
  type FormState,
} from "@/app/(vendor)/vendor/actions";

export interface VendorProductInitial {
  id: string;
  name: string;
  sku: string;
  description: string;
  imageUrl: string;
  totalStock: number;
  committed: number;
}

export function VendorProductDialog({
  initial,
  trigger,
}: {
  initial?: VendorProductInitial;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    saveVendorProductAction,
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
          Add a product
        </Button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit product" : "Add a product"}
        description={
          editing
            ? "Details and unit count are yours to maintain. Pricing and listing stay with the rental business."
            : "It is added unlisted — the rental business prices it before it can be rented."
        }
        size="lg"
      >
        <form action={formAction} className="space-y-5">
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}

          {state.error && <Alert tone="error">{state.error}</Alert>}

          <FieldRow>
            <Input
              label="Product name"
              name="name"
              defaultValue={initial?.name}
              placeholder="Canon EOS R5 Camera Kit"
              required
              autoFocus
            />
            <Input
              label="SKU"
              name="sku"
              defaultValue={initial?.sku}
              placeholder="CAM-R5-001"
              className="font-mono"
              required
            />
          </FieldRow>

          <Textarea
            label="Description"
            name="description"
            rows={3}
            defaultValue={initial?.description}
            placeholder="What's included, condition notes, accessories…"
          />

          <ImageUpload
            name="imageUrl"
            defaultValue={initial?.imageUrl ?? ""}
            label="Product photo"
            maxDimension={1000}
          />

          <Input
            label="Units supplied"
            name="totalStock"
            type="number"
            min={initial?.committed ?? 0}
            defaultValue={initial?.totalStock ?? 1}
            required
            className="max-w-40"
            hint={
              initial && initial.committed > 0
                ? `${initial.committed} unit(s) are out on rent or in repair, so this cannot go lower.`
                : "How many you have provided to the rental business."
            }
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              {editing ? "Save changes" : "Add product"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
