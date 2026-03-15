import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/brokers/encryption';
import { fetchHoldings as fetchZerodhaHoldings } from '@/lib/brokers/zerodha';
import { normalizeZerodhaHoldings } from '@/lib/brokers/normalize';

// POST /api/brokers/zerodha/sync - re-fetch holdings from Zerodha
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id: string })?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Fetch stored broker connection
    const { data: connection, error: connError } = await supabase
      .from('broker_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('broker', 'zerodha')
      .eq('status', 'connected')
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'Zerodha account not connected. Please connect first.' },
        { status: 404 }
      );
    }

    // Decrypt access token
    const accessToken = decryptToken(connection.access_token);

    // Fetch holdings from Zerodha
    let brokerHoldings;
    try {
      const rawHoldings = await fetchZerodhaHoldings(accessToken);
      brokerHoldings = normalizeZerodhaHoldings(rawHoldings);
    } catch (fetchError) {
      console.error('Zerodha holdings fetch failed:', fetchError);

      // Mark connection as expired if token is invalid
      await supabase
        .from('broker_connections')
        .update({ status: 'expired' })
        .eq('id', connection.id);

      return NextResponse.json(
        { error: 'Failed to fetch holdings. Token may have expired. Please reconnect.' },
        { status: 401 }
      );
    }

    // Remove old Zerodha holdings for this user
    await supabase
      .from('holdings')
      .delete()
      .eq('user_id', userId)
      .eq('source', 'zerodha');

    // Insert fresh holdings
    if (brokerHoldings.length > 0) {
      const holdingsToInsert = brokerHoldings.map((holding) => ({
        user_id: userId,
        symbol: holding.symbol,
        name: holding.name,
        exchange: holding.exchange as 'NSE' | 'BSE',
        quantity: holding.quantity,
        avg_price: holding.avg_price,
        source: 'zerodha' as const,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('holdings')
        .insert(holdingsToInsert);

      if (insertError) {
        console.error('Holdings insert error:', insertError);
        return NextResponse.json(
          { error: 'Failed to save holdings' },
          { status: 500 }
        );
      }
    }

    // Update last_synced timestamp
    await supabase
      .from('broker_connections')
      .update({ last_synced: new Date().toISOString() })
      .eq('id', connection.id);

    return NextResponse.json({
      success: true,
      holdings_count: brokerHoldings.length,
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Zerodha sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
