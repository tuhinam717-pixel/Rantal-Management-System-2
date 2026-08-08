"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProductForm } from "@/components/admin/product-form";

/**
 * Create-in-a-dialog. The action redirects to /admin/products on success, so
 * the modal doesn't need its own close-on-success handling.
 */
export function NewProductDialog({
  categories,
  periods,
}: {
  categories: { id: string; name: string }[];
  periods: { id: string; name: string; unit: string; price: number }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        New product
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New product"
        description="Add a rentable product with its deposit rule and rates."
        size="xl"
      >
        <ProductForm
          mode="create"
          layout="modal"
          categories={categories}
          periods={periods}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
