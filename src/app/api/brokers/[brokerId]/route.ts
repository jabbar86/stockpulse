import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// DELETE /api/brokers/[brokerId] - disconnect a broker
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ brokerId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brokerId } = await params;
    const serviceClient = createServiceRoleClient();

    // Delete the broker connection
    const { error: connError } = await serviceClient
      .from('broker_connections')
      .delete()
      .eq('user_id', userId)
      .eq('broker', brokerId);

    if (connError) {
      console.error('Failed to delete broker connection:', connError);
    }

    // Also remove any stored tokens
    const { error: tokenError } = await serviceClient
      .from('broker_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('broker', brokerId);

    if (tokenError) {
      console.error('Failed to delete broker token:', tokenError);
    }

    // Remove holdings imported from this broker
    const { error: holdingsError } = await serviceClient
      .from('holdings')
      .delete()
      .eq('user_id', userId)
      .eq('source', brokerId);

    if (holdingsError) {
      console.error('Failed to delete broker holdings:', holdingsError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Broker disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect broker' }, { status: 500 });
  }
}
