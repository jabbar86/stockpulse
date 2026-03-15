import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

// GET /api/brokers/upstox/auth - return Upstox OAuth authorization URL
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id: string })?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.UPSTOX_API_KEY;
    const redirectUri = process.env.UPSTOX_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'Upstox broker integration is not configured' },
        { status: 503 }
      );
    }

    const authUrl = new URL('https://api.upstox.com/v2/login/authorization/dialog');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', userId);

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('Upstox auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
