import { NextRequest, NextResponse } from 'next/server';
import { sendTransactionalEmail } from '@/lib/email/resend-transactional';

/**
 * Local / dev only: send one test message via Resend.
 *
 * POST /api/dev/test-email
 * Header: Authorization: Bearer <EMAIL_TEST_SECRET>
 * Body (JSON): { "to"?: string } — defaults to EMAIL_TEST_TO
 *
 * Requires .env.local: RESEND_API_KEY, EMAIL_TEST_SECRET, EMAIL_TEST_TO (or pass `to` in body).
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const secret = process.env.EMAIL_TEST_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: 'Set EMAIL_TEST_SECRET in .env.local to use this route' },
      { status: 503 }
    );
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { to?: string } = {};
  try {
    body = (await request.json()) as { to?: string };
  } catch {
    body = {};
  }

  const to = (body.to ?? process.env.EMAIL_TEST_TO)?.trim();
  if (!to) {
    return NextResponse.json(
      { error: 'Provide { "to": "you@email.com" } or set EMAIL_TEST_TO in .env.local' },
      { status: 400 }
    );
  }

  const result = await sendTransactionalEmail({
    to,
    subject: 'StockPulse — Resend test',
    text: `If you read this, Resend + env vars work.\nSent at ${new Date().toISOString()}`,
    html: `<p>If you read this, <strong>Resend</strong> + env vars work.</p><p><small>${new Date().toISOString()}</small></p>`,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, to });
}
