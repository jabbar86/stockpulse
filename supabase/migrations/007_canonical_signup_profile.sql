-- Canonical signup profile: matches Supabase docs (search_path '') + resilience.
-- - Clears orphan profile rows that block unique(email) when re-signing up.
-- - ON CONFLICT (id) upserts if the trigger retries the same user id.
-- - EXECUTE for PUBLIC (hosted Auth expectation).

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
