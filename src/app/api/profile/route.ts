import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/profile - fetch current user profile
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uid = user.id;

    const [
      { data: profile, error: profileError },
      { count: totalAnalyses },
      { count: holdingsCount },
      { count: brokerCount },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, email, is_premium, max_ai_analyses, created_at')
        .eq('id', uid)
        .single(),
      supabase
        .from('analysis_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('type', 'ai')
        .eq('cached', false),
      supabase
        .from('holdings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid),
      supabase
        .from('broker_connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('status', 'connected'),
    ]);

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        ...profile,
        ai_analyses_used: totalAnalyses ?? 0,
        holdings_count: holdingsCount ?? 0,
        broker_connections: brokerCount ?? 0,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/profile - update user profile
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (name.trim().length > 100) {
      return NextResponse.json({ error: 'Name is too long' }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('id, name, email, is_premium, max_ai_analyses, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
