/** Canonical site origin for sitemap, robots, metadataBase, and JSON-LD. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://stockpulse.app';
  return raw.replace(/\/$/, '');
}

export const SITE_NAME = 'StockPulse';

export const SITE_TAGLINE =
  'AI-powered stock analysis, portfolio tracking, and Indian market insights for NSE & BSE investors.';
