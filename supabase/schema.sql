-- StockAnalysis Platform Database Schema (Supabase Auth)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (linked to Supabase auth.users)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  name text not null default '',
  is_premium boolean not null default false,
  max_ai_analyses integer not null default 5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Broker connections
create table if not exists broker_connections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  broker text not null check (broker in ('upstox')),
  access_token text not null,
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'expired')),
  last_synced timestamptz,
  created_at timestamptz default now(),
  unique(user_id, broker)
);

-- Holdings
create table if not exists holdings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  symbol text not null,
  name text not null,
  exchange text not null default 'NSE' check (exchange in ('NSE', 'BSE')),
  quantity numeric not null check (quantity > 0),
  avg_price numeric not null check (avg_price >= 0),
  source text not null default 'manual' check (source in ('manual', 'upstox')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, symbol, source)
);

-- Analysis cache (shared across users)
create table if not exists analysis_cache (
  id uuid default uuid_generate_v4() primary key,
  symbol text not null,
  type text not null check (type in ('technical', 'ai')),
  data jsonb not null,
  created_at timestamptz default now(),
  unique(symbol, type)
);

-- Watchlist
create table if not exists watchlist (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  symbol text not null,
  name text not null,
  exchange text not null default 'NSE' check (exchange in ('NSE', 'BSE')),
  added_at timestamptz default now(),
  unique(user_id, symbol)
);

-- Analysis history (for rate limiting and reference)
create table if not exists analysis_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  symbol text not null,
  type text not null check (type in ('technical', 'ai')),
  cached boolean default false,
  created_at timestamptz default now()
);

-- Market news (scraped daily, shared across users)
create table if not exists market_news (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  summary text,
  url text not null unique,
  source text not null,
  category text not null default 'general',
  image_url text,
  published_at timestamptz not null default now(),
  scraped_at timestamptz default now()
);

-- Premium access requests
create table if not exists premium_requests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text,
  email text not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- Support inquiries
create table if not exists support_requests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  subject text not null,
  category text not null default 'general' check (category in ('general', 'bug', 'feature', 'billing')),
  message text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_market_news_published on market_news(published_at desc);
create index if not exists idx_market_news_category on market_news(category);
create index if not exists idx_holdings_user_id on holdings(user_id);
create index if not exists idx_broker_connections_user_id on broker_connections(user_id);
create index if not exists idx_analysis_cache_symbol_type on analysis_cache(symbol, type);
create index if not exists idx_analysis_history_user_created on analysis_history(user_id, created_at);
create index if not exists idx_watchlist_user_id on watchlist(user_id);

-- Row Level Security
alter table profiles enable row level security;
alter table broker_connections enable row level security;
alter table holdings enable row level security;
alter table watchlist enable row level security;
alter table analysis_history enable row level security;
alter table analysis_cache enable row level security;
alter table market_news enable row level security;
alter table premium_requests enable row level security;
alter table support_requests enable row level security;

-- RLS Policies: users can only access their own data
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Users can view own broker connections" on broker_connections for select using (auth.uid() = user_id);
create policy "Users can manage own broker connections" on broker_connections for all using (auth.uid() = user_id);

create policy "Users can view own holdings" on holdings for select using (auth.uid() = user_id);
create policy "Users can manage own holdings" on holdings for all using (auth.uid() = user_id);

create policy "Users can view own watchlist" on watchlist for select using (auth.uid() = user_id);
create policy "Users can manage own watchlist" on watchlist for all using (auth.uid() = user_id);

create policy "Users can view own analysis history" on analysis_history for select using (auth.uid() = user_id);
create policy "Users can insert analysis history" on analysis_history for insert with check (auth.uid() = user_id);

-- Analysis cache is shared (readable by all, writable by service role)
create policy "Anyone can read analysis cache" on analysis_cache for select using (true);
create policy "Service can manage analysis cache" on analysis_cache for all using (true);

-- Market news is readable by all authenticated users, writable by service role
create policy "Anyone can read market news" on market_news for select using (true);
create policy "Service can manage market news" on market_news for all using (true);

-- Premium requests: users can view their own, service role manages all
create policy "Users can view own premium requests" on premium_requests for select using (auth.uid() = user_id);
create policy "Users can insert premium requests" on premium_requests for insert with check (auth.uid() = user_id);
create policy "Service can manage premium requests" on premium_requests for all using (true);

-- Support requests: users can view their own, service role manages all
create policy "Users can view own support requests" on support_requests for select using (auth.uid() = user_id);
create policy "Users can insert support requests" on support_requests for insert with check (auth.uid() = user_id);
create policy "Service can manage support requests" on support_requests for all using (true);
