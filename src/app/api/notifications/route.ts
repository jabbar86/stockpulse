import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function isMissingRelation(err: { code?: string; message?: string }): boolean {
  const msg = (err.message ?? '').toLowerCase();
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    (msg.includes('relation') && msg.includes('does not exist')) ||
    msg.includes('schema cache')
  );
}

async function ensureWelcomeNotification(userId: string): Promise<void> {
  const service = createServiceRoleClient();
  const { count, error } = await service
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    if (isMissingRelation(error)) return;
    console.error('[notifications] welcome count', error);
    return;
  }

  if (count !== null && count > 0) return;

  const { error: insErr } = await service.from('user_notifications').insert({
    user_id: userId,
    title: 'Welcome to StockPulse',
    body: 'Open Today for your briefing, journal, and SIP reminders. Market News has the latest headlines.',
    link_href: '/today',
    kind: 'system',
  });

  if (insErr) {
    if (isMissingRelation(insErr)) return;
    // Unique violation: another request already inserted welcome
    const code = (insErr as { code?: string }).code;
    if (code !== '23505') console.error('[notifications] welcome insert', insErr);
  }
}

/**
 * GET /api/notifications — list notifications + unread count for the current user.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureWelcomeNotification(user.id);

    const { data: rows, error } = await supabase
      .from('user_notifications')
      .select('id, title, body, link_href, kind, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      if (isMissingRelation(error)) {
        return NextResponse.json({ notifications: [], unreadCount: 0, available: false });
      }
      console.error('[notifications] list', error);
      return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
    }

    const list = rows ?? [];
    const unreadCount = list.filter((n) => n.read_at == null).length;

    return NextResponse.json({
      notifications: list,
      unreadCount,
      available: true,
    });
  } catch (e) {
    console.error('[notifications] GET', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications — mark read: { markAllRead?: true } or { ids?: string[] }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const markAllRead = body.markAllRead === true;
    const ids: string[] | undefined = Array.isArray(body.ids) ? body.ids : undefined;

    const now = new Date().toISOString();

    if (markAllRead) {
      const { error } = await supabase
        .from('user_notifications')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) {
        if (isMissingRelation(error)) {
          return NextResponse.json({ ok: true, skipped: true });
        }
        console.error('[notifications] mark all', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (ids?.length) {
      const { error } = await supabase
        .from('user_notifications')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .in('id', ids);

      if (error) {
        if (isMissingRelation(error)) {
          return NextResponse.json({ ok: true, skipped: true });
        }
        console.error('[notifications] mark ids', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Expected markAllRead or ids' }, { status: 400 });
  } catch (e) {
    console.error('[notifications] PATCH', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
