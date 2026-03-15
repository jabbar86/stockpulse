import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/brokers - list broker connections for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const { data: connections, error } = await serviceClient
      .from('broker_connections')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to fetch broker connections:', error);
      return NextResponse.json({ connections: [] });
    }

    return NextResponse.json({ connections: connections || [] });
  } catch (error) {
    console.error('Broker list error:', error);
    return NextResponse.json({ connections: [] });
  }
}
