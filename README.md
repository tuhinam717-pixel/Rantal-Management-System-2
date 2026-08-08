# Rental Management System

Full-stack rental operations platform built for the problem statement in
`Rental Management System.pdf`. Customers rent products through a portal;
admins run quotations, pickups, returns, security deposits and late fees from
a single operations dashboard.

## Tech stack

| Layer      | Choice                                        |
| ---------- | --------------------------------------------- |
| Framework  | Next.js 15 (App Router, Server Components)    |
| Language   | TypeScript (strict)                           |
| Styling    | Tailwind CSS v4                               |
| Database   | PostgreSQL + Prisma ORM                       |
| Auth       | HS256 JWT in an httpOnly cookie (`jose`)      |
| Passwords  | bcrypt, 12 rounds                             |
| Forms      | react-hook-form + zod                         |
| Icons      | lucide-react                                  |

## Getting started

```bash
npm install
```

### 1. Database

Point `DATABASE_URL` in `.env` at a PostgreSQL server, then:

```bash
npx prisma db push   # create the tables
npm run db:seed      # admin + customer, default pricelist, rental periods
```

> **Percent-encode special characters in the password.** A password containing
> `@`, `:`, `/` or `?` breaks the connection string — `Faizan@2005` must be
> written `Faizan%402005`, or the URL parses the wrong host.

If the database itself doesn't exist yet, create it once:

```sql
CREATE DATABASE rental_management;
```

To provision a dedicated non-superuser role instead of reusing `postgres`:

```powershell
.\scripts\setup-db.ps1 -PostgresPassword "<your postgres superuser password>"
```

No local Postgres? Use the bundled container — it publishes on host port
**5433** so it won't collide with a local install on 5432 (update
`DATABASE_URL` to match):

```bash
docker compose up -d
npx prisma db push
npm run db:seed
```

Also set a real `AUTH_SECRET` (32+ characters):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Run

```bash
npm run dev
```

Open http://localhost:3000 — the splash screen hands off to the login page.

The login page has **one-click demo sign-in buttons** for both roles, so you
never need to look these up. Remove `DEMO_ACCOUNTS` in `src/lib/constants.ts`
and its panel in `login-form.tsx` before any real deploy — it publishes working
credentials to anyone who opens the page.

### Demo accounts (created by the seed)

| Role     | Email                    | Password       |
| -------- | ------------------------ | -------------- |
| Admin    | `admin@rentflow.test`    | `Admin@123`    |
| Customer | `customer@rentflow.test` | `Customer@123` |

## Scripts

| Command              | What it does                        |
| -------------------- | ----------------------------------- |
| `npm run dev`        | Dev server                          |
| `npm run build`      | Generate Prisma client + prod build |
| `npm run typecheck`  | `tsc --noEmit`                      |
| `npm run db:push`    | Sync schema without a migration     |
| `npm run db:migrate` | Create a migration                  |
| `npm run db:studio`  | Prisma Studio                       |
| `npm run db:seed`    | Seed demo data                      |
| `npm run verify`     | Pricing, checkout, return + settlement |
| `npm run verify:crud` | Admin create/edit/delete paths       |

## Project structure

```
prisma/
  schema.prisma            Full domain model (see "Data model" below)
  seed.ts                  Admin + customer, default pricelist, rental periods
scripts/
  setup-db.ps1             One-shot local Postgres provisioning
src/
  middleware.ts            Route protection + role gating at the edge
  app/
    page.tsx               Splash screen
    (auth)/                Public auth screens — shared split-panel layout
      login/ signup/ forgot-password/
    (portal)/              Customer portal (requires a session)
      dashboard/ products/ cart/ checkout/ orders/ profile/
    (admin)/admin/         Admin backend (requires role=ADMIN)
      dashboard/ products/ pricelists/ rental-periods/ quotations/
      orders/ pickups/ returns/ deposits/ late-fees/ invoices/
      customers/ reports/ settings/
    api/
      auth/                signup · login · logout · me
      products/ cart/ orders/ quotations/ pricelists/ rental-periods/
      pickups/ returns/ deposits/ late-fees/ payments/ invoices/
      dashboard/ settings/
  components/
    ui/                    Button, Input, Alert, Logo
    auth/                  Login/signup forms, splash, password strength
    layout/                Chrome shared across portal and admin
    dashboard/ products/ cart/ orders/ pickup-return/ deposits/
    late-fees/ pricelists/ quotations/
  lib/
    prisma.ts              Hot-reload-safe Prisma singleton
    constants.ts           Cookie name, role landing pages, route guards
    utils.ts               cn(), currency and date formatting
    auth/
      jwt.ts               Edge-safe sign/verify (imported by middleware)
      session.ts           Cookie read/write (server only)
      password.ts          bcrypt hash/verify
      current-user.ts      getCurrentUser / requireUser / requireRole
    validations/auth.ts    zod schemas shared by client and API
    rental/                Pricing, deposit and late-fee logic (next milestone)
  server/
    services/              Business logic layer
    repositories/          Data access helpers
  hooks/ types/ config/
```

