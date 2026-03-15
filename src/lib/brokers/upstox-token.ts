import { createServiceRoleClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/brokers/encryption';

export async function getUpstoxToken(userId: string): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from('broker_connections')
      .select('access_token')
      .eq('user_id', userId)
      .eq('broker', 'upstox')
      .eq('status', 'connected')
      .single();

    if (!data?.access_token) return null;

    return decryptToken(data.access_token);
  } catch {
    return null;
  }
}
