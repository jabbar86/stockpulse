import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const addSchema = z.object({
  symbol: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  exchange: z.enum(['NSE', 'BSE']).default('NSE'),
});

export const maxDuration = 30;

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient
      .from('watchlist')
      .select('id,symbol,name,exchange,added_at')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    console.error('Watchlist GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = addSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { symbol, name, exchange } = parsed.data;

    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient
      .from('watchlist')
      .upsert(
        {
          user_id: userId,
          symbol,
          name,
          exchange,
        },
        { onConflict: 'user_id,symbol' }
      )
      .select()
      .single();

    if (error) {
      console.error('Watchlist POST error:', error);
      return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 });
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    console.error('Watchlist POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();
    const { error } = await serviceClient
      .from('watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('symbol', symbol.toUpperCase());

    if (error) {
      console.error('Watchlist DELETE error:', error);
      return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Watchlist DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

