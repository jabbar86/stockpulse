import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/migrate-ai-infrastructure.mjs');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function run() {
  console.log('Connecting to database...');
  await client.connect();
  console.log('Connected!\n');

  // Phase 2: Extend analysis_cache with model and prompt_hash columns
  console.log('Phase 2: Extending analysis_cache table...');
  await client.query(`
    ALTER TABLE analysis_cache ADD COLUMN IF NOT EXISTS model text;
    ALTER TABLE analysis_cache ADD COLUMN IF NOT EXISTS prompt_hash text;
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_analysis_cache_prompt_hash ON analysis_cache(prompt_hash);
  `);
  console.log('  ✓ analysis_cache extended with model + prompt_hash\n');

  // Phase 3: Create ai_briefs table for morning briefs
  console.log('Phase 3: Creating ai_briefs table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_briefs (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      date text NOT NULL,
      content jsonb NOT NULL,
      model text,
      created_at timestamptz DEFAULT now(),
      UNIQUE(user_id, date)
    );
  `);
  await client.query(`
    ALTER TABLE ai_briefs ENABLE ROW LEVEL SECURITY;
  `);
  // RLS policies (safe to run multiple times with IF NOT EXISTS-like approach)
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own briefs' AND tablename = 'ai_briefs') THEN
        CREATE POLICY "Users read own briefs" ON ai_briefs FOR SELECT USING (auth.uid() = user_id);
      END IF;
    END $$;
  `);
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service manages briefs' AND tablename = 'ai_briefs') THEN
        CREATE POLICY "Service manages briefs" ON ai_briefs FOR ALL USING (true);
      END IF;
    END $$;
  `);
  console.log('  ✓ ai_briefs table created with RLS\n');

  console.log('All migrations complete!');
  await client.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  client.end();
  process.exit(1);
});
