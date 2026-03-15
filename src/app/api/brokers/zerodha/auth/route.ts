import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

// GET /api/brokers/zerodha/auth - return Zerodha/Kite login URL
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id: string })?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.KITE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Zerodha broker integration is not configured' },
        { status: 503 }
      );
    }

    const loginUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;

    return NextResponse.json({ authUrl: loginUrl });
  } catch (error) {
    console.error('Zerodha auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
