"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/delete-button";
import {
  acceptQuotationAction,
  declineQuotationAction,
  type FormState,
} from "@/app/(portal)/quotations/actions";

/**
 * Accept is a useActionState form so a rejected accept (expired, already
 * confirmed) can say why. Decline is a plain action behind a confirm, since
 * there is nothing to report on success.
 */
export function QuotationDecision({
  quotationId,
  total,
}: {
  quotationId: string;
  total: string;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    acceptQuotationAction,
    {}
  );

  return (
    <div className="space-y-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div className="flex flex-wrap items-center gap-2">
        <form action={formAction}>
          <input type="hidden" name="id" value={quotationId} />
          <Button type="submit" isLoading={isPending}>
            {!isPending && <Check className="size-4" aria-hidden />}
            Accept and book
          </Button>
        </form>

        <form action={declineQuotationAction}>
          <input type="hidden" name="id" value={quotationId} />
          <DeleteButton
            label="Decline"
            confirmMessage="Decline this quotation? The rental team will have to prepare a new one."
          />
        </form>
      </div>

      <p className="text-xs text-ink-500">
        Accepting confirms the booking and collects {total}, which includes a
        refundable security deposit. You collect the items in store.
      </p>
    </div>
  );
}
