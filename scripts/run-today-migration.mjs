import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set (use: node --env-file=.env.local scripts/run-today-migration.mjs)');
  process.exit(1);
}

const migrationPath = resolve(__dirname, '..', 'supabase', 'migrations', '002_today_workspace.sql');
const sql = readFileSync(migrationPath, 'utf-8');

const client = new pg.Client({ connectionString: DATABASE_URL });

try {
  console.log('Connecting…');
  await client.connect();
  console.log('Applying supabase/migrations/002_today_workspace.sql …');
  await client.query(sql);
  console.log('Done. Tables: daily_journal, monthly_reminders, digest_preferences (+ RLS).');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
