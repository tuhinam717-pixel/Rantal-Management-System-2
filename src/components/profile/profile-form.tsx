"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { UserRound } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateProfileAction,
  type FormState,
} from "@/app/(portal)/profile/actions";

export function ProfileForm({
  initial,
}: {
  initial: { name: string; email: string; phone: string; imageUrl: string };
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    updateProfileAction,
    {}
  );
  const [imageUrl, setImageUrl] = useState(initial.imageUrl);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Profile updated.</Alert>}

      <div className="flex items-center gap-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
              // A bad URL shouldn't leave a broken image box behind.
              onError={() => setImageUrl("")}
            />
          ) : (
            <span className="grid size-full place-items-center text-slate-400">
              <UserRound className="size-8" aria-hidden />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <Input
            label="Profile photo URL"
            name="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            hint="Paste a link to your photo. The preview updates as you type."
          />
        </div>
      </div>

      <Input label="Full name" name="name" defaultValue={initial.name} required />

      <Input
        label="Email address"
        value={initial.email}
        disabled
        hint="Your email is your sign-in and cannot be changed here."
        readOnly
      />

      <Input
        label="Phone number"
        name="phone"
        type="tel"
        defaultValue={initial.phone}
        placeholder="+91 98765 43210"
        hint="Used for pickup and return reminders."
      />

      <Button type="submit" isLoading={isPending}>
        Save profile
      </Button>
    </form>
  );
}
