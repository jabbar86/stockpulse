import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/brokers/dhan/sync - fetch holdings using server-level Dhan credentials
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceRoleClient();
    const apiKey = process.env.DHAN_API_KEY;
    const clientId = process.env.DHAN_CLIENT_ID;

    if (!apiKey || !clientId) {
      return NextResponse.json({ error: 'Dhan not configured.' }, { status: 503 });
    }

    // Verify user has a connection
    const { data: connection } = await serviceClient
      .from('broker_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('broker', 'dhan')
      .eq('status', 'connected')
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Dhan not connected.' }, { status: 404 });
    }

    let holdings;
    try {
      const res = await fetch('https://api.dhan.co/v2/holdings', {
        headers: {
          'access-token': apiKey,
          'client-id': clientId,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error(`Dhan API returned ${res.status}`);
      const data = await res.json();
      holdings = Array.isArray(data) ? data : (data.data || []);
    } catch (fetchError) {
      console.error('Dhan holdings fetch failed:', fetchError);
      await serviceClient.from('broker_connections').update({ status: 'expired' }).eq('id', connection.id);
      return NextResponse.json({ error: 'Failed to fetch holdings. Token may have expired.' }, { status: 401 });
    }

    await serviceClient.from('holdings').delete().eq('user_id', user.id).eq('source', 'dhan');

    if (holdings.length > 0) {
      const holdingsToInsert = holdings.map((h: any) => ({
        user_id: user.id,
        symbol: h.tradingSymbol || h.securityId || '',
        name: h.tradingSymbol || '',
        exchange: (h.exchangeSegment === 'BSE_EQ' ? 'BSE' : 'NSE') as 'NSE' | 'BSE',
        quantity: Number(h.totalQty || h.quantity) || 0,
        avg_price: Number(h.avgCostPrice) || 0,
        source: 'dhan' as const,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await serviceClient.from('holdings').insert(holdingsToInsert);
      if (insertError) {
        console.error('Dhan holdings insert error:', insertError);
        return NextResponse.json({ error: 'Failed to save holdings' }, { status: 500 });
      }
    }

    await serviceClient.from('broker_connections').update({ last_synced: new Date().toISOString() }).eq('id', connection.id);

    return NextResponse.json({ success: true, holdings_count: holdings.length, synced_at: new Date().toISOString() });
  } catch (error) {
    console.error('Dhan sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
