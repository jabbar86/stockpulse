import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/brokers/encryption';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', request.url));

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId') || searchParams.get('access_token');

    if (!tokenId) {
      return NextResponse.redirect(new URL('/brokers?error=dhan_auth_failed', request.url));
    }

    const encryptedToken = encryptToken(tokenId);
    const serviceClient = createServiceRoleClient();

    await serviceClient.from('broker_connections').upsert(
      {
        user_id: user.id,
        broker: 'dhan',
        access_token: encryptedToken,
        status: 'connected',
        last_synced: null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,broker' }
    );

    return NextResponse.redirect(new URL('/brokers?connected=dhan', request.url));
  } catch (error) {
    console.error('Dhan callback error:', error);
    return NextResponse.redirect(new URL('/brokers?error=dhan_error', request.url));
  }
}
