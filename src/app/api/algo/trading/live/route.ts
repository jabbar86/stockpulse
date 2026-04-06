import { NextResponse } from 'next/server';

/**
 * Live broker order placement is intentionally not implemented.
 * Holdings sync uses read-only broker APIs; execution would require
 * exchange-approved algos, risk checks, and explicit user consent.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Live order routing is not enabled. Use POST /api/algo/trading/paper for simulated (paper) trades.',
    },
    { status: 501 }
  );
}
