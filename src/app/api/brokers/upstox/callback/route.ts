import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/brokers/encryption';
import { fetchHoldings as fetchUpstoxHoldings } from '@/lib/brokers/upstox';
import { normalizeUpstoxHoldings } from '@/lib/brokers/normalize';

// GET /api/brokers/upstox/callback?code=xxx - exchange auth code for token, store and import holdings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id: string })?.id;

    if (!userId) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/portfolio?broker_error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/portfolio?broker_error=missing_code', request.url)
      );
    }

    const clientId = process.env.UPSTOX_API_KEY!;
    const clientSecret = process.env.UPSTOX_API_SECRET!;
    const redirectUri = process.env.UPSTOX_REDIRECT_URI!;

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.upstox.com/v2/login/authorization/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Upstox token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(
        new URL('/portfolio?broker_error=token_exchange_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Encrypt and store the token
    const encryptedToken = encryptToken(accessToken);
    const supabase = createServerClient();

    await supabase.from('broker_connections').upsert(
      {
        user_id: userId,
        broker: 'upstox',
        access_token: encryptedToken,
        status: 'connected',
        last_synced: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,broker' }
    );

    // Fetch and import holdings
    try {
      const rawHoldings = await fetchUpstoxHoldings(accessToken);
      const brokerHoldings = normalizeUpstoxHoldings(rawHoldings);

      // Upsert holdings into the holdings table
      for (const holding of brokerHoldings) {
        await supabase.from('holdings').upsert(
          {
            user_id: userId,
            symbol: holding.symbol,
            name: holding.name,
            exchange: holding.exchange as 'NSE' | 'BSE',
            quantity: holding.quantity,
            avg_price: holding.avg_price,
            source: 'upstox',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,symbol,source' }
        );
      }
    } catch (holdingsError) {
      console.error('Failed to import Upstox holdings:', holdingsError);
      // Don't fail the entire flow; broker is connected even if import fails
    }

    return NextResponse.redirect(
      new URL('/portfolio?broker_connected=upstox', request.url)
    );
  } catch (error) {
    console.error('Upstox callback error:', error);
    return NextResponse.redirect(
      new URL('/portfolio?broker_error=unexpected_error', request.url)
    );
  }
}
