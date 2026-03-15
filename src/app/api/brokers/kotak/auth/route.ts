import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const consumerKey = process.env.KOTAK_CONSUMER_KEY;
    const redirectUri = process.env.KOTAK_REDIRECT_URI;

    if (!consumerKey || !redirectUri) {
      return NextResponse.json(
        { error: 'Kotak integration coming soon. Use CSV Import to import your Kotak holdings.' },
        { status: 503 }
      );
    }

    const authUrl = `https://napi.kotaksecurities.com/oauth2/auth?client_id=${consumerKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${user.id}`;
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Kotak auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
