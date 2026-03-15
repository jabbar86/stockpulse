import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = process.env.ANGELONE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Angel One integration coming soon. Use CSV Import to import your Angel One holdings.' },
        { status: 503 }
      );
    }

    const redirectUri = process.env.ANGELONE_REDIRECT_URI || `${request.nextUrl.origin}/api/brokers/angelone/callback`;
    const authUrl = `https://smartapi.angelone.in/publisher-login?api_key=${apiKey}&redirect_url=${encodeURIComponent(redirectUri)}&state=${user.id}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Angel One auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
