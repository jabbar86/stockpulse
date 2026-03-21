import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { loadPortfolioForUserId } from '@/lib/portfolio/load-for-user';
import { istYmd } from '@/lib/today/ist';
import type { SipReminder } from '@/lib/today/storage';

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

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loaded = await loadPortfolioForUserId(user.id);
    if (!loaded.ok) {
      return NextResponse.json({ error: loaded.error }, { status: 500 });
    }

    const journalDate = istYmd();
    const workspace: {
      journal: string;
      reminders: SipReminder[];
      digest: { emailEnabled: boolean };
      available: boolean;
      hint?: string;
    } = {
      journal: '',
      reminders: [],
      digest: { emailEnabled: false },
      available: true,
    };

    const jRes = await supabase
      .from('daily_journal')
      .select('content')
      .eq('user_id', user.id)
      .eq('journal_date', journalDate)
      .maybeSingle();

    if (jRes.error) {
      if (isMissingRelation(jRes.error)) {
        workspace.available = false;
        workspace.hint = 'Run supabase/migrations/002_today_workspace.sql in your Supabase project.';
      }
    } else {
      workspace.journal = jRes.data?.content ?? '';
    }

    if (workspace.available) {
      const rRes = await supabase
        .from('monthly_reminders')
        .select('id, label, day_of_month, note, enabled')
        .eq('user_id', user.id)
        .order('day_of_month', { ascending: true });

      if (rRes.error) {
        if (isMissingRelation(rRes.error)) {
          workspace.available = false;
          workspace.hint = 'Run supabase/migrations/002_today_workspace.sql in your Supabase project.';
        }
      } else if (rRes.data) {
        workspace.reminders = rRes.data.map((r) => ({
          id: r.id,
          label: r.label,
          dayOfMonth: r.day_of_month,
          note: r.note ?? undefined,
          enabled: r.enabled,
        }));
      }

      const dRes = await supabase
        .from('digest_preferences')
        .select('email_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!dRes.error && dRes.data) {
        workspace.digest = { emailEnabled: !!dRes.data.email_enabled };
      } else if (dRes.error && isMissingRelation(dRes.error)) {
        workspace.available = false;
        workspace.hint = 'Run supabase/migrations/002_today_workspace.sql in your Supabase project.';
      }
    }

    return NextResponse.json({
      holdings: loaded.data.holdings,
      summary: loaded.data.summary,
      workspace,
    });
  } catch (e) {
    console.error('today/bootstrap', e);
    return NextResponse.json({ error: 'Bootstrap failed' }, { status: 500 });
  }
}
