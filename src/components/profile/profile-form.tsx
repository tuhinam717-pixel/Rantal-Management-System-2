"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
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

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Profile updated.</Alert>}

      <ImageUpload
        name="imageUrl"
        defaultValue={initial.imageUrl}
        label="Profile photo"
        shape="circle"
        maxDimension={512}
        hint="Pick a photo from your device — it is resized before saving."
      />

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
