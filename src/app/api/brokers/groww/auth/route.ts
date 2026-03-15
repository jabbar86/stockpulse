import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/brokers/groww/auth
// Groww doesn't provide a public trading/portfolio API yet.
// This endpoint checks for server-level config or guides the user to use CSV import.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.GROWW_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Groww API integration is coming soon. For now, export your holdings as CSV from the Groww app (Portfolio → Export) and use our CSV Import feature.',
        },
        { status: 503 }
      );
    }

    // If API key is configured in the future, auto-connect
    const serviceClient = createServiceRoleClient();

    await serviceClient.from('broker_connections').upsert(
      {
        user_id: userId,
        broker: 'groww',
        status: 'connected',
        last_synced: null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,broker' }
    );

    return NextResponse.json({
      connected: true,
      message: 'Groww connected successfully.',
    });
  } catch (error) {
    console.error('Groww auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
