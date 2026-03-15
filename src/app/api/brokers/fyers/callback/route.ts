import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/brokers/encryption';
import { createHash } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', request.url));

    const { searchParams } = new URL(request.url);
    const authCode = searchParams.get('auth_code');
    const error = searchParams.get('error');

    if (error || !authCode) {
      return NextResponse.redirect(new URL('/brokers?error=fyers_auth_failed', request.url));
    }

    const appId = process.env.FYERS_APP_ID!;
    const appSecret = process.env.FYERS_SECRET_KEY!;

    // FYERS requires SHA256 hash of appId + appSecret
    const appIdHash = createHash('sha256').update(appId + appSecret).digest('hex');

    const tokenRes = await fetch('https://api-t1.fyers.in/api/v3/validate-authcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        appIdHash,
        code: authCode,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('FYERS token exchange failed:', tokenData);
      return NextResponse.redirect(new URL('/brokers?error=fyers_token_failed', request.url));
    }

    const encryptedToken = encryptToken(tokenData.access_token);
    const serviceClient = createServiceRoleClient();

    await serviceClient.from('broker_connections').upsert(
      {
        user_id: user.id,
        broker: 'fyers',
        access_token: encryptedToken,
        status: 'connected',
        last_synced: null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,broker' }
    );

    return NextResponse.redirect(new URL('/brokers?connected=fyers', request.url));
  } catch (error) {
    console.error('FYERS callback error:', error);
    return NextResponse.redirect(new URL('/brokers?error=fyers_error', request.url));
  }
}
