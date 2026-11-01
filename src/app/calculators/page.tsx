import type { Metadata } from 'next';
import Link from 'next/link';
import { siteUrl, SITE_NAME } from '@/lib/seo/site-config';
import { CALCULATORS } from '@/lib/seo/public-pages';
import { PublicShell } from '@/components/seo/public-shell';

const canonical = `${siteUrl()}/calculators`;
const title = 'Free Investment & Trading Calculators for India';
const description =
  'Free SIP, brokerage and position size calculators for Indian investors and traders. No sign-up needed.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: { type: 'website', locale: 'en_IN', url: canonical, title, description, siteName: SITE_NAME },
};

export default function CalculatorsIndexPage() {
  return (
    <PublicShell>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {CALCULATORS.map((c) => (
          <li key={c.slug}>
            <Link href={`/calculators/${c.slug}`} className="block h-full rounded-lg border border-border p-5 hover:bg-muted">
              <h2 className="font-semibold">{c.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </PublicShell>
  );
}
