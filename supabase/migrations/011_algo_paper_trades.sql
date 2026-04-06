-- Paper algo-trading log (simulated orders; not executed on a broker)

create table if not exists public.algo_paper_trades (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  symbol text not null,
  exchange text not null default 'NSE' check (exchange in ('NSE', 'BSE')),
  side text not null check (side in ('buy', 'sell', 'hold')),
  timeframe text not null default 'swing',
  quantity numeric,
  conviction numeric,
  reference_price numeric,
  stop_loss numeric,
  take_profit numeric,
  rationale text,
  source text not null default 'consensus' check (source in ('consensus', 'rules', 'ai')),
  signals_snapshot jsonb not null default '{}'::jsonb
);

create index if not exists idx_algo_paper_trades_user_created
  on public.algo_paper_trades (user_id, created_at desc);

alter table public.algo_paper_trades enable row level security;

create policy "Users read own algo paper trades"
  on public.algo_paper_trades for select
  using (auth.uid() = user_id);
