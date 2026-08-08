"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { markAllReadAction } from "@/app/(portal)/notifications/actions";

export function MarkAllRead() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      size="sm"
      isLoading={isPending}
      onClick={() =>
        startTransition(async () => {
          await markAllReadAction();
          router.refresh();
        })
      }
    >
      {!isPending && <CheckCheck className="size-4" aria-hidden />}
      Mark all read
    </Button>
  );
}
