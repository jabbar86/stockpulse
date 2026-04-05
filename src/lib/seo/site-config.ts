/** Production deploy (used when `NEXT_PUBLIC_APP_URL` is unset). */
export const CANONICAL_SITE_ORIGIN = 'https://stock-pulse.in';

/** Canonical site origin for sitemap, robots, metadataBase, JSON-LD, and email links. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || CANONICAL_SITE_ORIGIN;
  return raw.replace(/\/$/, '');
}

export const SITE_NAME = 'StockPulse';

export const SITE_TAGLINE =
  'AI-powered stock analysis, portfolio tracking, and Indian market insights for NSE & BSE investors.';

/** Primary keywords for `<meta name="keywords">` and internal reuse. */
export const SEO_KEYWORDS = [
  'Indian stocks',
  'NSE',
  'BSE',
  'Nifty 50',
  'Bank Nifty',
  'Sensex',
  'stock analysis India',
  'portfolio tracker India',
  'equity research India',
  'mutual funds India',
  'AI stock analysis',
  'technical analysis stocks',
  'fundamental analysis',
  'broker integration India',
  'Upstox',
  'Zerodha',
  'Groww',
  'Dhan',
  'Angel One',
  '5paisa',
  'Fyers',
  'ICICI Direct',
  'Kotak Securities',
  'intraday trading India',
  'stock screener India',
] as const;
