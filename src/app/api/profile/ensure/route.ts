import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/profile/ensure — create public.profiles row if Auth has a user but trigger missed.
 * Uses service role only after cookie session is verified (same user id).
 */
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceRoleClient();
  const { data: existing } = await service
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, created: false });
  }

  const email =
    user.email?.trim() ||
    `${user.id}@signup.local`;
  const name =
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) || '';

  const { error } = await service.from('profiles').insert({
    id: user.id,
    email,
    name,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: true });
}
