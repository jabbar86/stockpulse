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

  console.log('Updating broker_connections.broker constraint...');
  await client.query(`
    ALTER TABLE broker_connections
    DROP CONSTRAINT IF EXISTS broker_connections_broker_check;
  `);
  await client.query(`
    ALTER TABLE broker_connections
    ADD CONSTRAINT broker_connections_broker_check
    CHECK (broker IN ('upstox'));
  `);
  console.log('  ✓ broker_connections.broker now only allows: upstox\n');

  console.log('Updating holdings.source constraint...');
  await client.query(`
    ALTER TABLE holdings
    DROP CONSTRAINT IF EXISTS holdings_source_check;
  `);
  await client.query(`
    ALTER TABLE holdings
    ADD CONSTRAINT holdings_source_check
    CHECK (source IN ('manual', 'upstox'));
  `);
  console.log('  ✓ holdings.source now only allows: manual, upstox\n');

  console.log('Done! Zerodha references removed from DB constraints.');
  await client.end();
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  client.end();
  process.exit(1);
});
