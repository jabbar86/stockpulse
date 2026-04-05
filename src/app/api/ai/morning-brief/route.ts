import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { route } from '@/lib/ai/router';

function todayDateStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = todayDateStr();

    // Check for cached brief
    const { data: cached } = await supabase
      .from('ai_briefs')
      .select('content, model, created_at')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (cached) {
      return NextResponse.json({ brief: cached.content, model: cached.model, cached: true });
    }

    // Generate fresh brief
    return await generateBrief(supabase, user.id, today);
  } catch (error) {
    console.error('Morning brief error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Brief generation failed' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = todayDateStr();

    // Force regenerate
    await supabase
      .from('ai_briefs')
      .delete()
      .eq('user_id', user.id)
      .eq('date', today);

    return await generateBrief(supabase, user.id, today);
  } catch (error) {
    console.error('Morning brief regenerate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Brief regeneration failed' },
      { status: 500 }
    );
  }
}

async function generateBrief(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  today: string
) {
  // Fetch holdings for context
  let holdingsContext = 'No holdings found.';
  try {
    const { data: holdings } = await supabase
      .from('holdings')
      .select('symbol, name, quantity, avg_price')
      .eq('user_id', userId)
      .limit(30);

    if (holdings && holdings.length > 0) {
      holdingsContext = holdings
        .map((h: { symbol: string; name: string; quantity: number; avg_price: number }) =>
          `${h.name} (${h.symbol}): ${h.quantity} shares @ ₹${h.avg_price.toFixed(2)}`
        )
        .join('\n');
    }
  } catch {
    // Optional context
  }

  const prompt = `You are StockPulse AI writing a morning market brief for an Indian stock investor. Today is ${today}.

The user's portfolio:
${holdingsContext}

Write a concise morning brief with these sections:
1. **Market Outlook** — Key themes for today's session (1-2 sentences)
2. **Your Portfolio Watch** — 2-3 specific observations about their holdings to watch today
3. **Key Levels** — Important support/resistance for major indices (Nifty 50, Sensex)
4. **Action Items** — 1-2 practical things to consider today

Keep it under 250 words. Use markdown formatting. Be informative but not advisory. Use INR for all prices.`;

  const response = await route({
    task: 'morning_brief',
    messages: [{ role: 'user', content: prompt }],
  });

  const briefContent = {
    text: response.text,
    generated_at: new Date().toISOString(),
  };

  // Cache in database
  try {
    await supabase.from('ai_briefs').upsert({
      user_id: userId,
      date: today,
      content: briefContent,
      model: response.model,
    });
  } catch {
    // Cache failure is non-fatal
  }

  return NextResponse.json({
    brief: briefContent,
    model: response.model,
    cached: false,
  });
}
