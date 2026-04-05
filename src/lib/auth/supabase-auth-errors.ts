/**
 * Supabase Auth returns low-level API strings; map known cases to clearer copy.
 */
export function friendlySupabaseAuthMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (
    m.includes('rate limit') ||
    m.includes('too many requests') ||
    m.includes('email rate limit') ||
    m.includes('over_email_send_rate_limit') ||
    m.includes('over_request_rate_limit')
  ) {
    return 'Too many verification emails were sent recently. Please wait up to an hour and try again. For production, connect Custom SMTP in Supabase (Authentication → Emails) so mail uses your provider’s limits instead of the built-in cap.';
  }
  if (m.includes('database error saving new user')) {
    return "We couldn’t finish creating your account. Please try signing up again in a few minutes. If it still happens, contact hello@stock-pulse.in — the team may need to fix the database signup step on the server.";
  }
  return raw;
}