Route groups `(auth)`, `(portal)` and `(admin)` don't appear in URLs — they
exist so each area gets its own layout and access rule.

## Authentication

Implemented end to end:

- **Splash → Login → Sign Up → dashboard**, exactly as the brief specifies.
- Signup creates a `CUSTOMER` and an empty cart in one transaction; admins are
  provisioned via the seed or the admin console, so the public form can't mint
  privileged accounts.
- Session is an HS256 JWT in an httpOnly, `sameSite=lax` cookie (`secure` in
  production), signed with `AUTH_SECRET`.
- `middleware.ts` runs on the edge: unauthenticated hits on a protected route
  redirect to `/login?next=…`, non-admins are bounced off `/admin/*`, and
  signed-in users are kept off the auth screens.
- Login returns one message for both unknown-email and wrong-password, and
  still runs a bcrypt compare when the user doesn't exist, so responses can't
  be used to enumerate accounts.
- The same zod schemas validate on the client and again in the route handler.

## Data model

Covers all five modules from the brief:

1. **Operations dashboard** — derived from `RentalOrder`, `Pickup`, `Return`.
2. **Security deposits** — `SecurityDeposit` (fixed or percentage, with
   collected/held/refunded states) plus an append-only `DepositTransaction`
   ledger for full deposit history.
3. **Late return fees** — `LateFeeRule` (hourly/daily/weekly/monthly rate,
   grace period, optional cap) and the `LateFee` records it produces.
4. **Pickup & return** — schedules, route sequence, barcode, checklists, and
   `ReturnInspection` for condition, damage and missing accessories.
5. **Price & attributes** — one default `Pricelist` plus optional time-bound
   ones, per-period `PricelistItem` rates, and `ProductVariant`
   (brand, manufacturer, colour, size).

## Status

**Working end to end:**

- Auth — splash, login, signup, logout, session, middleware guards, role routing
- Pricing engine — billable units, pricelist resolution, fixed/percentage
  deposits, late fees with grace period and cap, deposit settlement
- Catalogue — 8 seeded products, category filter, search, product detail with
  rental-period and date selection
- Cart — add / update quantity / remove, live rent-vs-deposit split
- Checkout — delivery or store pickup, payment, and a single transaction that
  creates the order, lines, security deposit + opening ledger entry, rent and
  deposit payments, the invoice, the pickup and return schedules, reserves
  stock and empties the cart
- Orders — list, detail with deposit history, printable invoice
- Admin dashboard — all eight KPI tiles plus overdue / today's pickups /
  today's returns queues, from live queries
- Admin operations — rental orders with status filters, pickup schedule with
  route sequence and confirmation, return schedule with inspection and
  one-click settlement, deposit ledger, late-fee rules and charges
- Return settlement — overdue detection, penalty from the active late-fee rule,
  deduction from the deposit, cash refund of the balance, stock released, and a
  shortfall invoice when the penalty exceeds the deposit

`npm run verify` runs 40 assertions covering the pricing maths, a real checkout,
overdue detection and both settlement paths (late and on-time) against the
database. **It mutates data** — run `npm run db:seed` afterwards for a clean
demo state.

**Icons, not emoji.** The UI uses `lucide-react` components throughout; there
are no emoji or arrow glyphs in any rendered screen.

**Admin configuration (full create / edit / delete):**

- Products — create, edit, retire or delete, with fixed or percentage deposits
  and rates per rental period. A product with rental history is retired rather
  than deleted, so order records stay intact.
- Variants — add and remove brand / manufacturer / colour / size rows
- Pricelists — create time-bound lists, switch the default, activate and
  deactivate, and edit the whole product x period rate grid in one submit. The
  default list cannot be deleted, since that would leave the catalogue priced
  at nothing.
- Rental periods — create custom blocks (e.g. a 3-day weekend), toggle, delete;
  ones referenced by orders are deactivated instead
- Quotations — walk-in builder with live totals, then **confirm to create the
  order, deposit, payments, invoice and pickup/return schedule in one step**
- Quotation templates — header, footer and terms, with a default
- Late-fee rules — rate per hour/day/week/month, grace period, optional cap
- Org settings — company, currency, default deposit, grace hours, quotation
  validity
- Customers — records with rental counts, lifetime value and overdue flags

The admin console has its own dark-rail layout and grouped navigation
(Operations / Money / Configuration) so it is never mistaken for the customer
portal.

**Not built yet:** customer profile and address management, barcode/QR
scanning, and notifications. These are broken into small tickets in
[`docs/FRONTEND-TASKS.md`](docs/FRONTEND-TASKS.md).
