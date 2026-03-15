import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  return NextResponse.json({
    hasUser: !!user,
    user: user ? { id: user.id, email: user.email } : null,
    cookies: request.cookies.getAll().map(c => c.name),
  });
}
