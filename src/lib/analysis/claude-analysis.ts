import { route } from '@/lib/ai/router';
import { MODEL_REGISTRY } from '@/lib/ai/models';
import { getCachedAnalysis, setCachedAnalysis } from '@/lib/ai/cache';
import type {
  StockQuote,
  TechnicalIndicators,
  HistoricalDataPoint,
  AIAnalysis,
  HoldingWithMetrics,
} from '@/types';

export async function analyzeStock(
  symbol: string,
  name: string,
  quote: StockQuote,
  technical: TechnicalIndicators,
  historicalData: HistoricalDataPoint[]
): Promise<AIAnalysis> {
  const recentData = historicalData.slice(-30);
  const priceChange30d =
    recentData.length > 1
      ? ((recentData[recentData.length - 1].close - recentData[0].close) /
          recentData[0].close) *
        100
      : 0;

  const prompt = `You are a senior stock market analyst specializing in Indian equities (NSE/BSE).

Analyze the following stock and provide your recommendation in JSON format.

Stock: ${name} (${symbol})

Current Quote:
- Price: ₹${quote.price}
- Change: ${quote.change} (${quote.changePercent?.toFixed(2)}%)
- Day Range: ₹${quote.dayLow} - ₹${quote.dayHigh}
- Volume: ${quote.volume?.toLocaleString()}
- Market Cap: ${quote.marketCap ? `₹${(quote.marketCap / 10000000).toFixed(2)} Cr` : 'N/A'}
- P/E: ${quote.pe ?? 'N/A'}
- EPS: ${quote.eps ?? 'N/A'}
- 52W High: ₹${quote.fiftyTwoWeekHigh ?? 'N/A'}
- 52W Low: ₹${quote.fiftyTwoWeekLow ?? 'N/A'}

Technical Indicators:
- RSI(14): ${technical.rsi.value} (${technical.rsi.signal})
- MACD: ${technical.macd.macd} | Signal: ${technical.macd.signal} | Histogram: ${technical.macd.histogram} (${technical.macd.trend})
- SMA20: ₹${technical.sma.sma20} | SMA50: ₹${technical.sma.sma50} | SMA200: ₹${technical.sma.sma200}
- EMA12: ₹${technical.ema.ema12} | EMA26: ₹${technical.ema.ema26}
- Bollinger Bands: Upper ₹${technical.bollingerBands.upper} | Middle ₹${technical.bollingerBands.middle} | Lower ₹${technical.bollingerBands.lower} (Price ${technical.bollingerBands.position})
- Technical Score: ${technical.score}/100 (${technical.overallSignal})

30-Day Price Change: ${priceChange30d.toFixed(2)}%

Respond ONLY with a valid JSON object (no markdown, no code fences) matching this exact structure:
{
  "recommendation": "strong_buy" | "buy" | "hold" | "sell" | "strong_sell",
  "confidence": <number 0-100>,
  "summary": "<2-3 sentence analysis summary>",
  "key_factors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "risks": ["<risk 1>", "<risk 2>"],
  "price_targets": {
    "support": <number>,
    "resistance": <number>,
    "target_6m": <number>
  },
  "sector_outlook": "<1-2 sentence sector outlook>"
}`;

  // Check cache first
  const cached = await getCachedAnalysis(symbol, prompt);
  if (cached) {
    try {
      const parsed = JSON.parse(cached.result) as AIAnalysis;
      if (cached.model && MODEL_REGISTRY[cached.model as keyof typeof MODEL_REGISTRY]) {
        const reg = MODEL_REGISTRY[cached.model as keyof typeof MODEL_REGISTRY];
        parsed.source = {
          provider: reg.provider,
          model: cached.model,
          label: reg.label,
        };
      }
      return parsed;
    } catch {
      // Invalid cache entry, continue to fresh analysis
    }
  }

  try {
    const response = await route({
      task: 'stock_analysis',
      messages: [{ role: 'user', content: prompt }],
    });

    let cleaned = response.text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    const parsed = JSON.parse(cleaned) as AIAnalysis;

    if (
      !parsed.recommendation ||
      typeof parsed.confidence !== 'number' ||
      !parsed.summary ||
      !Array.isArray(parsed.key_factors) ||
      !Array.isArray(parsed.risks)
    ) {
      throw new Error('Invalid response structure from AI');
    }

    // Cache the result (LLM JSON only; `source` is added for API consumers)
    await setCachedAnalysis(symbol, prompt, JSON.stringify(parsed), response.model);

    return {
      ...parsed,
      source: {
        provider: response.provider,
        model: response.model,
        label: MODEL_REGISTRY[response.model].label,
      },
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse AI response as JSON');
    }
    throw new Error(
      `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function analyzePortfolio(
  holdings: HoldingWithMetrics[]
): Promise<{
  summary: string;
  diversification_score: number;
  risk_assessment: string;
  suggestions: string[];
  sector_breakdown: string;
}> {
  const totalValue = holdings.reduce((sum, h) => sum + h.current_value, 0);
  const totalPnL = holdings.reduce((sum, h) => sum + h.pnl, 0);
  const totalPnLPercent =
    totalValue > 0
      ? (totalPnL / (totalValue - totalPnL)) * 100
      : 0;

  const holdingsSummary = holdings
    .map(
      (h) =>
        `- ${h.name} (${h.symbol}): ${h.quantity} shares @ ₹${h.avg_price.toFixed(2)}, Current: ₹${h.current_price.toFixed(2)}, P&L: ${h.pnl >= 0 ? '+' : ''}₹${h.pnl.toFixed(2)} (${h.pnl_percent >= 0 ? '+' : ''}${h.pnl_percent.toFixed(2)}%), Allocation: ${h.allocation_percent?.toFixed(1)}%`
    )
    .join('\n');

  const prompt = `You are a portfolio advisor specializing in Indian equities.

Analyze this portfolio and provide insights in JSON format.

Portfolio Summary:
- Total Value: ₹${totalValue.toLocaleString()}
- Total P&L: ${totalPnL >= 0 ? '+' : ''}₹${totalPnL.toLocaleString()} (${totalPnLPercent.toFixed(2)}%)
- Number of Holdings: ${holdings.length}

Holdings:
${holdingsSummary}

Respond ONLY with a valid JSON object (no markdown, no code fences) matching this exact structure:
{
  "summary": "<2-3 sentence portfolio summary>",
  "diversification_score": <number 0-100>,
  "risk_assessment": "<low/moderate/high risk assessment with brief explanation>",
  "suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"],
  "sector_breakdown": "<brief sector concentration analysis>"
}`;

  // Check cache (use "PORTFOLIO" as symbol key)
  const cached = await getCachedAnalysis('PORTFOLIO', prompt);
  if (cached) {
    try {
      return JSON.parse(cached.result);
    } catch {
      // Continue to fresh analysis
    }
  }

  try {
    const response = await route({
      task: 'portfolio_analysis',
      messages: [{ role: 'user', content: prompt }],
    });

    let cleaned = response.text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    const parsed = JSON.parse(cleaned);

    if (
      !parsed.summary ||
      typeof parsed.diversification_score !== 'number' ||
      !parsed.risk_assessment ||
      !Array.isArray(parsed.suggestions)
    ) {
      throw new Error('Invalid portfolio analysis response structure');
    }

    // Cache the result
    await setCachedAnalysis('PORTFOLIO', prompt, JSON.stringify(parsed), response.model);

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse AI portfolio analysis response');
    }
    throw new Error(
      `Portfolio analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
