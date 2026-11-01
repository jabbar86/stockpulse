import { NIFTY_100, NIFTY_50 } from '@/lib/market-data/universe';
import { MACD_CROSS_LOOKBACK, MA_CROSS_LOOKBACK, type ScreenerFilters, type ScreenerSnapshot } from '@/lib/screener/filters';

/**
 * Public, indexable pages (outside the logged-in app). Kept in one place so the
 * sitemap, internal links and route guards stay in sync.
 */

/** Stocks that get a public `/stock/[symbol]` page. Limited to a known universe to avoid thin pages. */
export const PUBLIC_STOCK_SYMBOLS: readonly string[] = NIFTY_100;

const PUBLIC_STOCK_SET = new Set(PUBLIC_STOCK_SYMBOLS);

export function isPublicStock(symbol: string): boolean {
  return PUBLIC_STOCK_SET.has(symbol);
}

export function isNifty50(symbol: string): boolean {
  return NIFTY_50.includes(symbol);
}

export function stockPath(symbol: string): string {
  return `/stock/${encodeURIComponent(symbol)}`;
}

/** Route params may arrive percent-encoded (e.g. `M%26M`). */
export function symbolFromParam(param: string): string {
  try {
    return decodeURIComponent(param).toUpperCase();
  } catch {
    return param.toUpperCase();
  }
}

export type CalculatorSlug =
  | 'sip-calculator'
  | 'capital-gains-tax-calculator'
  | 'brokerage-calculator'
  | 'position-size-calculator';

export type CalculatorPage = {
  slug: CalculatorSlug;
  name: string;
  title: string;
  description: string;
  intro: string;
  faqs: { q: string; a: string }[];
};

export const CALCULATORS: readonly CalculatorPage[] = [
  {
    slug: 'sip-calculator',
    name: 'SIP Calculator',
    title: 'SIP Calculator — Step-up SIP & Lumpsum Returns',
    description:
      'Free SIP calculator for India. Estimate mutual fund SIP, step-up SIP and lumpsum returns with year-by-year growth.',
    intro:
      'Work out how much a monthly SIP or a one-time lumpsum investment could grow to. Add an annual step-up to see the effect of raising your SIP every year.',
    faqs: [
      {
        q: 'How is SIP return calculated?',
        a: 'Each monthly instalment compounds at the expected annual return divided into monthly periods. The maturity value is the sum of every instalment grown until the end of the tenure (future value of an annuity due).',
      },
      {
        q: 'What is a step-up SIP?',
        a: 'A step-up (top-up) SIP raises the monthly instalment by a fixed percentage every year, usually in line with salary growth. Even a 10% annual step-up can substantially increase the final corpus.',
      },
      {
        q: 'Are SIP returns guaranteed?',
        a: 'No. Mutual fund returns depend on market performance. The calculator uses a constant assumed rate for illustration only.',
      },
    ],
  },
  {
    slug: 'capital-gains-tax-calculator',
    name: 'Capital Gains Tax Calculator',
    title: 'Capital Gains Tax Calculator for Shares — STCG & LTCG (FY 2026-27)',
    description:
      'Free STCG and LTCG tax calculator for Indian shares and equity mutual funds. 20% STCG, 12.5% LTCG above ₹1.25 lakh, with cess and holding-period check.',
    intro:
      'Enter your buy and sell prices, quantity and dates to see whether the gain is short or long term, how much of the ₹1.25 lakh LTCG exemption applies, and the tax including 4% cess.',
    faqs: [
      {
        q: 'What is the STCG tax rate on shares in India?',
        a: 'Listed equity shares and equity mutual funds held for 12 months or less are taxed at 20% (plus 4% cess) on the short-term capital gain, for sales on or after 23 July 2024.',
      },
      {
        q: 'What is the LTCG tax rate on shares?',
        a: 'Gains on listed equity held for more than 12 months are taxed at 12.5% (plus 4% cess) on the amount above ₹1.25 lakh in a financial year, for sales on or after 23 July 2024.',
      },
      {
        q: 'Can I set off capital losses?',
        a: 'Short-term capital losses can be set off against both short-term and long-term gains. Long-term losses can only be set off against long-term gains. Unused losses can be carried forward for 8 years if you file your return on time.',
      },
      {
        q: 'Is intraday trading taxed as capital gains?',
        a: 'No. Intraday equity trades are treated as speculative business income and taxed at your income-tax slab rate, not as capital gains.',
      },
    ],
  },
  {
    slug: 'brokerage-calculator',
    name: 'Brokerage & Charges Calculator',
    title: 'Brokerage Calculator — STT, GST, Stamp Duty & Net P&L',
    description:
      'Free brokerage calculator for NSE & BSE. See STT, exchange charges, SEBI fees, GST, stamp duty, DP charges and net profit for delivery and intraday trades.',
    intro:
      'Enter your buy price, sell price and quantity to see every statutory charge on an equity trade and your net profit after costs. Works for delivery and intraday, with flat or percentage brokerage.',
    faqs: [
      {
        q: 'What charges apply to a share trade in India?',
        a: 'Brokerage, Securities Transaction Tax (STT), exchange transaction charges, SEBI turnover fees, GST on brokerage and exchange charges, stamp duty on the buy side and, for delivery sells, DP charges.',
      },
      {
        q: 'Why is intraday cheaper than delivery?',
        a: 'STT and stamp duty rates are lower for intraday trades, and no DP charge applies because shares never move to your demat account.',
      },
      {
        q: 'What is the breakeven price?',
        a: 'The sell price at which your total charges are fully covered, so your net profit is zero.',
      },
    ],
  },
  {
    slug: 'position-size-calculator',
    name: 'Position Size Calculator',
    title: 'Position Size Calculator — Risk per Trade & Stop Loss',
    description:
      'Free position size calculator for stock traders. Size each trade by capital, risk % and stop loss, and see the risk-reward ratio.',
    intro:
      'Decide how many shares to buy so that a stop-loss hit costs only the percentage of capital you are willing to risk. Add a target to see the reward-to-risk ratio.',
    faqs: [
      {
        q: 'How do you calculate position size?',
        a: 'Divide the amount you are willing to lose (capital × risk %) by the per-share risk (entry price − stop loss). The result is the number of shares to buy.',
      },
      {
        q: 'How much should I risk per trade?',
        a: 'Many traders risk 0.5%–2% of capital per trade so that a run of losses does not cause a large drawdown.',
      },
    ],
  },
];

