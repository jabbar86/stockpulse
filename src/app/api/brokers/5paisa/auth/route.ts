import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/brokers/5paisa/auth - 5paisa OAuth
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const appName = process.env.FIVEPAISA_APP_NAME;
    const appSource = process.env.FIVEPAISA_APP_SOURCE;

    if (!appName || !appSource) {
      return NextResponse.json(
        { error: '5paisa integration coming soon. Use CSV Import to import your 5paisa holdings — export CSV from the 5paisa app under Portfolio → Holdings → Download.' },
        { status: 503 }
      );
    }

    // 5paisa TOTP/OAuth flow
    const authUrl = `https://dev-openapi.5paisa.com/WebVendorLogin/VLogin/Index?VendorKey=${appSource}&ResponseURL=${encodeURIComponent(process.env.FIVEPAISA_REDIRECT_URI || '')}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('5paisa auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
