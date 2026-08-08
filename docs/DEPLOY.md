# Deploying to Vercel

## The one thing that must change first

Locally the app talks to PostgreSQL on `localhost:5432`. **Vercel cannot reach
your laptop.** Serverless functions run in Vercel's cloud, so the database has
to be reachable from the internet.

So before deploying you need a hosted Postgres. Any of these work:

| Provider | Free tier | Notes |
| --- | --- | --- |
| **Neon** | Yes | Fastest to set up, built for serverless, gives you both a pooled and a direct URL |
| **Supabase** | Yes | Works well, but you must pick the right two of its three strings — see below |
| Vercel Postgres | Yes | Runs on Neon; auto-injects env vars into the project |

## Why two database URLs

```
DATABASE_URL  -> pooled connection   (used by the app at runtime)
DIRECT_URL    -> direct connection   (used by `prisma migrate deploy`)
```

Serverless functions open a lot of short-lived connections, which exhausts a
plain Postgres server — hence the pooler. But poolers in transaction mode can't
run the DDL that migrations issue, so migrations need the direct host. Neon and
Supabase both hand you both strings.

Locally, both point at the same server.

## Steps

### 1. Create the database

Sign up at [neon.tech](https://neon.tech), create a project, and copy the two
connection strings from the dashboard:

- **Pooled** — the host contains `-pooler`
- **Direct** — the same host without `-pooler`

> If your password contains `@`, `:`, `/` or `?`, percent-encode it
> (`@` becomes `%40`) or the connection string parses the wrong host.

#### If you use Supabase

Supabase offers three connection strings and the choice matters:

| Shown as | Port | Use it for |
| --- | --- | --- |
| Direct connection | 5432 | **Don't.** New projects are IPv6-only here, and Vercel can't reach it |
| **Transaction pooler** | **6543** | `DATABASE_URL` |
| **Session pooler** | **5432** | `DIRECT_URL` |

Both pooler strings live on `aws-0-<region>.pooler.supabase.com`, which is IPv4,
so Vercel can reach them.

The transaction pooler needs `?pgbouncer=true` or Prisma fails at runtime with
`prepared statement "s0" already exists` — pgbouncer in transaction mode reuses
connections, so prepared statements must be turned off:

```
DATABASE_URL="postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

`connection_limit=1` keeps each serverless function to a single connection,
which is what you want when many functions run concurrently.

### 2. Push the code

```bash
git add -A
git commit -m "Prepare for deployment"
git push
```

### 3. Link the project

```bash
vercel link
```

### 4. Set environment variables

Generate a fresh production secret — **do not reuse the local one**:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then add each variable (you'll be prompted to paste the value):

```bash
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add AUTH_SECRET production
vercel env add NEXT_PUBLIC_APP_NAME production      # RentFlow
vercel env add NEXT_PUBLIC_APP_URL production       # https://<your-app>.vercel.app
```

**Do not set `NEXT_PUBLIC_ENABLE_DEMO_LOGIN`** unless you want the one-click
demo sign-in buttons on the public login page. They publish working credentials
to anyone who opens the URL. For a judged demo that may be exactly what you
want — just be aware, and remove it afterwards.

### 5. Deploy

```bash
vercel --prod
```

The build runs `prisma generate && prisma migrate deploy && next build`, so the
schema is created on the cloud database automatically during the first deploy.

### 6. Seed the demo data

Migrations create empty tables. To load the 24 products, 7 customers and 10
rental orders, run the seed against the production database from your machine:

```bash
# PowerShell
$env:DATABASE_URL="<your pooled url>"
$env:DIRECT_URL="<your direct url>"
npm run db:seed
```

Then sign in at `https://<your-app>.vercel.app` with
`admin@rentflow.test` / `Admin@123`.

## Troubleshooting

**Build fails with `Can't reach database server`** — `DATABASE_URL`/`DIRECT_URL`
are missing or wrong on Vercel. Check with `vercel env ls`.

**`prepared statement "s0" already exists`** — either `DATABASE_URL` is missing
`?pgbouncer=true`, or you used a transaction-mode pooler for `DIRECT_URL`.
Migrations need a session-mode or direct connection.

**`Can't reach database server` on Supabase specifically** — you probably used
the "Direct connection" string. It is IPv6-only on new projects; switch to the
session pooler for `DIRECT_URL`.

**Images don't load** — `next.config.ts` only allows `images.unsplash.com` and
`res.cloudinary.com`. Add any other host to `remotePatterns`.

**Everything 500s after deploy** — usually `AUTH_SECRET` is missing or shorter
than 32 characters. The session signer throws on startup by design.
