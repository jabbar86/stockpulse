import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/brokers/encryption';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceRoleClient();

    const { data: connection } = await serviceClient
      .from('broker_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('broker', 'kotak')
      .eq('status', 'connected')
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Kotak not connected.' }, { status: 404 });
    }

    const accessToken = decryptToken(connection.access_token);

    let holdings;
    try {
      const res = await fetch('https://gw-napi.kotaksecurities.com/Files/2.0/Holdings', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error(`Kotak API returned ${res.status}`);
      const data = await res.json();
      holdings = data.data || data.Success || [];
    } catch (fetchError) {
      console.error('Kotak holdings fetch failed:', fetchError);
      await serviceClient.from('broker_connections').update({ status: 'expired' }).eq('id', connection.id);
      return NextResponse.json({ error: 'Failed to fetch holdings. Please reconnect.' }, { status: 401 });
    }

    await serviceClient.from('holdings').delete().eq('user_id', user.id).eq('source', 'kotak');

    if (holdings.length > 0) {
      const holdingsToInsert = holdings.map((h: any) => ({
        user_id: user.id,
        symbol: h.instrumentName || h.symbol || h.tradingSymbol || '',
        name: h.instrumentName || h.symbol || '',
        exchange: (h.exchange === 'BSE' ? 'BSE' : 'NSE') as 'NSE' | 'BSE',
        quantity: Number(h.quantity || h.totalQuantity) || 0,
        avg_price: Number(h.averagePrice || h.avgPrice) || 0,
        source: 'kotak' as const,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await serviceClient.from('holdings').insert(holdingsToInsert);
      if (insertError) {
        console.error('Kotak holdings insert error:', insertError);
        return NextResponse.json({ error: 'Failed to save holdings' }, { status: 500 });
      }
    }

    await serviceClient.from('broker_connections').update({ last_synced: new Date().toISOString() }).eq('id', connection.id);
    return NextResponse.json({ success: true, holdings_count: holdings.length, synced_at: new Date().toISOString() });
  } catch (error) {
    console.error('Kotak sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
