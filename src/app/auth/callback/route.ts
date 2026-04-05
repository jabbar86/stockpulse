import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Email confirmation & OAuth: Supabase redirects here with `?code=`.
 * Session cookies must be set on the same NextResponse as the redirect, or the
 * exchange succeeds in memory but the browser never receives auth cookies.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const oauthError = url.searchParams.get('error');
  const oauthDesc = url.searchParams.get('error_description');

  if (oauthError) {
    const login = new URL('/login', request.url);
    login.searchParams.set(
      'authError',
      oauthDesc ? encodeURIComponent(oauthDesc) : oauthError
    );
    return NextResponse.redirect(login);
  }

  if (!code) {
    const login = new URL('/login', request.url);
    login.searchParams.set('authError', 'missing_code');
    return NextResponse.redirect(login);
  }

  const dashboard = new URL('/dashboard', request.url);
  let response = NextResponse.redirect(dashboard);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const login = new URL('/login', request.url);
    login.searchParams.set('authError', 'verification_failed');
    return NextResponse.redirect(login);
  }

  return response;
}
