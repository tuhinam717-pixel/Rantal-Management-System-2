import { NextResponse, type NextRequest } from "next/server";

import { verifySession } from "@/lib/auth/jwt";
import {
  ADMIN_PREFIXES,
  AUTH_ROUTES,
  PROTECTED_PREFIXES,
  ROLE_HOME,
  SESSION_COOKIE,
  VENDOR_PREFIXES,
} from "@/lib/constants";

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  // Signed-in users have no business on the login / signup screens.
  if (session && matches(pathname, AUTH_ROUTES)) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url));
  }

  if (matches(pathname, PROTECTED_PREFIXES)) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }

    /*
      A vendor gets the vendor portal and nothing else.

      Stated as "everything outside /vendor" rather than a list of customer
      prefixes on purpose: the customer routes include cart and checkout, so a
      supplier who wandered in could place a rental order against the business
      they supply. Admins are deliberately still allowed into the customer
      portal — the admin rail links to it.
    */
    const wrongRole =
      (session.role === "VENDOR" && !matches(pathname, VENDOR_PREFIXES)) ||
      (session.role !== "VENDOR" && matches(pathname, VENDOR_PREFIXES)) ||
      (matches(pathname, ADMIN_PREFIXES) && session.role !== "ADMIN");

    if (wrongRole) {
      return NextResponse.redirect(
        new URL(ROLE_HOME[session.role] ?? "/dashboard", request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next internals, the API and static assets.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
