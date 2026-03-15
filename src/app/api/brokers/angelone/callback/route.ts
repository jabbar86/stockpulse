import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/brokers/encryption';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', request.url));

    const { searchParams } = new URL(request.url);
    const authToken = searchParams.get('auth_token');
    const feedToken = searchParams.get('feed_token');
    const refreshToken = searchParams.get('refresh_token');

    if (!authToken) {
      return NextResponse.redirect(new URL('/brokers?error=angelone_auth_failed', request.url));
    }

    const encryptedToken = encryptToken(authToken);
    const serviceClient = createServiceRoleClient();

    await serviceClient.from('broker_connections').upsert(
      {
        user_id: user.id,
        broker: 'angelone',
        access_token: encryptedToken,
        refresh_token: refreshToken ? encryptToken(refreshToken) : null,
        status: 'connected',
        last_synced: null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,broker' }
    );

    return NextResponse.redirect(new URL('/brokers?connected=angelone', request.url));
  } catch (error) {
    console.error('Angel One callback error:', error);
    return NextResponse.redirect(new URL('/brokers?error=angelone_error', request.url));
  }
}
