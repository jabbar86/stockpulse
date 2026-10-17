-- Per-user price alerts ("notify me when X goes above/below ₹Y"); checked by /api/cron/price-alerts

create table if not exists public.price_alerts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  symbol text not null,
  exchange text not null default 'NSE' check (exchange in ('NSE', 'BSE')),
  direction text not null check (direction in ('above', 'below')),
  target_price numeric not null check (target_price > 0),
  note text,
  triggered_at timestamptz,
  triggered_price numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_price_alerts_user_created
  on public.price_alerts (user_id, created_at desc);

create index if not exists idx_price_alerts_active
  on public.price_alerts (symbol)
  where triggered_at is null;

alter table public.price_alerts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'price_alerts' and policyname = 'Users read own price alerts'
  ) then
    create policy "Users read own price alerts" on public.price_alerts
      for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'price_alerts' and policyname = 'Users insert own price alerts'
  ) then
    create policy "Users insert own price alerts" on public.price_alerts
      for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'price_alerts' and policyname = 'Users update own price alerts'
  ) then
    create policy "Users update own price alerts" on public.price_alerts
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'price_alerts' and policyname = 'Users delete own price alerts'
  ) then
    create policy "Users delete own price alerts" on public.price_alerts
      for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Allow 'alert' notifications in the bell
alter table public.user_notifications drop constraint if exists user_notifications_kind_check;
alter table public.user_notifications add constraint user_notifications_kind_check
  check (kind in ('system', 'market', 'reminder', 'digest', 'alert'));
