import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/brokers/encryption';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceRoleClient();
    const appId = process.env.FYERS_APP_ID;

    const { data: connection } = await serviceClient
      .from('broker_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('broker', 'fyers')
      .eq('status', 'connected')
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'FYERS not connected.' }, { status: 404 });
    }

    const accessToken = decryptToken(connection.access_token);

    let holdings;
    try {
      const res = await fetch('https://api-t1.fyers.in/api/v3/holdings', {
        headers: {
          'Authorization': `${appId}:${accessToken}`,
        },
      });

      if (!res.ok) throw new Error(`FYERS API returned ${res.status}`);
      const data = await res.json();
      holdings = data.holdings || [];
    } catch (fetchError) {
      console.error('FYERS holdings fetch failed:', fetchError);
      await serviceClient.from('broker_connections').update({ status: 'expired' }).eq('id', connection.id);
      return NextResponse.json({ error: 'Failed to fetch holdings. Please reconnect.' }, { status: 401 });
    }

    await serviceClient.from('holdings').delete().eq('user_id', user.id).eq('source', 'fyers');

    if (holdings.length > 0) {
      const holdingsToInsert = holdings.map((h: any) => ({
        user_id: user.id,
        symbol: (h.symbol || '').replace('NSE:', '').replace('BSE:', '').replace('-EQ', ''),
        name: h.symbol || '',
        exchange: ((h.exchange === 12 || (h.symbol || '').startsWith('BSE:')) ? 'BSE' : 'NSE') as 'NSE' | 'BSE',
        quantity: Number(h.quantity) || 0,
        avg_price: Number(h.costPrice) || 0,
        source: 'fyers' as const,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await serviceClient.from('holdings').insert(holdingsToInsert);
      if (insertError) {
        console.error('FYERS holdings insert error:', insertError);
        return NextResponse.json({ error: 'Failed to save holdings' }, { status: 500 });
      }
    }

    await serviceClient.from('broker_connections').update({ last_synced: new Date().toISOString() }).eq('id', connection.id);

    return NextResponse.json({ success: true, holdings_count: holdings.length, synced_at: new Date().toISOString() });
  } catch (error) {
    console.error('FYERS sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
