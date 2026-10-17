import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { MAX_ACTIVE_ALERTS } from '@/lib/alerts/price-alerts';

const createSchema = z.object({
  symbol: z.string().min(1).max(20),
  exchange: z.enum(['NSE', 'BSE']).default('NSE'),
  direction: z.enum(['above', 'below']),
  target_price: z.number().positive().max(10_000_000),
  note: z.string().max(200).optional(),
});

export const maxDuration = 30;

async function getUserId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// GET /api/alerts?symbol=RELIANCE — list the user's alerts (optionally for one symbol)
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const symbol = new URL(request.url).searchParams.get('symbol');
    const serviceClient = createServiceRoleClient();
    let query = serviceClient
      .from('price_alerts')
      .select('id,symbol,exchange,direction,target_price,note,triggered_at,triggered_price,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (symbol) query = query.eq('symbol', symbol.toUpperCase());

    const { data, error } = await query;
    if (error) {
      console.error('Alerts GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [], maxActive: MAX_ACTIVE_ALERTS });
  } catch (error) {
    console.error('Alerts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/alerts — create an alert
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const { count } = await serviceClient
      .from('price_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('triggered_at', null);

    if ((count ?? 0) >= MAX_ACTIVE_ALERTS) {
      return NextResponse.json(
        { error: `You can have up to ${MAX_ACTIVE_ALERTS} active alerts. Delete one to add another.` },
        { status: 429 }
      );
    }

    const { symbol, exchange, direction, target_price, note } = parsed.data;
    const { data, error } = await serviceClient
      .from('price_alerts')
      .insert({
        user_id: userId,
        symbol: symbol.toUpperCase(),
        exchange,
        direction,
        target_price,
        note: note?.trim() || null,
      })
      .select('id,symbol,exchange,direction,target_price,note,triggered_at,triggered_price,created_at')
      .single();

    if (error) {
      console.error('Alerts POST error:', error);
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    console.error('Alerts POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/alerts?id=<uuid>
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = new URL(request.url).searchParams.get('id');
    if (!id || !z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Valid id is required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();
    const { error } = await serviceClient
      .from('price_alerts')
      .delete()
      .eq('user_id', userId)
      .eq('id', id);

    if (error) {
      console.error('Alerts DELETE error:', error);
      return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Alerts DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
