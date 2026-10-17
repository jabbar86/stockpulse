import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/practice/reset - wipe practice trades and restore starting virtual cash
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await createServiceRoleClient().rpc('practice_reset', { p_user: user.id });
    if (error) {
      console.error('Practice reset error:', error);
      return NextResponse.json({ error: 'Failed to reset practice account' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Practice reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
