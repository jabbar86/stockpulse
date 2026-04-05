-- Fix signup: "Database error saving new user" — baseline trigger hardening.
-- Idempotent. Full canonical behaviour (search_path '', orphans, upsert) is in 007.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;

-- Optional: remove profile rows with no auth user (fixes unique(email) after bad deletes)
-- delete from public.profiles p
-- where not exists (select 1 from auth.users u where u.id = p.id);
