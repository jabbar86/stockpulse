import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in .env.local');
  console.error('');
  console.error('Get it from: Supabase Dashboard → Settings → Database → Connection string (URI)');
  console.error('It looks like: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres');
  console.error('');
  console.error('Add it to your .env.local file:');
  console.error('DATABASE_URL=postgresql://postgres.xxxx:your-password@aws-0-xx.pooler.supabase.com:6543/postgres');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function run() {
  console.log('Connecting to Supabase database...');
  await client.connect();
  console.log('Connected!\n');

  const schemaPath = resolve(__dirname, '..', 'supabase', 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf-8');

  console.log('Running schema.sql...');
  await client.query(sql);
  console.log('Schema created successfully!\n');

  // Verify tables exist
  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'broker_connections', 'holdings', 'analysis_cache', 'watchlist', 'analysis_history')
    ORDER BY table_name;
  `);

  console.log('Tables created:');
  rows.forEach((r) => console.log(`  ✓ ${r.table_name}`));
  console.log(`\nDone! ${rows.length}/6 tables ready.`);

  await client.end();
}

run().catch((err) => {
  console.error('Setup failed:', err.message);
  client.end();
  process.exit(1);
});
