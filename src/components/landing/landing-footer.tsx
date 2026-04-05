import Link from 'next/link';
import { LineChart } from 'lucide-react';
import { MarketRiskDisclaimer } from '@/components/legal/market-risk-disclaimer';

const PRODUCT_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '/login', label: 'Dashboard' },
] as const;

const RESOURCE_LINKS = [
  { href: '/support', label: 'Support' },
  { href: '/support', label: 'Documentation' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
] as const;

const CONNECT_LINKS = [
  { href: 'https://github.com', label: 'GitHub', external: true },
  { href: 'https://twitter.com', label: 'Twitter / X', external: true },
  { href: 'mailto:hello@stock-pulse.in', label: 'Email' },
] as const;

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <LineChart className="size-3.5" />
              </div>
              <span className="font-bold text-foreground">
                Stock<span className="text-primary">Pulse</span>
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              AI-powered stock analysis for Indian markets.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Product</h3>
            <ul className="mt-3 space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Resources</h3>
            <ul className="mt-3 space-y-2.5">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Connect</h3>
            <ul className="mt-3 space-y-2.5">
              {CONNECT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    {...('external' in link && link.external
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 space-y-4 border-t border-border pt-6">
          <MarketRiskDisclaimer size="sm" className="max-w-3xl mx-auto px-2" />
          <p className="text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} StockPulse. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
