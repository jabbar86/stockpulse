import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/brokers/encryption';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', request.url));

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
      return NextResponse.redirect(new URL('/brokers?error=kotak_auth_failed', request.url));
    }

    const consumerKey = process.env.KOTAK_CONSUMER_KEY!;
    const consumerSecret = process.env.KOTAK_CONSUMER_SECRET!;
    const redirectUri = process.env.KOTAK_REDIRECT_URI!;

    const tokenRes = await fetch('https://napi.kotaksecurities.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Kotak token exchange failed:', tokenData);
      return NextResponse.redirect(new URL('/brokers?error=kotak_token_failed', request.url));
    }

    const encryptedToken = encryptToken(tokenData.access_token);
    const serviceClient = createServiceRoleClient();

    await serviceClient.from('broker_connections').upsert(
      {
        user_id: user.id,
        broker: 'kotak',
        access_token: encryptedToken,
        status: 'connected',
        last_synced: null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,broker' }
    );

    return NextResponse.redirect(new URL('/brokers?connected=kotak', request.url));
  } catch (error) {
    console.error('Kotak callback error:', error);
    return NextResponse.redirect(new URL('/brokers?error=kotak_error', request.url));
  }
}
