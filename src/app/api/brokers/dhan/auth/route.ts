import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/brokers/dhan/auth - Dhan uses direct access token (no OAuth redirect)
// When configured, auto-connects the user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clientId = process.env.DHAN_CLIENT_ID;
    const apiKey = process.env.DHAN_API_KEY;

    if (!clientId || !apiKey) {
      return NextResponse.json(
        { error: 'Dhan integration coming soon. Use CSV Import — export from Dhan app under Portfolio → Holdings → Export.' },
        { status: 503 }
      );
    }

    // Dhan doesn't have OAuth — auto-connect when credentials are configured
    const serviceClient = createServiceRoleClient();

    await serviceClient.from('broker_connections').upsert(
      {
        user_id: user.id,
        broker: 'dhan',
        status: 'connected',
        last_synced: null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,broker' }
    );

    return NextResponse.json({
      connected: true,
      message: 'Dhan connected successfully.',
    });
  } catch (error) {
    console.error('Dhan auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
