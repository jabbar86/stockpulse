#!/usr/bin/env node
/**
 * Applies SQL files in supabase/migrations/ in lexical order, once per database.
 * Uses public.schema_migrations for bookkeeping (idempotent).
 *
 * Env: DATABASE_URL (required to run; optional locally if .env.local defines it)
 *
 * Supabase: prefer Session mode or direct Postgres (port 5432) for DDL; the
 * transaction pooler (6543) can reject some statements.
 */
import pg from 'pg';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local');
  if (!existsSync(p)) return;
  const text = readFileSync(p, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

if (process.env.SKIP_DB_MIGRATE === '1') {
  console.log('[db:migrate] SKIP_DB_MIGRATE=1 — skipping.');
  process.exit(0);
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log('[db:migrate] DATABASE_URL not set — skipping migrations (OK for local build without DB).');
  process.exit(0);
}

const migrationsDir = resolve(__dirname, '..', 'supabase', 'migrations');

async function run() {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (!files.length) {
    console.log('[db:migrate] No migration files found.');
    process.exit(0);
  }

  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('[db:migrate] Connected.\n');

  await client.query(`
    create table if not exists public.schema_migrations (
      id serial primary key,
      name text not null unique,
      applied_at timestamptz not null default now()
    );
  `);

  for (const file of files) {
    const { rows } = await client.query(
      'select 1 from public.schema_migrations where name = $1',
      [file]
    );
    if (rows.length > 0) {
      console.log(`[db:migrate] skip ${file}`);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    console.log(`[db:migrate] apply ${file}`);

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('insert into public.schema_migrations (name) values ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[db:migrate] ok   ${file}\n`);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(`[db:migrate] FAILED ${file}:`, e.message);
      throw e;
    }
  }

  await client.end();
  console.log('[db:migrate] Done.');
}

run().catch(() => {
  process.exit(1);
});
