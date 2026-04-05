-- Today hub: journal, SIP-style reminders, optional email digest
-- Idempotent: IF NOT EXISTS tables/indexes; RLS policies via pg_policies checks.

create table if not exists daily_journal (
  user_id uuid references public.profiles(id) on delete cascade not null,
  journal_date date not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, journal_date)
);

create table if not exists monthly_reminders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  label text not null,
  day_of_month integer not null check (day_of_month >= 1 and day_of_month <= 28),
  note text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists digest_preferences (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  email_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists idx_monthly_reminders_user on monthly_reminders(user_id);
create index if not exists idx_daily_journal_user_date on daily_journal(user_id, journal_date desc);

alter table daily_journal enable row level security;
alter table monthly_reminders enable row level security;
alter table digest_preferences enable row level security;

-- Idempotent policies (re-runs after partial/manual setup must not fail the build)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_journal' and policyname = 'Users manage own journal'
  ) then
    create policy "Users manage own journal" on daily_journal
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'monthly_reminders' and policyname = 'Users manage own reminders'
  ) then
    create policy "Users manage own reminders" on monthly_reminders
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'digest_preferences' and policyname = 'Users manage own digest prefs'
  ) then
    create policy "Users manage own digest prefs" on digest_preferences
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
