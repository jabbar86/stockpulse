import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = process.env.ICICI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ICICI Direct integration coming soon. Use CSV Import to import your holdings.' },
        { status: 503 }
      );
    }

    const authUrl = `https://api.icicidirect.com/apiuser/login?api_key=${apiKey}`;
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('ICICI auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
