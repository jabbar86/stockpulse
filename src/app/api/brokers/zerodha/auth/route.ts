import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/brokers/zerodha/auth - return Zerodha Kite Connect OAuth URL
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.ZERODHA_API_KEY;
    const redirectUri = process.env.ZERODHA_REDIRECT_URI;

    if (!apiKey || !redirectUri) {
      return NextResponse.json(
        { error: 'Zerodha Kite Connect is not configured. Set ZERODHA_API_KEY, ZERODHA_API_SECRET, and ZERODHA_REDIRECT_URI in environment variables. You can get these from https://kite.trade' },
        { status: 503 }
      );
    }

    // Kite Connect OAuth login URL
    const authUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Zerodha auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
