import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

const patchSchema = z.object({
  journalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  journalContent: z.string().max(12000).optional(),
  reminders: z
    .array(
      z.object({
        id: z.string().uuid(),
        label: z.string().min(1).max(200),
        dayOfMonth: z.number().int().min(1).max(28),
        note: z.string().max(500).optional(),
        enabled: z.boolean(),
      })
    )
    .optional(),
  digestEmailEnabled: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    const { journalDate, journalContent, reminders, digestEmailEnabled } = parsed.data;

    if (journalDate !== undefined && journalContent !== undefined) {
      const { error } = await supabase.from('daily_journal').upsert(
        {
          user_id: user.id,
          journal_date: journalDate,
          content: journalContent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,journal_date' }
      );
      if (error) {
        console.error('daily_journal upsert', error);
        return NextResponse.json({ error: 'Failed to save journal' }, { status: 500 });
      }
    }

    if (reminders !== undefined) {
      const { error: delErr } = await supabase.from('monthly_reminders').delete().eq('user_id', user.id);
      if (delErr) {
        console.error('monthly_reminders delete', delErr);
        return NextResponse.json({ error: 'Failed to update reminders' }, { status: 500 });
      }
      if (reminders.length > 0) {
        const { error: insErr } = await supabase.from('monthly_reminders').insert(
          reminders.map((r) => ({
            id: r.id,
            user_id: user.id,
            label: r.label,
            day_of_month: r.dayOfMonth,
            note: r.note ?? null,
            enabled: r.enabled,
            updated_at: new Date().toISOString(),
          }))
        );
        if (insErr) {
          console.error('monthly_reminders insert', insErr);
          return NextResponse.json({ error: 'Failed to save reminders' }, { status: 500 });
        }
      }
    }

    if (digestEmailEnabled !== undefined) {
      const { error } = await supabase.from('digest_preferences').upsert(
        {
          user_id: user.id,
          email_enabled: digestEmailEnabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) {
        console.error('digest_preferences upsert', error);
        return NextResponse.json({ error: 'Failed to save digest preference' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('today/workspace PATCH', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
