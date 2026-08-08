import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

/**
 * Edge-safe JWT helpers. Deliberately free of `next/headers`, Prisma and Node
 * built-ins so `middleware.ts` can import them.
 */

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: Role;
};

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or shorter than 32 characters. Set it in .env"
    );
  }
  return new TextEncoder().encode(secret);
}

export function getSessionMaxAgeSeconds(): number {
  const days = Number(process.env.SESSION_MAX_AGE_DAYS ?? 7);
  return (Number.isFinite(days) && days > 0 ? days : 7) * 24 * 60 * 60;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const maxAge = getSessionMaxAgeSeconds();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAge)
    .sign(getSecret());
}

export async function verifySession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (!payload.sub || !payload.email || !payload.role) return null;
    return {
      sub: payload.sub,
      email: payload.email as string,
      name: (payload.name as string) ?? "",
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}
