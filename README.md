# stockpulse
Stock Analysis Dashboard

## Database

1. **Initial schema** (once per project): add `DATABASE_URL` to `.env.local` (Supabase → Settings → Database → URI; use **Session** or **direct** Postgres for DDL, not the transaction pooler if migrations fail).
2. **Apply base tables**: `npm run db:setup`
3. **Apply incremental migrations** (`supabase/migrations/*.sql`): `npm run db:migrate`

Migrations run automatically **before each production build** when `DATABASE_URL` is set (e.g. Vercel project env). If `DATABASE_URL` is missing, `prebuild` skips migrations so local `npm run build` still works.

Tracked in table `public.schema_migrations` — each file runs at most once per database.

To skip migrations for a single build: `SKIP_DB_MIGRATE=1 npm run build`.
