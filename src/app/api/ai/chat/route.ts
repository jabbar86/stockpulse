import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { routeStream } from '@/lib/ai/router';
import type { AIMessage } from '@/lib/ai/types';

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userMessages = body.messages as { role: string; content: string }[];

    if (!Array.isArray(userMessages) || userMessages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    // Fetch portfolio context for enriched responses
    let portfolioContext = '';
    try {
      const { data: holdings } = await supabase
        .from('holdings')
        .select('symbol, name, quantity, avg_price')
        .eq('user_id', user.id)
        .limit(20);

      if (holdings && holdings.length > 0) {
        const holdingsList = holdings
          .map((h: { symbol: string; name: string; quantity: number; avg_price: number }) =>
            `${h.name} (${h.symbol}): ${h.quantity} shares @ ₹${h.avg_price.toFixed(2)}`
          )
          .join(', ');
        portfolioContext = `\n\nUser's current portfolio: ${holdingsList}`;
      }
    } catch {
      // Portfolio context is optional
    }

    const systemMessage: AIMessage = {
      role: 'system',
      content: `You are StockPulse AI, a helpful assistant specializing in Indian stock markets (NSE/BSE). You help users understand their portfolio, market trends, and stock analysis. Be concise, use INR for currency, and give practical insights. Do not give financial advice — frame everything as educational information.${portfolioContext}`,
    };

    const messages: AIMessage[] = [
      systemMessage,
      ...userMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const { stream } = await routeStream({
      task: 'chat_response',
      messages,
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    );
  }
}
