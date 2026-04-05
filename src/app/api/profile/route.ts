import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const cacheHeaders = {
  'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
};

// GET /api/profile — single RPC (see migration 009) to avoid 4 round-trips to PostgREST
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('profile_api_payload');

    if (error) {
      const lower = (error.message || '').toLowerCase();
      if (
        lower.includes('jwt') ||
        lower.includes('permission denied') ||
        lower.includes('not authorized')
      ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      console.error('GET /api/profile rpc', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(data, { headers: cacheHeaders });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/profile - update user profile
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
