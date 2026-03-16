import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

const SUPPORT_SQL = `
create table if not exists support_requests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  subject text not null,
  category text not null default 'general' check (category in ('general', 'bug', 'feature', 'billing')),
  message text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  created_at timestamptz default now()
);

alter table support_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'support_requests' and policyname = 'Users can view own support requests'
  ) then
    create policy "Users can view own support requests"
  on support_requests for select using (auth.uid() = user_id);

  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'support_requests' and policyname = 'Users can insert support requests'
  ) then
    create policy "Users can insert support requests"
  on support_requests for insert with check (auth.uid() = user_id);

  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'support_requests' and policyname = 'Service can manage support requests'
  ) then
    create policy "Service can manage support requests"
  on support_requests for all using (true);
  end if;
end
$$;
`;

async function run() {
  console.log('Connecting to Supabase database...');
  await client.connect();
  console.log('Connected!\n');

  console.log('Creating support_requests table and policies (if missing)...');
  await client.query(SUPPORT_SQL);
  console.log('support_requests ready.\n');

  await client.end();
}

run().catch((err) => {
  console.error('add-support-table failed:', err.message);
  client.end();
  process.exit(1);
});

