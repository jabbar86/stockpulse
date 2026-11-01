import Link from 'next/link';
import { LineChart } from 'lucide-react';
import { SITE_NAME } from '@/lib/seo/site-config';
import { CALCULATORS, SCREENERS } from '@/lib/seo/public-pages';
import { MarketRiskDisclaimer } from '@/components/legal/market-risk-disclaimer';

/** Header + footer for public, indexable pages (stock pages, calculators). */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LineChart className="size-4" />
            </div>
            {SITE_NAME}
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/stock" className="hover:text-foreground">
              Stocks
            </Link>
            <Link href="/stock-screener" className="hidden hover:text-foreground sm:inline">
              Screener
            </Link>
            <Link href="/calculators" className="hover:text-foreground">
              Calculators
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign up free
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/stock" className="hover:text-foreground">
              Nifty 100 stocks
            </Link>
            {CALCULATORS.map((c) => (
              <Link key={c.slug} href={`/calculators/${c.slug}`} className="hover:text-foreground">
                {c.name}
              </Link>
            ))}
            {SCREENERS.map((s) => (
              <Link key={s.slug} href={`/stock-screener/${s.slug}`} className="hover:text-foreground">
                {s.name}
              </Link>
            ))}
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
          <MarketRiskDisclaimer />
        </div>
      </footer>
    </div>
  );
}

/** Renders schema.org JSON-LD. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
