import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { istYmd, formatIstLong } from '@/lib/today/ist';
import { loadPortfolioForUserId } from '@/lib/portfolio/load-for-user';
import { isResendConfigured, resendConfigReason, sendTransactionalEmail } from '@/lib/email/resend-transactional';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/daily-digest — send morning summary to users who opted in.
 * Requires CRON_SECRET (same as other crons). Uses Resend: RESEND_API_KEY + EMAIL_FROM.
 */
export async function GET(request: NextRequest) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    const querySecret = new URL(request.url).searchParams.get('secret');
    if (authHeader !== `Bearer ${CRON_SECRET}` && querySecret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!isResendConfigured()) {
    return NextResponse.json({
      skipped: true,
      reason: resendConfigReason(),
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const service = createServiceRoleClient();

    const { data: prefs, error: prefErr } = await service
      .from('digest_preferences')
      .select('user_id')
      .eq('email_enabled', true);

    if (prefErr) {
      console.error('[cron] digest prefs', prefErr);
      return NextResponse.json({ error: 'Failed to load preferences', details: prefErr.message }, { status: 500 });
    }

    if (!prefs?.length) {
      return NextResponse.json({ sent: 0, message: 'No subscribers' });
    }

    const dateLine = formatIstLong();
    const journalDate = istYmd();
    let sent = 0;
    const errors: string[] = [];

    for (const row of prefs) {
      const { data: profile } = await service
        .from('profiles')
        .select('email, name')
        .eq('id', row.user_id)
        .maybeSingle();

      const to = profile?.email;
      if (!to) continue;

      const loaded = await loadPortfolioForUserId(row.user_id);
      const hCount = loaded.ok ? loaded.data.summary.holdings_count : 0;

      let journalSnippet = '';
      const { data: j } = await service
        .from('daily_journal')
        .select('content')
        .eq('user_id', row.user_id)
        .eq('journal_date', journalDate)
        .maybeSingle();
      if (j?.content?.trim()) {
        journalSnippet = j.content.trim().slice(0, 280);
        if (j.content.length > 280) journalSnippet += '…';
      }

      const body = [
        `Hi${profile?.name ? ` ${profile.name.split(/\s+/)[0]}` : ''},`,
        '',
        dateLine,
        '',
        `Holdings on file: ${hCount}.`,
        journalSnippet ? `\nYour note today:\n${journalSnippet}\n` : '',
        `Open your briefing: ${appUrl}/today`,
        '',
        '— StockPulse (automated, not investment advice)',
      ].join('\n');

      const result = await sendTransactionalEmail({
        to,
        subject: `StockPulse — Today (${journalDate})`,
        text: body,
      });
      if (result.ok) {
        sent += 1;
      } else {
        errors.push(`${to}: ${result.error}`);
      }
    }

    return NextResponse.json({
      sent,
      errors: errors.length ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[cron] daily-digest', e);
    return NextResponse.json({ error: 'Digest run failed' }, { status: 500 });
  }
}
