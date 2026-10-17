-- Practice trading: virtual-cash account + simulated fills at live quotes (beginner-friendly, no broker).

create table if not exists public.practice_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  starting_cash numeric not null default 100000 check (starting_cash > 0),
  cash numeric not null default 100000 check (cash >= 0),
  reset_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.practice_trades (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  symbol text not null,
  exchange text not null default 'NSE' check (exchange in ('NSE', 'BSE')),
  side text not null check (side in ('buy', 'sell')),
  quantity numeric not null check (quantity > 0),
  price numeric not null check (price > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_practice_trades_user_created
  on public.practice_trades (user_id, created_at desc);

alter table public.practice_accounts enable row level security;
alter table public.practice_trades enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'practice_accounts' and policyname = 'Users read own practice account'
  ) then
    create policy "Users read own practice account" on public.practice_accounts
      for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'practice_trades' and policyname = 'Users read own practice trades'
  ) then
    create policy "Users read own practice trades" on public.practice_trades
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- Writes only via service_role through these functions (row lock prevents double-spend).

create or replace function public.practice_execute_trade(
  p_user uuid,
  p_symbol text,
  p_exchange text,
  p_side text,
  p_quantity numeric,
  p_price numeric
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.practice_accounts%rowtype;
  held numeric;
  amount numeric := p_quantity * p_price;
  trade_id uuid;
begin
  if p_side not in ('buy', 'sell') or p_quantity <= 0 or p_price <= 0 then
    raise exception 'invalid_order';
  end if;

  insert into public.practice_accounts (user_id) values (p_user)
    on conflict (user_id) do nothing;

  select * into acct from public.practice_accounts where user_id = p_user for update;

  if p_side = 'buy' then
    if amount > acct.cash then
      raise exception 'insufficient_cash';
    end if;
    update public.practice_accounts set cash = cash - amount where user_id = p_user;
  else
    select coalesce(sum(case when side = 'buy' then quantity else -quantity end), 0)
      into held
      from public.practice_trades
      where user_id = p_user and symbol = p_symbol;
    if p_quantity > held then
      raise exception 'insufficient_quantity';
    end if;
    update public.practice_accounts set cash = cash + amount where user_id = p_user;
  end if;

  insert into public.practice_trades (user_id, symbol, exchange, side, quantity, price)
    values (p_user, p_symbol, p_exchange, p_side, p_quantity, p_price)
    returning id into trade_id;

  return json_build_object(
    'trade_id', trade_id,
    'cash', (select cash from public.practice_accounts where user_id = p_user)
  );
end;
$$;

create or replace function public.practice_reset(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.practice_trades where user_id = p_user;
  insert into public.practice_accounts (user_id) values (p_user)
    on conflict (user_id) do update
      set cash = public.practice_accounts.starting_cash, reset_at = now();
end;
$$;

revoke all on function public.practice_execute_trade(uuid, text, text, text, numeric, numeric) from public;
revoke all on function public.practice_reset(uuid) from public;
grant execute on function public.practice_execute_trade(uuid, text, text, text, numeric, numeric) to service_role;
grant execute on function public.practice_reset(uuid) to service_role;
