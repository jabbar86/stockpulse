-- Per-user in-app notifications (bell in dashboard header)

create table if not exists public.user_notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link_href text,
  kind text not null default 'system' check (kind in ('system', 'market', 'reminder', 'digest')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notifications_user_created
  on public.user_notifications (user_id, created_at desc);

create index if not exists idx_user_notifications_user_unread
  on public.user_notifications (user_id)
  where read_at is null;

-- One welcome row per user (idempotent insert from API)
create unique index if not exists uniq_user_welcome_notification
  on public.user_notifications (user_id)
  where title = 'Welcome to StockPulse';

alter table public.user_notifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_notifications' and policyname = 'Users read own notifications'
  ) then
    create policy "Users read own notifications" on public.user_notifications
      for select using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_notifications' and policyname = 'Users update own notifications'
  ) then
    create policy "Users update own notifications" on public.user_notifications
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Inserts only via service_role (cron, welcome seed); no client insert policy
