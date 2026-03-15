import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/brokers/encryption';

// GET /api/brokers/zerodha/callback?request_token=xxx&status=success
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestToken = searchParams.get('request_token');
    const status = searchParams.get('status');

    if (status !== 'success' || !requestToken) {
      return NextResponse.redirect(new URL('/brokers?error=zerodha_auth_failed', request.url));
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const apiKey = process.env.ZERODHA_API_KEY!;
    const apiSecret = process.env.ZERODHA_API_SECRET!;

    // Exchange request token for access token
    // Kite Connect requires SHA256 checksum: SHA256(api_key + request_token + api_secret)
    const crypto = await import('crypto');
    const checksum = crypto
      .createHash('sha256')
      .update(apiKey + requestToken + apiSecret)
      .digest('hex');

    const tokenRes = await fetch('https://api.kite.trade/session/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        api_key: apiKey,
        request_token: requestToken,
        checksum,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.data?.access_token) {
      console.error('Zerodha token exchange failed:', tokenData);
      return NextResponse.redirect(new URL('/brokers?error=zerodha_token_failed', request.url));
    }

    const accessToken = tokenData.data.access_token;
    const encryptedToken = encryptToken(accessToken);

    const serviceClient = createServiceRoleClient();

    // Store connection
    await serviceClient.from('broker_connections').upsert(
      {
        user_id: userId,
        broker: 'zerodha',
        status: 'connected',
        last_synced: null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,broker' }
    );

    // Store encrypted token
    await serviceClient.from('broker_tokens').upsert(
      {
        user_id: userId,
        broker: 'zerodha',
        encrypted_token: encryptedToken,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,broker' }
    );

    return NextResponse.redirect(new URL('/brokers?connected=zerodha', request.url));
  } catch (error) {
    console.error('Zerodha callback error:', error);
    return NextResponse.redirect(new URL('/brokers?error=zerodha_error', request.url));
  }
}
