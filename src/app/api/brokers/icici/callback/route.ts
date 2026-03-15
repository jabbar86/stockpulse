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
    const apiSession = searchParams.get('apisession');

    if (!apiSession) {
      return NextResponse.redirect(new URL('/brokers?error=icici_auth_failed', request.url));
    }

    const apiKey = process.env.ICICI_API_KEY!;
    const apiSecret = process.env.ICICI_API_SECRET!;
    const sessionToken = createHash('sha256').update(apiKey + apiSession + apiSecret).digest('hex');

    const encryptedToken = encryptToken(sessionToken);
    const serviceClient = createServiceRoleClient();

    await serviceClient.from('broker_connections').upsert(
      {
        user_id: user.id,
        broker: 'icici',
        access_token: encryptedToken,
        status: 'connected',
        last_synced: null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,broker' }
    );

    return NextResponse.redirect(new URL('/brokers?connected=icici', request.url));
  } catch (error) {
    console.error('ICICI callback error:', error);
    return NextResponse.redirect(new URL('/brokers?error=icici_error', request.url));
  }
}
