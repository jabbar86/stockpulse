import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/brokers/encryption';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceRoleClient();
    const appSource = process.env.FIVEPAISA_APP_SOURCE;

    const { data: connection } = await serviceClient
      .from('broker_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('broker', '5paisa')
      .eq('status', 'connected')
      .single();

    if (!connection) {
      return NextResponse.json({ error: '5paisa not connected.' }, { status: 404 });
    }

    const accessToken = decryptToken(connection.access_token);

    let holdings;
    try {
      const res = await fetch('https://Openapi.5paisa.com/VendorLogin/Service/V4/Holding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          head: { Key: appSource },
          body: { ClientCode: '' },
        }),
      });

      if (!res.ok) throw new Error(`5paisa API returned ${res.status}`);
      const data = await res.json();
      holdings = data.body?.Data || [];
    } catch (fetchError) {
      console.error('5paisa holdings fetch failed:', fetchError);
      await serviceClient.from('broker_connections').update({ status: 'expired' }).eq('id', connection.id);
      return NextResponse.json({ error: 'Failed to fetch holdings. Please reconnect.' }, { status: 401 });
    }

    await serviceClient.from('holdings').delete().eq('user_id', user.id).eq('source', '5paisa');

    if (holdings.length > 0) {
      const holdingsToInsert = holdings.map((h: any) => ({
        user_id: user.id,
        symbol: h.ScripName || h.Symbol || '',
        name: h.ScripName || h.Symbol || '',
        exchange: (h.Exch === 'B' ? 'BSE' : 'NSE') as 'NSE' | 'BSE',
        quantity: Number(h.Quantity) || 0,
        avg_price: Number(h.AvgRate) || 0,
        source: '5paisa' as const,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await serviceClient.from('holdings').insert(holdingsToInsert);
      if (insertError) {
        console.error('5paisa holdings insert error:', insertError);
        return NextResponse.json({ error: 'Failed to save holdings' }, { status: 500 });
      }
    }

    await serviceClient.from('broker_connections').update({ last_synced: new Date().toISOString() }).eq('id', connection.id);

    return NextResponse.json({ success: true, holdings_count: holdings.length, synced_at: new Date().toISOString() });
  } catch (error) {
    console.error('5paisa sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
