import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/brokers/encryption';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', request.url));

    const { searchParams } = new URL(request.url);
    const requestToken = searchParams.get('RequestToken');

    if (!requestToken) {
      return NextResponse.redirect(new URL('/brokers?error=5paisa_auth_failed', request.url));
    }

    const appSource = process.env.FIVEPAISA_APP_SOURCE!;
    const userKey = process.env.FIVEPAISA_USER_KEY!;
    const encryKey = process.env.FIVEPAISA_ENCRYPTION_KEY!;

    const tokenRes = await fetch('https://Openapi.5paisa.com/VendorLogin/Service/GetAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        head: { Key: appSource },
        body: { RequestToken: requestToken, EncryKey: encryKey, UserId: userKey },
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.body?.AccessToken) {
      console.error('5paisa token exchange failed:', tokenData);
      return NextResponse.redirect(new URL('/brokers?error=5paisa_token_failed', request.url));
    }

    const encryptedToken = encryptToken(tokenData.body.AccessToken);
    const serviceClient = createServiceRoleClient();

    await serviceClient.from('broker_connections').upsert(
      {
        user_id: user.id,
        broker: '5paisa',
        access_token: encryptedToken,
        status: 'connected',
        last_synced: null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,broker' }
    );

    return NextResponse.redirect(new URL('/brokers?connected=5paisa', request.url));
  } catch (error) {
    console.error('5paisa callback error:', error);
    return NextResponse.redirect(new URL('/brokers?error=5paisa_error', request.url));
  }
}
