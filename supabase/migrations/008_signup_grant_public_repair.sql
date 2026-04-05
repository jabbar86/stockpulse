-- Repair legacy 004 that used REVOKE ALL ... FROM PUBLIC on handle_new_user().
-- Hosted Supabase Auth needs EXECUTE on this function for the auth.users trigger.
-- Idempotent: GRANT is safe to repeat.

grant execute on function public.handle_new_user() to PUBLIC;
