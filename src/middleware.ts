import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = await createMiddlewareClient(request);
  // Keep cookies refreshed for SSR, but do not hard-redirect here.
  // Redirecting in middleware can force a login loop when the session needs to
  // rehydrate after a tab/browser restart. The dashboard layout enforces auth.
  await supabase.auth.getUser();
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/today',
    '/today/:path*',
    '/stocks/:path*',
    '/portfolio/:path*',
    '/brokers/:path*',
  ],
};
