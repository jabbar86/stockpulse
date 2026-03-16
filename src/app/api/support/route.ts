import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const supportSchema = z.object({
  subject: z.string().min(3).max(200),
  category: z.enum(['general', 'bug', 'feature', 'billing']).default('general'),
  message: z.string().min(10).max(4000),
});

export const maxDuration = 30;

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient
      .from('support_requests')
      .select('id,subject,category,status,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch support requests' }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    console.error('Support GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = supportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient
      .from('support_requests')
      .insert({
        user_id: userId,
        subject: parsed.data.subject,
        category: parsed.data.category,
        message: parsed.data.message,
      })
      .select()
      .single();

    if (error) {
      console.error('Support POST error:', error);
      return NextResponse.json({ error: 'Failed to submit support request' }, { status: 500 });
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    console.error('Support POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

