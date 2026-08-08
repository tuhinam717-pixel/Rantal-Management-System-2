import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { signupSchema } from "@/lib/validations/auth";
import { ROLE_HOME } from "@/lib/constants";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check the highlighted fields",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  const { name, email, phone, password } = parsed.data;
  const normalisedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalisedEmail,
        phone: phone?.trim() || null,
        passwordHash: await hashPassword(password),
        // Self-service signup always creates a portal user; admins are
        // provisioned through the seed script or the admin console.
        role: "CUSTOMER",
        cart: { create: {} },
      },
      select: { id: true, name: true, email: true, role: true },
    });

    await createSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json(
      { user, redirectTo: ROLE_HOME[user.role] },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "An account with this email already exists",
          fieldErrors: { email: ["An account with this email already exists"] },
        },
        { status: 409 }
      );
    }

    console.error("[auth/signup]", error);
    return NextResponse.json(
      { error: "Could not create your account. Please try again." },
      { status: 500 }
    );
  }
}
