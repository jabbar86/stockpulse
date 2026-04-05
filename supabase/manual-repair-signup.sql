-- ---------------------------------------------------------------------------
-- ONE-TIME REPAIR (paste in Supabase → SQL Editor as postgres)
-- Use if signup fails with "Database error saving new user" after a bad deploy
-- or if migrations 006–008 never ran. Keeps in sync with migrations 007 + 005.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null then
    delete from public.profiles p
    where p.email = new.email
      and not exists (select 1 from auth.users u where u.id = p.id);
  end if;

  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(nullif(trim(new.email), ''), new.id::text || '@signup.local'),
    coalesce(new.raw_user_meta_data->>'name', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    updated_at = now();

  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;

grant execute on function public.handle_new_user() to PUBLIC;

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on t.tgrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'auth'
      and c.relname = 'users'
      and t.tgname = 'on_auth_user_created'
      and not t.tgisinternal
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;