export function getCalculator(slug: string): CalculatorPage | undefined {
  return CALCULATORS.find((c) => c.slug === slug);
}

export type ScreenerPage = {
  slug: string;
  name: string;
  title: string;
  description: string;
  /** Unique explanatory copy for the page (helps it rank on its own). */
  intro: string;
  filters: ScreenerFilters;
  /** Order results so the strongest matches come first. */
  sort: (a: ScreenerSnapshot, b: ScreenerSnapshot) => number;
};

const pctFromHigh = (s: ScreenerSnapshot) => (s.high52w > 0 ? (s.high52w - s.price) / s.high52w : Infinity);
const pctFromLow = (s: ScreenerSnapshot) => (s.low52w > 0 ? (s.price - s.low52w) / s.low52w : Infinity);
const vs200 = (s: ScreenerSnapshot) => (s.sma200 ? (s.price - s.sma200) / s.sma200 : 0);

/** Public `/stock-screener/[slug]` pages, all over the Nifty 100 on daily candles. */
export const SCREENERS: readonly ScreenerPage[] = [
  {
    slug: 'oversold-stocks',
    name: 'Oversold stocks (RSI below 30)',
    title: 'Oversold Stocks Today — Nifty 100 Stocks with RSI Below 30',
    description: 'Nifty 100 stocks with a daily RSI(14) below 30, updated through the trading day.',
    intro:
      'An RSI(14) below 30 means a stock has fallen sharply relative to its recent gains. Some traders watch oversold stocks for a bounce, but a low RSI can persist in a strong downtrend, so it is a starting point for research rather than a buy signal.',
    filters: { rsiMax: 30 },
    sort: (a, b) => (a.rsi14 ?? 50) - (b.rsi14 ?? 50),
  },
  {
    slug: 'overbought-stocks',
    name: 'Overbought stocks (RSI above 70)',
    title: 'Overbought Stocks Today — Nifty 100 Stocks with RSI Above 70',
    description: 'Nifty 100 stocks with a daily RSI(14) above 70, updated through the trading day.',
    intro:
      'An RSI(14) above 70 shows strong recent buying momentum. Momentum traders often see it as strength, while others treat it as a sign the move is stretched. Strong uptrends can stay overbought for weeks.',
    filters: { rsiMin: 70 },
    sort: (a, b) => (b.rsi14 ?? 50) - (a.rsi14 ?? 50),
  },
  {
    slug: 'stocks-near-52-week-high',
    name: 'Stocks near 52-week high',
    title: 'Stocks Near 52-Week High — Nifty 100 Within 5% of Their High',
    description: 'Nifty 100 stocks trading within 5% of their 52-week high.',
    intro:
      'Stocks close to their 52-week high are in the upper end of their yearly range. Breakouts to new highs are a common momentum setup, and the 52-week high often acts as resistance until it is cleared.',
    filters: { near52wHighPct: 5 },
    sort: (a, b) => pctFromHigh(a) - pctFromHigh(b),
  },
  {
    slug: 'stocks-near-52-week-low',
    name: 'Stocks near 52-week low',
    title: 'Stocks Near 52-Week Low — Nifty 100 Within 5% of Their Low',
    description: 'Nifty 100 stocks trading within 5% of their 52-week low.',
    intro:
      'Stocks near their 52-week low are at the bottom of their yearly range. Value investors sometimes look here for beaten-down quality names, but weak price action can also reflect deteriorating fundamentals.',
    filters: { near52wLowPct: 5 },
    sort: (a, b) => pctFromLow(a) - pctFromLow(b),
  },
  {
    slug: 'stocks-above-200-dma',
    name: 'Stocks above 200 DMA',
    title: 'Stocks Above 200 DMA — Nifty 100 Trading Above the 200-Day Moving Average',
    description: 'Nifty 100 stocks whose price is above the 200-day simple moving average.',
    intro:
      'The 200-day moving average is the most widely watched long-term trend line. A price above it is generally read as a long-term uptrend. The share of index stocks above their 200 DMA is also used as a gauge of overall market breadth.',
    filters: { sma200: 'above' },
    sort: (a, b) => vs200(b) - vs200(a),
  },
  {
    slug: 'stocks-below-200-dma',
    name: 'Stocks below 200 DMA',
    title: 'Stocks Below 200 DMA — Nifty 100 Trading Below the 200-Day Moving Average',
    description: 'Nifty 100 stocks whose price is below the 200-day simple moving average.',
    intro:
      'A price below the 200-day moving average is usually read as a long-term downtrend. Stocks reclaiming the 200 DMA after a long spell below it are a setup many swing traders track.',
    filters: { sma200: 'below' },
    sort: (a, b) => vs200(a) - vs200(b),
  },
  {
    slug: 'golden-cross-stocks',
    name: 'Golden cross stocks',
    title: 'Golden Cross Stocks — 50 DMA Crossed Above 200 DMA (Nifty 100)',
    description: `Nifty 100 stocks where the 50-day moving average crossed above the 200-day in the last ${MA_CROSS_LOOKBACK} sessions.`,
    intro:
      'A golden cross happens when the 50-day moving average rises above the 200-day moving average. It is a slow, lagging signal that traders use to confirm a shift from a downtrend to an uptrend.',
    filters: { maCross: 'golden' },
    sort: (a, b) => (a.maCross?.barsAgo ?? 99) - (b.maCross?.barsAgo ?? 99),
  },
  {
    slug: 'macd-bullish-crossover-stocks',
    name: 'MACD bullish crossover stocks',
    title: 'MACD Bullish Crossover Stocks Today (Nifty 100)',
    description: `Nifty 100 stocks where the MACD line crossed above its signal line in the last ${MACD_CROSS_LOOKBACK} sessions.`,
    intro:
      'A bullish MACD crossover occurs when the MACD line (12-day EMA minus 26-day EMA) crosses above its 9-day signal line. It points to improving short-term momentum and is often combined with trend filters such as the 200 DMA.',
    filters: { macdCross: 'bullish' },
    sort: (a, b) => (a.macdCross?.barsAgo ?? 99) - (b.macdCross?.barsAgo ?? 99),
  },
  {
    slug: 'volume-spike-stocks',
    name: 'Volume spike stocks',
    title: 'Volume Spike Stocks Today — Nifty 100 Unusual Volume',
    description: 'Nifty 100 stocks trading at least 1.5× their 20-day average volume.',
    intro:
      'Unusually high volume shows heavy participation, often around news, results or a breakout. A price move on high volume is generally considered more significant than the same move on light volume.',
    filters: { minVolumeRatio: 1.5 },
    sort: (a, b) => (b.volumeRatio ?? 0) - (a.volumeRatio ?? 0),
  },
];

export function getScreener(slug: string): ScreenerPage | undefined {
  return SCREENERS.find((s) => s.slug === slug);
}
