import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getQuote } from '@/lib/market-data/provider';
import { getNseSession } from '@/lib/market/nse-session';
import {
  buildPracticeBook,
  PRACTICE_MAX_QUANTITY,
  PRACTICE_STARTING_CASH,
  type PracticeTrade,
} from '@/lib/practice/positions';

export const maxDuration = 30;

const orderSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9&\-.]+$/i)
    .transform((s) => s.toUpperCase()),
  exchange: z.enum(['NSE', 'BSE']).default('NSE'),
  side: z.enum(['buy', 'sell']),
  quantity: z.number().int().positive().max(PRACTICE_MAX_QUANTITY),
});

const ORDER_ERRORS: Record<string, string> = {
  insufficient_cash: "You don't have enough virtual cash for this order.",
  insufficient_quantity: "You can't sell more shares than you hold.",
  invalid_order: 'That order is not valid.',
};

async function getUserId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// GET /api/practice - virtual account, open positions at live prices, recent trades
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const [{ data: account }, { data: trades, error: tradesError }] = await Promise.all([
      serviceClient
        .from('practice_accounts')
        .select('cash, starting_cash, reset_at')
        .eq('user_id', userId)
        .maybeSingle(),
      serviceClient
        .from('practice_trades')
        .select('id, symbol, exchange, side, quantity, price, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    if (tradesError) {
      console.error('Practice trades GET error:', tradesError);
      return NextResponse.json({ error: 'Failed to load practice account' }, { status: 500 });
    }

    const tradeRows = (trades ?? []) as PracticeTrade[];
    const book = buildPracticeBook(tradeRows);

    const quotes = await Promise.allSettled(
      book.positions.map((p) => getQuote(p.symbol, null, p.exchange))
    );
    const positions = book.positions.map((p, i) => {
      const q = quotes[i];
      const ltp = q.status === 'fulfilled' && q.value.price > 0 ? q.value.price : p.avgPrice;
      const value = ltp * p.quantity;
      return {
        ...p,
        name: q.status === 'fulfilled' ? q.value.name : p.symbol,
        ltp,
        dayChangePercent: q.status === 'fulfilled' ? q.value.changePercent : 0,
        value,
        pnl: value - p.invested,
        pnlPercent: p.invested > 0 ? ((value - p.invested) / p.invested) * 100 : 0,
      };
    });

    const startingCash = Number(account?.starting_cash ?? PRACTICE_STARTING_CASH);
    const cash = Number(account?.cash ?? startingCash);
    const holdingsValue = positions.reduce((s, p) => s + p.value, 0);
    const totalValue = cash + holdingsValue;

    return NextResponse.json({
      account: {
        startingCash,
        cash,
        holdingsValue,
        totalValue,
        totalPnl: totalValue - startingCash,
        totalPnlPercent: ((totalValue - startingCash) / startingCash) * 100,
        realizedPnl: book.realizedPnl,
        resetAt: account?.reset_at ?? null,
      },
      positions,
      trades: tradeRows.slice(0, 50),
      marketOpen: getNseSession().isOpen,
    });
  } catch (error) {
    console.error('Practice GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/practice - place a simulated market order at the live quote
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = orderSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { symbol, exchange, side, quantity } = parsed.data;

    let price: number;
    try {
      const quote = await getQuote(symbol, null, exchange);
      price = quote.price;
    } catch {
      price = 0;
    }
    if (!(price > 0)) {
      return NextResponse.json(
        { error: `Could not get a live price for ${symbol}. Try again in a moment.` },
        { status: 502 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient.rpc('practice_execute_trade', {
      p_user: userId,
      p_symbol: symbol,
      p_exchange: exchange,
      p_side: side,
      p_quantity: quantity,
      p_price: price,
    });

    if (error) {
      const code = Object.keys(ORDER_ERRORS).find((k) => error.message?.includes(k));
      if (code) {
        return NextResponse.json({ error: ORDER_ERRORS[code] }, { status: 400 });
      }
      console.error('Practice order error:', error);
      return NextResponse.json({ error: 'Failed to place practice order' }, { status: 500 });
    }

    return NextResponse.json({
      symbol,
      side,
      quantity,
      price,
      cash: (data as { cash: number } | null)?.cash ?? null,
      marketOpen: getNseSession().isOpen,
    });
  } catch (error) {
    console.error('Practice POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
