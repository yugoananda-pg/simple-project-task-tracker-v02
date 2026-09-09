# Supabase security notes

This app uses **Supabase Auth** for identity and **Prisma** (direct PostgreSQL connection) for all data access. It does **not** query `public.*` tables through the Supabase Data API from the browser.

## Row Level Security (RLS)

### What the warning means

Supabase exposes the `public` schema to PostgREST (`anon` / `authenticated` roles). If RLS is **disabled**, anyone with the project **anon key** could read or write tables directly — bypassing our Server Action RBAC.

### What we did

Migration `20260901170000_enable_rls_harden_public_schema`:

1. **Enables RLS** on all application tables plus `_prisma_migrations`.
2. **Revokes** `SELECT`/`INSERT`/`UPDATE`/`DELETE` from `anon` and `authenticated` on those tables.

No permissive RLS policies are added. Direct API access is denied; the Next.js server continues to use Prisma as the `postgres` role, which **bypasses RLS**.

### Development impact

- `npm run dev`, Server Actions, migrations, and `npx prisma db seed` — **unchanged**.
- Do **not** add Supabase client `.from('Task')` queries without also adding proper RLS policies.

## Unused index on `Task.assigneeId`

Tasks are loaded by `projectId` only. The `assigneeId` index was unused and removed to clear the advisor warning. Re-add via a new migration if you introduce cross-project “my tasks” queries.

## Leaked password protection (Auth dashboard)

This is **not** configurable in SQL. Enable it in the Supabase Dashboard:

1. **Authentication** → **Providers** → **Email**
2. Turn on **Prevent use of leaked passwords** (Have I Been Pwned check)

Recommended for production; safe to enable during development (only affects new/changed passwords).

## Quick verification after migration

```bash
npx prisma migrate deploy
npm run dev
```

Sign in, open a project, move a Kanban card, and run a seed if needed — all should behave as before.
