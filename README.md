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

Done: project structure, full Prisma schema, auth (splash, login, signup,
logout, session, middleware guards, role routing), portal and admin shells.

Next: catalogue and cart, checkout with deposit collection, quotation builder,
pickup/return workflows, late-fee engine, and wiring the dashboard KPIs to
live queries.
