#!/usr/bin/env node
/**
 * Send one real test email via Resend (no Next server required).
 *
 *   node --env-file=.env.local scripts/send-test-email.mjs [recipient@email.com]
 *
 * Requires in .env.local: RESEND_API_KEY
 * Optional: EMAIL_FROM, EMAIL_TEST_TO (default recipient if arg omitted)
 */

import { Resend } from 'resend';

const to = process.argv[2]?.trim() || process.env.EMAIL_TEST_TO?.trim();
if (!to) {
  console.error('Usage: node --env-file=.env.local scripts/send-test-email.mjs <your@email.com>');
  console.error('   or set EMAIL_TEST_TO in .env.local');
  process.exit(1);
}

const key = process.env.RESEND_API_KEY?.trim();
if (!key) {
  console.error('Missing RESEND_API_KEY in environment (.env.local)');
  process.exit(1);
}

const from = process.env.EMAIL_FROM?.trim() || 'onboarding@resend.dev';

const resend = new Resend(key);
const { data, error } = await resend.emails.send({
  from,
  to,
  subject: 'StockPulse — CLI Resend test',
  text: `CLI test at ${new Date().toISOString()}`,
  html: `<p>CLI <strong>Resend</strong> test</p><p><small>${new Date().toISOString()}</small></p>`,
});

if (error) {
  console.error('Resend error:', error.message);
  process.exit(1);
}

console.log('Sent OK, id:', data?.id, '→', to);
