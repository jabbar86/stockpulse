import { NextResponse } from 'next/server';
import { MODEL_REGISTRY, resolveModel } from '@/lib/ai/models';

/**
 * GET /api/ai/status — which provider would serve stock_analysis (no secrets exposed).
 * Use for UI copy: Groq / Ollama / etc. when configured.
 */
export async function GET() {
  try {
    const config = resolveModel('stock_analysis');
    const reg = MODEL_REGISTRY[config.model];
    return NextResponse.json({
      ok: true,
      stock_analysis: {
        provider: config.provider,
        model: config.model,
        label: reg.label,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'No AI provider configured';
    return NextResponse.json({
      ok: false,
      stock_analysis: null,
      message,
    });
  }
}
