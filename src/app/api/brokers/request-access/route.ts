import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import nodemailer from 'nodemailer';

const ADMIN_EMAIL = 'memonjabbar2@gmail.com';

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

    // Send email notification to admin via Gmail
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: `StockAnalysis <${process.env.GMAIL_USER}>`,
          to: ADMIN_EMAIL,
          subject: `Premium Access Request — ${name?.trim() || email.trim()}`,
          html: `
            <h2>New Premium Access Request</h2>
            <table style="border-collapse:collapse;width:100%;max-width:500px;">
              <tr><td style="padding:8px;font-weight:bold;">Name</td><td style="padding:8px;">${name?.trim() || '—'}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">Email</td><td style="padding:8px;">${email.trim()}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">User ID</td><td style="padding:8px;font-size:12px;">${user.id}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">Message</td><td style="padding:8px;">${message?.trim() || '—'}</td></tr>
            </table>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send admin email:', emailError);
        // Don't fail the request if email fails — the DB record is saved
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Premium request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
