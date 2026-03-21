import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isResendConfigured, sendTransactionalEmail } from '@/lib/email/resend-transactional';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, email, message } = await request.json();

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    const { error } = await serviceClient.from('premium_requests').insert({
      user_id: user.id,
      name: name?.trim() || null,
      email: email.trim(),
      message: message?.trim() || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Premium request insert error:', error);
      return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
    }

    const adminTo = process.env.ADMIN_NOTIFY_EMAIL?.trim();
    if (adminTo && isResendConfigured()) {
      const html = `
            <h2>New Premium Access Request</h2>
            <table style="border-collapse:collapse;width:100%;max-width:500px;">
              <tr><td style="padding:8px;font-weight:bold;">Name</td><td style="padding:8px;">${escapeHtml(name?.trim() || '—')}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">Email</td><td style="padding:8px;">${escapeHtml(email.trim())}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">User ID</td><td style="padding:8px;font-size:12px;">${escapeHtml(user.id)}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">Message</td><td style="padding:8px;">${escapeHtml(message?.trim() || '—')}</td></tr>
            </table>
          `;
      const result = await sendTransactionalEmail({
        to: adminTo,
        subject: `Premium Access Request — ${name?.trim() || email.trim()}`,
        html,
        text: `Premium request\nName: ${name?.trim() || '—'}\nEmail: ${email.trim()}\nUser: ${user.id}\nMessage: ${message?.trim() || '—'}`,
      });
      if (!result.ok) {
        console.error('Failed to send admin email:', result.error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Premium request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
