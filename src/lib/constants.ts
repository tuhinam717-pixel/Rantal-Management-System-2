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
  "/admin",
  "/vendor",
];

/** Prefixes that require an ADMIN session specifically. */
export const ADMIN_PREFIXES = ["/admin"];

/** Prefixes only a signed-in supplier may open. */
export const VENDOR_PREFIXES = ["/vendor"];

/** Auth screens an already-signed-in user should be bounced away from. */
export const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

/**
 * Demo quick-login is opt-in and off by default.
 *
 * Set NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true in .env for local demos only. Without
 * it the login page never renders credentials, so a deployed build can't leak
 * working accounts to anyone who opens the page.
 */
export const DEMO_LOGIN_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";

export const DEMO_ACCOUNTS = DEMO_LOGIN_ENABLED
  ? [
      {
        role: "ADMIN" as const,
        label: "Admin",
        hint: "Dashboard, pickups, returns, deposits",
        email: "admin@rentflow.test",
        password: "Admin@123",
      },
      {
        role: "CUSTOMER" as const,
        label: "Customer",
        hint: "Browse, rent, track orders",
        email: "customer@rentflow.test",
        password: "Customer@123",
      },
      {
        role: "VENDOR" as const,
        label: "Vendor",
        hint: "Supplied stock, rental activity, repairs",
        email: "vendor@rentflow.test",
        password: "Vendor@123",
      },
    ]
  : [];
