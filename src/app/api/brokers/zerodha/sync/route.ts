import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/brokers/encryption';

// POST /api/brokers/zerodha/sync - re-fetch holdings from Zerodha Kite
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const apiKey = process.env.ZERODHA_API_KEY;

    // Fetch stored token
    const { data: tokenRow } = await serviceClient
      .from('broker_tokens')
      .select('encrypted_token')
      .eq('user_id', userId)
      .eq('broker', 'zerodha')
      .single();

    if (!tokenRow) {
      return NextResponse.json(
        { error: 'Zerodha not connected. Please connect first.' },
        { status: 404 }
      );
    }

    const accessToken = decryptToken(tokenRow.encrypted_token);

    // Fetch holdings from Kite API
    let holdings;
    try {
      const res = await fetch('https://api.kite.trade/portfolio/holdings', {
        headers: {
          'X-Kite-Version': '3',
          Authorization: `token ${apiKey}:${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Kite API returned ${res.status}`);
      }

      const data = await res.json();
      holdings = data.data || [];
    } catch (fetchError) {
      console.error('Zerodha holdings fetch failed:', fetchError);

      await serviceClient
        .from('broker_connections')
        .update({ status: 'expired' })
        .eq('user_id', userId)
        .eq('broker', 'zerodha');

      return NextResponse.json(
        { error: 'Failed to fetch holdings. Token may have expired. Please reconnect.' },
        { status: 401 }
      );
    }

    // Remove old Zerodha holdings
    await serviceClient
      .from('holdings')
      .delete()
      .eq('user_id', userId)
      .eq('source', 'zerodha');

    // Normalize and insert fresh holdings
    if (holdings.length > 0) {
      const holdingsToInsert = holdings.map((h: {
        tradingsymbol: string;
        instrument_token: number;
        exchange: string;
        quantity: number;
        average_price: number;
        last_price: number;
      }) => ({
        user_id: userId,
        symbol: h.tradingsymbol,
        name: h.tradingsymbol, // Kite doesn't return company names in holdings
        exchange: (h.exchange === 'BSE' ? 'BSE' : 'NSE') as 'NSE' | 'BSE',
        quantity: h.quantity,
        avg_price: h.average_price,
        source: 'zerodha' as const,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await serviceClient
        .from('holdings')
        .insert(holdingsToInsert);

      if (insertError) {
        console.error('Zerodha holdings insert error:', insertError);
        return NextResponse.json({ error: 'Failed to save holdings' }, { status: 500 });
      }
    }

    // Update last_synced
    await serviceClient
      .from('broker_connections')
      .update({ last_synced: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('broker', 'zerodha');

    return NextResponse.json({
      success: true,
      holdings_count: holdings.length,
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Zerodha sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
