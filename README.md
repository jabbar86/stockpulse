# stockpulse
Stock Analysis Dashboard

## Database

1. **Initial schema** (once per project): add `DATABASE_URL` to `.env.local` (Supabase → Settings → Database → URI; use **Session** or **direct** Postgres for DDL, not the transaction pooler if migrations fail).
2. **Apply base tables**: `npm run db:setup`
3. **Apply incremental migrations** (`supabase/migrations/*.sql`): `npm run db:migrate`

Migrations run automatically **before each production build** when `DATABASE_URL` is set (e.g. Vercel project env). If `DATABASE_URL` is missing, `prebuild` skips migrations so local `npm run build` still works.

Tracked in table `public.schema_migrations` — each file runs at most once per database.

**009** adds `profile_api_payload()` so `GET /api/profile` uses **one** database call instead of four parallel PostgREST requests (faster on production).

To skip migrations for a single build: `SKIP_DB_MIGRATE=1 npm run build`.

### Signup: “Database error saving new user”

1. Deploy with **`DATABASE_URL`** so migrations run through **`008`** ( **`006`–`008`** all (re)apply `GRANT EXECUTE … TO PUBLIC` if an early **`004`** revoked it from `handle_new_user`).
2. **Emergency (no deploy):** open Supabase → SQL Editor and run the full script **`supabase/manual-repair-signup.sql`** once.
3. Set **`SUPABASE_SERVICE_ROLE_KEY`** on the server (see `.env.example`). The app uses **`POST /api/profile/ensure`** if Auth exists but `profiles` is missing.
4. Orphan email cleanup is in **`007`** / the manual repair script.
