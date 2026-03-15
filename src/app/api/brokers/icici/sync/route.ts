import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/brokers/encryption';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceRoleClient();
    const apiKey = process.env.ICICI_API_KEY;

    const { data: connection } = await serviceClient
      .from('broker_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('broker', 'icici')
      .eq('status', 'connected')
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'ICICI Direct not connected.' }, { status: 404 });
    }

    const sessionToken = decryptToken(connection.access_token);

    let holdings;
    try {
      const res = await fetch('https://api.icicidirect.com/breezeapi/api/v1/dematholdings', {
        headers: {
          'X-SessionToken': sessionToken,
          'apikey': apiKey || '',
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error(`ICICI API returned ${res.status}`);
      const data = await res.json();
      holdings = data.Success || data.data || [];
    } catch (fetchError) {
      console.error('ICICI holdings fetch failed:', fetchError);
      await serviceClient.from('broker_connections').update({ status: 'expired' }).eq('id', connection.id);
      return NextResponse.json({ error: 'Failed to fetch holdings. Please reconnect.' }, { status: 401 });
    }

    await serviceClient.from('holdings').delete().eq('user_id', user.id).eq('source', 'icici');

    if (holdings.length > 0) {
      const holdingsToInsert = holdings.map((h: any) => ({
        user_id: user.id,
        symbol: h.stock_code || h.scrip_name || '',
        name: h.company_name || h.stock_code || '',
        exchange: (h.exchange_code === 'BSE' ? 'BSE' : 'NSE') as 'NSE' | 'BSE',
        quantity: Number(h.quantity) || 0,
        avg_price: Number(h.average_price || h.cost_price) || 0,
        source: 'icici' as const,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await serviceClient.from('holdings').insert(holdingsToInsert);
      if (insertError) {
        console.error('ICICI holdings insert error:', insertError);
        return NextResponse.json({ error: 'Failed to save holdings' }, { status: 500 });
      }
    }

    await serviceClient.from('broker_connections').update({ last_synced: new Date().toISOString() }).eq('id', connection.id);
    return NextResponse.json({ success: true, holdings_count: holdings.length, synced_at: new Date().toISOString() });
  } catch (error) {
    console.error('ICICI sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
