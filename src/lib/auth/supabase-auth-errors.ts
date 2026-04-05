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
    return "Signup failed while creating your profile (database). In Supabase → SQL Editor, run supabase/migrations/004_fix_signup_profile_trigger.sql. If it still fails, delete orphaned profile rows that have no auth user (see that file's comment).";
  }
  return raw;
}
