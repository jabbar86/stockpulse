import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function run() {
  console.log('Connecting to database...');
  await client.connect();
  console.log('Connected!\n');

  console.log('Creating market_news table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS market_news (
      id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
      title text NOT NULL,
      summary text,
      url text NOT NULL UNIQUE,
      source text NOT NULL,
      category text NOT NULL DEFAULT 'general',
      image_url text,
      published_at timestamptz NOT NULL DEFAULT now(),
      scraped_at timestamptz DEFAULT now()
    );
  `);
  console.log('  ✓ market_news table created\n');

  console.log('Creating indexes...');
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_market_news_published ON market_news(published_at DESC);
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_market_news_category ON market_news(category);
  `);
  console.log('  ✓ indexes created\n');

  console.log('Enabling RLS...');
  await client.query(`
    ALTER TABLE market_news ENABLE ROW LEVEL SECURITY;
  `);
  console.log('  ✓ RLS enabled\n');

  console.log('Creating RLS policies...');
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'market_news' AND policyname = 'Anyone can read market news'
      ) THEN
        CREATE POLICY "Anyone can read market news" ON market_news FOR SELECT USING (true);
      END IF;
    END $$;
  `);
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'market_news' AND policyname = 'Service can manage market news'
      ) THEN
        CREATE POLICY "Service can manage market news" ON market_news FOR ALL USING (true);
      END IF;
    END $$;
  `);
  console.log('  ✓ RLS policies created\n');

  // Verify
  const { rows } = await client.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'market_news' ORDER BY ordinal_position;
  `);
  console.log('market_news columns:');
  rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

  console.log('\nDone! market_news table is ready.');
  await client.end();
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  client.end();
  process.exit(1);
});
