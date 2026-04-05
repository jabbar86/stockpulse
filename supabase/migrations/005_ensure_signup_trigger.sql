-- Ensure signup trigger on auth.users (idempotent).
-- No-op if schema.sql or a prior run already created on_auth_user_created.

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
