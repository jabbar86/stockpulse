import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { searchMutualFunds } from '@/lib/mutual-funds/mfapi';

export const maxDuration = 30;

const TRENDING_QUERIES = [
  'Nifty 50 index direct growth',
  'flexi cap direct growth',
  'elss tax saver direct growth',
  'liquid fund direct growth',
  'mid cap direct growth',
  'small cap direct growth',
];

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const buckets = await Promise.all(
      TRENDING_QUERIES.map(async (q) => {
        try {
          const results = await searchMutualFunds(q);
          return results.slice(0, 3);
        } catch {
          return [];
        }
      })
    );

    const seen = new Set<number>();
    const combined = buckets.flat().filter((r) => {
      if (seen.has(r.schemeCode)) return false;
      seen.add(r.schemeCode);
      return true;
    });

    return NextResponse.json({ results: combined.slice(0, 12) });
  } catch (error) {
    console.error('MF trending error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

