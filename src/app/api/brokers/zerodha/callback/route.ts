import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/brokers/encryption';
import { fetchHoldings as fetchZerodhaHoldings } from '@/lib/brokers/zerodha';
import { normalizeZerodhaHoldings } from '@/lib/brokers/normalize';
import crypto from 'crypto';

// GET /api/brokers/zerodha/callback?request_token=xxx - exchange request token for session, import holdings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id: string })?.id;

    if (!userId) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { searchParams } = new URL(request.url);
    const requestToken = searchParams.get('request_token');
    const status = searchParams.get('status');

    if (status === 'cancelled') {
      return NextResponse.redirect(
        new URL('/portfolio?broker_error=user_cancelled', request.url)
      );
    }

    if (!requestToken) {
      return NextResponse.redirect(
        new URL('/portfolio?broker_error=missing_request_token', request.url)
      );
    }

    const apiKey = process.env.KITE_API_KEY!;
    const apiSecret = process.env.KITE_API_SECRET!;

    // Generate checksum: SHA-256 of (api_key + request_token + api_secret)
    const checksum = crypto
      .createHash('sha256')
      .update(apiKey + requestToken + apiSecret)
      .digest('hex');

    // Generate session
    const sessionResponse = await fetch('https://api.kite.trade/session/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        api_key: apiKey,
        request_token: requestToken,
        checksum,
      }),
    });

    if (!sessionResponse.ok) {
      console.error('Zerodha session generation failed:', await sessionResponse.text());
      return NextResponse.redirect(
        new URL('/portfolio?broker_error=session_generation_failed', request.url)
      );
    }

    const sessionData = await sessionResponse.json();
    const accessToken = sessionData.data?.access_token;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL('/portfolio?broker_error=no_access_token', request.url)
      );
    }

    // Encrypt and store the token
    const encryptedToken = encryptToken(accessToken);
    const supabase = createServerClient();

    await supabase.from('broker_connections').upsert(
      {
        user_id: userId,
        broker: 'zerodha',
        access_token: encryptedToken,
        status: 'connected',
        last_synced: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,broker' }
    );

    // Fetch and import holdings
    try {
      const rawHoldings = await fetchZerodhaHoldings(accessToken);
      const brokerHoldings = normalizeZerodhaHoldings(rawHoldings);

      for (const holding of brokerHoldings) {
        await supabase.from('holdings').upsert(
          {
            user_id: userId,
            symbol: holding.symbol,
            name: holding.name,
            exchange: holding.exchange as 'NSE' | 'BSE',
            quantity: holding.quantity,
            avg_price: holding.avg_price,
            source: 'zerodha',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,symbol,source' }
        );
      }
    } catch (holdingsError) {
      console.error('Failed to import Zerodha holdings:', holdingsError);
    }

    return NextResponse.redirect(
      new URL('/portfolio?broker_connected=zerodha', request.url)
    );
  } catch (error) {
    console.error('Zerodha callback error:', error);
    return NextResponse.redirect(
      new URL('/portfolio?broker_error=unexpected_error', request.url)
    );
  }
}
