export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "RentFlow";

export const SESSION_COOKIE = "rms_session";

/** Where each role lands after a successful login / signup. */
export const ROLE_HOME = {
  ADMIN: "/admin/dashboard",
  CUSTOMER: "/dashboard",
  VENDOR: "/vendor/dashboard",
} as const;

/** Prefixes that require any authenticated session. */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/products",
  "/cart",
  "/checkout",
  "/orders",
  "/profile",
  "/tracking",
  "/quotations",
  "/notifications",
  "/admin",
  "/vendor",
];

/** Prefixes that require an ADMIN session specifically. */
export const ADMIN_PREFIXES = ["/admin"];

/** Prefixes only a signed-in supplier may open. */
export const VENDOR_PREFIXES = ["/vendor"];

/** Auth screens an already-signed-in user should be bounced away from. */
export const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

