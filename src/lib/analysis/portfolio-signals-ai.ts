import { route } from '@/lib/ai/router';
import { hasAnyAiProvider } from '@/lib/ai/models';
import { getCachedAnalysis, setCachedAnalysis } from '@/lib/ai/cache';
import type {
  PortfolioHoldingSignals,
  PortfolioSignalAIForecast,
  PortfolioSignalAIHoldingRow,
  PortfolioSignalsAIResult,
} from '@/types';

function stripCodeFences(text: string): string {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  return t;
}

function normalizeAction(
  v: unknown
): 'buy' | 'sell' | 'hold' | 'exit' {
  const s = String(v || '').toLowerCase();
  if (s === 'buy' || s === 'sell' || s === 'hold' || s === 'exit') return s;
  return 'hold';
}

function normalizeConviction(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 50;
  return Math.min(100, Math.max(0, Math.round(v)));
}

function normalizeForecast(raw: unknown): PortfolioSignalAIForecast | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const rationale = o.rationale;
  if (typeof rationale !== 'string' || rationale.trim().length === 0) return null;
  return {
    action: normalizeAction(o.action),
    conviction: normalizeConviction(o.conviction),
    rationale: rationale.trim().slice(0, 800),
  };
}

function normalizeHoldingRow(raw: unknown): PortfolioSignalAIHoldingRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const symbol = String(o.symbol || '').trim().toUpperCase();
  if (!symbol) return null;
  return {
    symbol,
    intraday: normalizeForecast(o.intraday),
    swing: normalizeForecast(o.swing),
    long_term: normalizeForecast(o.long_term),
    common: normalizeForecast(o.common),
  };
}

function parseAiPayload(text: string): Omit<PortfolioSignalsAIResult, 'model'> | null {
  const cleaned = stripCodeFences(text);
  const parsed = JSON.parse(cleaned) as unknown;
  if (!parsed || typeof parsed !== 'object') return null;
  const root = parsed as Record<string, unknown>;
  const portfolio_note =
    typeof root.portfolio_note === 'string' ? root.portfolio_note.trim().slice(0, 1200) : '';
  const holdingsRaw = root.holdings;
  if (!Array.isArray(holdingsRaw)) return null;
  const holdings: PortfolioSignalAIHoldingRow[] = [];
  for (const h of holdingsRaw) {
    const row = normalizeHoldingRow(h);
    if (row) holdings.push(row);
  }
  return { portfolio_note, holdings };
}

function mergeAiRows(
  ruleHoldings: PortfolioHoldingSignals[],
  parsed: Omit<PortfolioSignalsAIResult, 'model'>
): PortfolioSignalAIHoldingRow[] {
  const bySym = new Map(parsed.holdings.map((h) => [h.symbol.toUpperCase(), h]));
  return ruleHoldings.map((h) => {
    const sym = h.symbol.toUpperCase();
    const ai = bySym.get(sym);
    if (ai) return ai;
    return {
      symbol: h.symbol,
      intraday: null,
      swing: null,
      long_term: null,
      common: null,
    };
  });
}

function parseCachedResult(raw: string): PortfolioSignalsAIResult | null {
  try {
    const o = JSON.parse(raw) as PortfolioSignalsAIResult;
    if (
      typeof o.portfolio_note === 'string' &&
      Array.isArray(o.holdings) &&
      o.holdings.every((x) => x && typeof (x as PortfolioSignalAIHoldingRow).symbol === 'string')
    ) {
      return o;
    }
  } catch {
    // ignore
  }
  return null;
}

export interface EnrichPortfolioSignalsResult {
  ai: PortfolioSignalsAIResult | null;
  aiError?: string;
}

/**
 * Synthesizes AI views (intraday / swing / long term / common) from rule-engine signals.
 * Uses the shared AI router (Ollama → Groq → Gemini → OpenAI → Anthropic).
 */
export async function enrichPortfolioSignalsWithAI(
  userId: string,
  positions: { symbol: string; name: string; quantity?: number; avg_price?: number }[],
  ruleHoldings: PortfolioHoldingSignals[]
): Promise<EnrichPortfolioSignalsResult> {
  if (!hasAnyAiProvider()) {
    return { ai: null, aiError: 'No AI provider configured' };
  }

  const payload = {
    positions,
    rule_signals: ruleHoldings.map((h) => ({
      symbol: h.symbol,
      name: h.name,
      intraday: h.intraday,
      swing: h.swing,
      long_term: h.long_term,
      common: h.common,
    })),
  };

  const promptBody = JSON.stringify(payload);
  const promptForModel = `You are an equity research assistant for Indian markets (NSE/BSE). Output is educational context only — not personalized investment advice.

Below is JSON with the user's positions and rule-based technical signals (intraday from 5m data, swing from ~6mo daily, long_term positional from ~1y daily, common = blended trend read). Synthesize your own view per symbol and horizon.

Input JSON:
${promptBody}

Respond ONLY with valid JSON (no markdown fences) in this exact shape:
{
  "portfolio_note": "<2-4 sentences on portfolio-level themes, risks, and positioning>",
  "holdings": [
    {
      "symbol": "SYMBOL",
      "intraday": { "action": "buy"|"sell"|"hold"|"exit", "conviction": <0-100>, "rationale": "<1-3 sentences>" } | null,
      "swing": { ... } | null,
      "long_term": { ... } | null,
      "common": { ... } | null
    }
  ]
}

Rules:
- Include one object in "holdings" for every symbol in the input.
- If a rule signal for a horizon is null, you may still give a cautious view or set that horizon to null.
- "action" must be buy, sell, hold, or exit.
- Be concise; rationales under ~400 characters each.`;

  const cacheSymbol = 'PORTFOLIO_SIGNALS_AI';
  const cacheKeyPrompt = `${userId}\n${promptForModel}`;
  const cached = await getCachedAnalysis(cacheSymbol, cacheKeyPrompt, 4);
  if (cached) {
    const hit = parseCachedResult(cached.result);
    if (hit) return { ai: hit };
  }

  try {
    const response = await route({
      task: 'portfolio_signals',
      messages: [{ role: 'user', content: promptForModel }],
      maxTokens: 4096,
      temperature: 0.25,
    });

    const parsed = parseAiPayload(response.text);
    if (!parsed) {
      return { ai: null, aiError: 'Could not parse AI response' };
    }

    const holdings = mergeAiRows(ruleHoldings, parsed);
    const out: PortfolioSignalsAIResult = {
      portfolio_note: parsed.portfolio_note,
      holdings,
      model: response.model,
    };

    await setCachedAnalysis(cacheSymbol, cacheKeyPrompt, JSON.stringify(out), response.model);

    return { ai: out };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI request failed';
    return { ai: null, aiError: msg };
  }
}
