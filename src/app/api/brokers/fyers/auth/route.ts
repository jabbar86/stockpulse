import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const appId = process.env.FYERS_APP_ID;
    const redirectUri = process.env.FYERS_REDIRECT_URI;

    if (!appId || !redirectUri) {
      return NextResponse.json(
        { error: 'FYERS integration coming soon. Use CSV Import to import your FYERS holdings.' },
        { status: 503 }
      );
    }

    const authUrl = `https://api-t1.fyers.in/api/v3/generate-authcode?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${user.id}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('FYERS auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
