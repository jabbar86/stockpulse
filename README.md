# stockpulse
Stock Analysis Dashboard

## Database

1. **Initial schema** (once per project): add `DATABASE_URL` to `.env.local` (Supabase → Settings → Database → URI; use **Session** or **direct** Postgres for DDL, not the transaction pooler if migrations fail).
2. **Apply base tables**: `npm run db:setup`
3. **Apply incremental migrations** (`supabase/migrations/*.sql`): `npm run db:migrate`

Migrations run automatically **before each production build** when `DATABASE_URL` is set (e.g. Vercel project env). If `DATABASE_URL` is missing, `prebuild` skips migrations so local `npm run build` still works.

Tracked in table `public.schema_migrations` — each file runs at most once per database.

To skip migrations for a single build: `SKIP_DB_MIGRATE=1 npm run build`.

### Signup: “Database error saving new user”

1. Run all migrations through **`007_canonical_signup_profile.sql`** (Vercel `DATABASE_URL` + deploy, or `npm run db:migrate`). **`006`** restores `GRANT EXECUTE … TO PUBLIC` if an old `004` revoked it.
2. Set **`SUPABASE_SERVICE_ROLE_KEY`** on the server (see `.env.example`). The app calls **`POST /api/profile/ensure`** once per session if a user has Auth but no `profiles` row (backfill after a missed trigger).
3. In Supabase SQL Editor you can still paste migration files manually. Orphan cleanup is built into **`007`** (email rows without a matching `auth.users` id).
