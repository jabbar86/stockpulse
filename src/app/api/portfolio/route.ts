import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { loadPortfolioForUserId } from '@/lib/portfolio/load-for-user';
import { z } from 'zod';

export const maxDuration = 30;

// Validation schemas
const buyDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date')
  // Allow up to +1 day so IST users near midnight aren't rejected by a UTC server.
  .refine((v) => Date.parse(v) <= Date.now() + 86_400_000, 'Buy date cannot be in the future')
  .nullable();

const addHoldingSchema = z.object({
  symbol: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  exchange: z.enum(['NSE', 'BSE']),
  quantity: z.number().positive(),
  avg_price: z.number().positive(),
  source: z.enum(['manual', 'upstox', 'angelone', 'fyers', 'csv']).default('manual'),
  buy_date: buyDateSchema.optional(),
});

const updateHoldingSchema = z.object({
  id: z.string().uuid(),
  quantity: z.number().positive().optional(),
  avg_price: z.number().positive().optional(),
  buy_date: buyDateSchema.optional(),
});

// GET /api/portfolio - fetch user holdings from DB (prices come from client-side polling)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loaded = await loadPortfolioForUserId(userId);
    if (!loaded.ok) {
      return NextResponse.json({ error: loaded.error }, { status: 500 });
    }

    return NextResponse.json(loaded.data);
  } catch (error) {
    console.error('Portfolio GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/portfolio - add a new holding
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = addHoldingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient
      .from('holdings')
      .insert({
        user_id: userId,
        symbol: parsed.data.symbol,
        name: parsed.data.name,
        exchange: parsed.data.exchange,
        quantity: parsed.data.quantity,
        avg_price: parsed.data.avg_price,
        source: parsed.data.source,
        buy_date: parsed.data.buy_date ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert holding error:', error);
      return NextResponse.json({ error: 'Failed to add holding' }, { status: 500 });
    }

    return NextResponse.json({ holding: data }, { status: 201 });
  } catch (error) {
    console.error('Portfolio POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/portfolio - update a holding
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateHoldingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Verify ownership
    const { data: existing } = await serviceClient
      .from('holdings')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    const { data, error } = await serviceClient
      .from('holdings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Update holding error:', error);
      return NextResponse.json({ error: 'Failed to update holding' }, { status: 500 });
    }

    return NextResponse.json({ holding: data });
  } catch (error) {
    console.error('Portfolio PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/portfolio?id=xxx - delete a holding
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const id = body?.id;

    if (!id) {
      return NextResponse.json({ error: 'Holding id is required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Verify ownership
    const { data: existing } = await serviceClient
      .from('holdings')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    const { error } = await serviceClient
      .from('holdings')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Delete holding error:', error);
      return NextResponse.json({ error: 'Failed to delete holding' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Portfolio DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
