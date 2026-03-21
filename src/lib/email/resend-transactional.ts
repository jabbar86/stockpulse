import { Resend } from 'resend';

/** Resend’s shared test domain — works without verifying your own domain. Override with `EMAIL_FROM` in production. */
const DEFAULT_FROM = 'onboarding@resend.dev';

/**
 * Transactional email via [Resend](https://resend.com).
 *
 * Env:
 * - `RESEND_API_KEY` (required) — create at resend.com; never commit or paste keys in source.
 * - `EMAIL_FROM` (optional) — e.g. `StockPulse <mail@yourdomain.com>` after domain verify; defaults to `onboarding@resend.dev`.
 */
export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function resendConfigReason(): string {
  if (!process.env.RESEND_API_KEY?.trim()) return 'RESEND_API_KEY not configured';
  return '';
}

function resolvedFrom(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export async function sendTransactionalEmail(params: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = client();
  if (!resend) {
    return { ok: false, error: resendConfigReason() || 'Email not configured' };
  }

  const from = resolvedFrom();

  const base = { from, to: params.to, subject: params.subject };
  const { data, error } = await resend.emails.send(
    params.html != null && params.html !== ''
      ? { ...base, html: params.html, ...(params.text ? { text: params.text } : {}) }
      : { ...base, text: params.text ?? '' }
  );

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data?.id) {
    return { ok: false, error: 'No message id returned' };
  }
  return { ok: true };
}
