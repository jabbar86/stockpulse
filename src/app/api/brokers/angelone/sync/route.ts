import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/brokers/encryption';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceRoleClient();
    const apiKey = process.env.ANGELONE_API_KEY;

    const { data: connection } = await serviceClient
      .from('broker_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('broker', 'angelone')
      .eq('status', 'connected')
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Angel One not connected.' }, { status: 404 });
    }

    const accessToken = decryptToken(connection.access_token);

    let holdings;
    try {
      const res = await fetch('https://apiconnect.angelone.in/rest/secure/angelbroking/portfolio/v1/getHolding', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-PrivateKey': apiKey || '',
        },
      });

      if (!res.ok) throw new Error(`Angel One API returned ${res.status}`);
      const data = await res.json();
      holdings = data.data || [];
    } catch (fetchError) {
      console.error('Angel One holdings fetch failed:', fetchError);
      await serviceClient
        .from('broker_connections')
        .update({ status: 'expired' })
        .eq('id', connection.id);
      return NextResponse.json(
        { error: 'Failed to fetch holdings. Token may have expired. Please reconnect.' },
        { status: 401 }
      );
    }

    await serviceClient.from('holdings').delete().eq('user_id', user.id).eq('source', 'angelone');

    if (holdings.length > 0) {
      const holdingsToInsert = holdings.map((h: any) => ({
        user_id: user.id,
        symbol: h.tradingsymbol || h.symbolname || '',
        name: h.symbolname || h.tradingsymbol || '',
        exchange: (h.exchange === 'BSE' ? 'BSE' : 'NSE') as 'NSE' | 'BSE',
        quantity: Number(h.quantity) || 0,
        avg_price: Number(h.averageprice) || 0,
        source: 'angelone' as const,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await serviceClient.from('holdings').insert(holdingsToInsert);
      if (insertError) {
        console.error('Angel One holdings insert error:', insertError);
        return NextResponse.json({ error: 'Failed to save holdings' }, { status: 500 });
      }
    }

    await serviceClient
      .from('broker_connections')
      .update({ last_synced: new Date().toISOString() })
      .eq('id', connection.id);

    return NextResponse.json({
      success: true,
      holdings_count: holdings.length,
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Angel One sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
