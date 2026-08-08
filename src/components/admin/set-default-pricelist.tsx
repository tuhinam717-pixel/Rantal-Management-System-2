"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  setDefaultPricelistAction,
  type FormState,
} from "@/app/(admin)/admin/config-actions";

export function SetDefaultPricelist({
  id,
  rateCount,
}: {
  id: string;
  rateCount: number;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    setDefaultPricelistAction,
    {}
  );

  const empty = rateCount === 0;

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          isLoading={isPending}
          disabled={empty}
          title={
            empty
              ? "Add at least one rate before making this the default"
              : undefined
          }
        >
          {!isPending && <CheckCircle2 className="size-4" aria-hidden />}
          Make default
        </Button>
      </form>

      {state.error && (
        <Alert tone="error" className="mt-2 max-w-sm">
          {state.error}
        </Alert>
      )}
    </div>
  );
}
