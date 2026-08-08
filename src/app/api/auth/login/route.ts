import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validations/auth";
import { ROLE_HOME } from "@/lib/constants";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check the highlighted fields",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
        isActive: true,
      },
    });

    // Same message and roughly the same work for "no such user" and "wrong
    // password", so the response can't be used to enumerate accounts.
    const passwordOk = user
      ? await verifyPassword(password, user.passwordHash)
      : await verifyPassword(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvaliduu");

    if (!user || !passwordOk) {
      return NextResponse.json(
        { error: "Incorrect email or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "This account has been deactivated. Contact your administrator." },
        { status: 403 }
      );
    }

    await createSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      redirectTo: ROLE_HOME[user.role],
    });
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json(
      { error: "Could not sign you in. Please try again." },
      { status: 500 }
    );
  }
}
