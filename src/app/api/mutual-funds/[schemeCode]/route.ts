import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getMutualFundDetails } from '@/lib/mutual-funds/mfapi';

export const maxDuration = 30;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ schemeCode: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { schemeCode } = await params;
    const code = Number(schemeCode);
    if (!Number.isFinite(code)) {
      return NextResponse.json({ error: 'Invalid scheme code' }, { status: 400 });
    }

    const details = await getMutualFundDetails(code);
    return NextResponse.json(details);
  } catch (error) {
    console.error('MF details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

