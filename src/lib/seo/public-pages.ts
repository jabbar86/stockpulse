import { NIFTY_100, NIFTY_50 } from '@/lib/market-data/universe';

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

export type CalculatorSlug = 'sip-calculator' | 'brokerage-calculator' | 'position-size-calculator';

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
