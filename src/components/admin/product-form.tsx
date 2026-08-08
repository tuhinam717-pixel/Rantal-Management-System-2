"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImageOff, Save } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AffixInput, Select, Textarea } from "@/components/ui/field";
import { FieldRow, FormActions, FormSection } from "@/components/ui/form-shell";
import {
  createProductAction,
  updateProductAction,
  type FormState,
} from "@/app/(admin)/admin/products/actions";
import { cn, formatCurrency } from "@/lib/utils";

export interface ProductFormValues {
  id?: string;
  name: string;
  sku: string;
  description: string;
  imageUrl: string;
  categoryId: string;
  totalStock: number;
  depositType: "FIXED" | "PERCENTAGE";
  depositValue: number;
  isRentable: boolean;
}

export function ProductForm({
  mode,
  initial,
  categories,
  periods,
  layout = "page",
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: ProductFormValues;
  categories: { id: string; name: string }[];
  periods: { id: string; name: string; unit: string; price: number }[];
  /** In a modal the dialog already scrolls, so the sticky bar is dropped. */
  layout?: "page" | "modal";
  onCancel?: () => void;
}) {
  const action = mode === "create" ? createProductAction : updateProductAction;
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    action,
    {}
  );

  const [depositType, setDepositType] = useState<"FIXED" | "PERCENTAGE">(
    initial?.depositType ?? "FIXED"
  );
  const [depositValue, setDepositValue] = useState(initial?.depositValue ?? 0);
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [imageOk, setImageOk] = useState(true);

  return (
    <form action={formAction} className="space-y-5 pb-4">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Product saved.</Alert>}

      <FormSection
        step={1}
        title="Basics"
        description="What the product is called and how it appears in the customer catalogue."
      >
        <FieldRow>
          <Input
            label="Product name"
            name="name"
            defaultValue={initial?.name}
            placeholder="Canon EOS R5 Camera Kit"
            required
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
          placeholder="What's included in the kit, condition notes, accessories..."
          hint="Shown on the product page."
        />

        <Select
          label="Category"
          name="categoryId"
          defaultValue={initial?.categoryId ?? ""}
        >
          <option value="">Uncategorised</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </FormSection>

      <FormSection
        step={2}
        title="Image"
        description="Paste a link to a photo. The preview updates as you type."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative aspect-4/3 w-40 shrink-0 overflow-hidden rounded-xl bg-brand-50 ring-1 ring-line">
            {imageUrl && imageOk ? (
              <Image
                src={imageUrl}
                alt=""
                fill
                sizes="160px"
                className="object-cover"
                onError={() => setImageOk(false)}
              />
            ) : (
              <span className="grid size-full place-items-center text-brand-400">
                <ImageOff className="size-7" aria-hidden />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <Input
              label="Image URL"
              name="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setImageOk(true);
              }}
              placeholder="https://images.unsplash.com/..."
              hint={
                imageUrl && !imageOk
                  ? "That image could not be loaded — check the URL and that the host is allowed in next.config.ts."
                  : "Must be an https URL on an allowed host."
              }
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        step={3}
        title="Stock"
        description="How many units you own. Units currently out on rental are tracked separately."
      >
        <FieldRow>
          <Input
            label="Total stock"
            name="totalStock"
            type="number"
            min={0}
            defaultValue={initial?.totalStock ?? 0}
            required
          />
        </FieldRow>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-canvas p-3.5 transition-colors hover:border-brand-300">
          <input
            type="checkbox"
            name="isRentable"
            value="true"
            defaultChecked={initial?.isRentable ?? true}
            className="mt-0.5 size-4 rounded border-line text-brand-600 focus:ring-brand-600"
          />
          <span>
            <span className="block text-sm font-medium text-ink-900">
              Available to rent
            </span>
            <span className="block text-xs text-ink-500">
              Unchecked keeps the product and its history but hides it from the
              catalogue.
            </span>
          </span>
        </label>
      </FormSection>

      <FormSection
        step={4}
        title="Security deposit"
        description="Held at confirmation and refunded when the product comes back on time."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: "FIXED" as const,
                title: "Fixed amount",
                body: "The same amount per item, whatever the rental length.",
              },
              {
                value: "PERCENTAGE" as const,
                title: "Percentage of rent",
                body: "Scales with the booking. Good for high-value plant.",
              },
            ]
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDepositType(option.value)}
              aria-pressed={depositType === option.value}
              className={cn(
                "rounded-xl border p-3.5 text-left transition-colors",
                depositType === option.value
                  ? "border-brand-500 bg-brand-100 ring-1 ring-brand-500"
                  : "border-line bg-surface hover:border-brand-300"
              )}
            >
              <span className="block text-sm font-medium text-ink-900">
                {option.title}
              </span>
              <span className="mt-0.5 block text-xs text-ink-500">
                {option.body}
              </span>
            </button>
          ))}
        </div>
        <input type="hidden" name="depositType" value={depositType} />

        <div className="max-w-64">
          <AffixInput
            label={depositType === "FIXED" ? "Amount per item" : "Percentage"}
            name="depositValue"
            type="number"
            min={0}
            step={depositType === "FIXED" ? 100 : 1}
            value={depositValue}
            onChange={(e) => setDepositValue(Number(e.target.value))}
            prefix={depositType === "FIXED" ? "₹" : undefined}
            suffix={depositType === "PERCENTAGE" ? "%" : undefined}
            hint={
              depositType === "FIXED"
                ? `${formatCurrency(depositValue || 0)} held per unit`
                : `${depositValue || 0}% of the rent for the booking`
            }
            required
          />
        </div>
      </FormSection>

      <FormSection
        step={5}
        title="Rates"
        description="Prices on the default pricelist. Leave a period blank to not offer it."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {periods.map((period) => (
            <AffixInput
              key={period.id}
              label={period.name}
              name={`price_${period.id}`}
              type="number"
              min={0}
              step={10}
              defaultValue={period.price || ""}
              placeholder="0"
              prefix="₹"
              hint={`per ${period.unit.toLowerCase()}`}
            />
          ))}
        </div>
      </FormSection>

      {layout === "modal" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-xs text-ink-500">
            At least one rate is required.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              {!isPending && <Save className="size-4" aria-hidden />}
              Create product
            </Button>
          </div>
        </div>
      ) : (
        <FormActions
          note={
            mode === "create"
              ? "At least one rate is required."
              : "Changes apply to new bookings only."
          }
        >
          <Link href="/admin/products">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={isPending}>
            {!isPending && <Save className="size-4" aria-hidden />}
            {mode === "create" ? "Create product" : "Save changes"}
          </Button>
        </FormActions>
      )}
    </form>
  );
}
