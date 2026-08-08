import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/lib/constants";
import {
  getSessionMaxAgeSeconds,
  signSession,
  verifySession,
  type SessionPayload,
} from "@/lib/auth/jwt";

export type { SessionPayload };

export async function createSession(payload: SessionPayload) {
  const token = await signSession(payload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
