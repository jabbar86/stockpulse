-- StockAnalysis Platform Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends NextAuth)
create table if not exists profiles (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  name text not null default '',
  password_hash text,
  provider text default 'credentials',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Broker connections
create table if not exists broker_connections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  broker text not null check (broker in ('upstox', 'zerodha')),
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
  source text not null default 'manual' check (source in ('manual', 'upstox', 'zerodha')),
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

-- Indexes
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

-- RLS Policies: users can only access their own data
create policy "Users can view own profile" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (true);
create policy "Anyone can insert profile" on profiles for insert with check (true);

create policy "Users can view own broker connections" on broker_connections for select using (true);
create policy "Users can manage own broker connections" on broker_connections for all using (true);

create policy "Users can view own holdings" on holdings for select using (true);
create policy "Users can manage own holdings" on holdings for all using (true);

create policy "Users can view own watchlist" on watchlist for select using (true);
create policy "Users can manage own watchlist" on watchlist for all using (true);

create policy "Users can view own analysis history" on analysis_history for select using (true);
create policy "Users can insert analysis history" on analysis_history for insert with check (true);

-- Analysis cache is shared (readable by all, writable by service role)
create policy "Anyone can read analysis cache" on analysis_cache for select using (true);
create policy "Service can manage analysis cache" on analysis_cache for all using (true);
