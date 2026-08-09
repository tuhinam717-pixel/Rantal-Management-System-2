"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  saveVendorLoginAction,
  type FormState,
} from "@/app/(admin)/admin/vendors/actions";

export function VendorLoginDialog({
  vendorId,
  vendorName,
  defaultEmail,
  hasLogin,
  trigger,
}: {
  vendorId: string;
  vendorName: string;
  defaultEmail: string;
  hasLogin: boolean;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    saveVendorLoginAction,
    {}
  );

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
        <Button variant="soft" size="sm" onClick={() => setOpen(true)}>
          <KeyRound className="size-4" aria-hidden />
          {hasLogin ? "Reset login" : "Give login"}
        </Button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={hasLogin ? "Reset vendor login" : "Give vendor a login"}
        description={`${vendorName} will sign in on the normal login page and see only their own products and repairs.`}
      >
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="vendorId" value={vendorId} />

          {state.error && <Alert tone="error">{state.error}</Alert>}

          <Input
            label="Sign-in email"
            name="email"
            type="email"
            defaultValue={defaultEmail}
            required
            autoFocus
            hint="Must not already belong to a customer or admin account."
          />

          <Input
            label={hasLogin ? "New password" : "Password"}
            name="password"
            type="password"
            required
            hint="At least 8 characters. Share it with the vendor over a channel you trust."
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
              {hasLogin ? "Reset password" : "Create login"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
