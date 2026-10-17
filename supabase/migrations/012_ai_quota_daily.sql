-- AI analysis quota is per IST calendar day (matches "5 AI analyses per day" on pricing).

create or replace function public.profile_api_payload()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when auth.uid() is null then null::json
      when not exists (select 1 from public.profiles pr where pr.id = auth.uid()) then null::json
      else (
        select json_build_object(
          'id', p.id,
          'name', p.name,
          'email', p.email,
          'is_premium', p.is_premium,
          'max_ai_analyses', p.max_ai_analyses,
          'created_at', p.created_at,
          'ai_analyses_used',
            (select count(*)::int
             from public.analysis_history h
             where h.user_id = p.id and h.type = 'ai' and h.cached = false
               and h.created_at >= (date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')),
          'holdings_count',
            (select count(*)::int from public.holdings ho where ho.user_id = p.id),
          'broker_connections',
            (select count(*)::int
             from public.broker_connections b
             where b.user_id = p.id and b.status = 'connected')
        )
        from public.profiles p
        where p.id = auth.uid()
      )
    end;
$$;

alter function public.profile_api_payload() owner to postgres;

revoke all on function public.profile_api_payload() from public;
grant execute on function public.profile_api_payload() to authenticated;
grant execute on function public.profile_api_payload() to service_role;
