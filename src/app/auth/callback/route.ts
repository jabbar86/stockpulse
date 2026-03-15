import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Handles the email verification callback from Supabase.
 * When a user clicks the confirmation link in their email,
 * Supabase redirects here with a code that we exchange for a session.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to login with a verified flag
  return NextResponse.redirect(new URL('/login?verified=true', request.url));
}
