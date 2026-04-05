-- 004 previously ran REVOKE ALL ... FROM PUBLIC on handle_new_user(), which can break
-- hosted Supabase signups. Restore execute for all roles (Postgres PUBLIC pseudo-role).

grant execute on function public.handle_new_user() to PUBLIC;
