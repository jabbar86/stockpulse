import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { searchMutualFunds } from '@/lib/mutual-funds/mfapi';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get('q') || '';
    const results = await searchMutualFunds(q);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('MF search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

