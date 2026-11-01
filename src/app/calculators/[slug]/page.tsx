import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { siteUrl, SITE_NAME } from '@/lib/seo/site-config';
import { CALCULATORS, getCalculator, type CalculatorSlug } from '@/lib/seo/public-pages';
import { PublicShell, JsonLd } from '@/components/seo/public-shell';
import { SipCalculator } from '@/components/tools/sip-calculator';
import { ChargesCalculator } from '@/components/tools/charges-calculator';
import { PositionSizeCalculator } from '@/components/tools/position-size-calculator';

export const dynamicParams = false;

export function generateStaticParams() {
  return CALCULATORS.map((c) => ({ slug: c.slug }));
}

const WIDGETS: Record<CalculatorSlug, React.ComponentType> = {
  'sip-calculator': SipCalculator,
  'brokerage-calculator': ChargesCalculator,
  'position-size-calculator': PositionSizeCalculator,
};

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const calc = getCalculator((await params).slug);
  if (!calc) return {};
  const canonical = `${siteUrl()}/calculators/${calc.slug}`;
  return {
    title: calc.title,
    description: calc.description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      url: canonical,
      title: calc.title,
      description: calc.description,
      siteName: SITE_NAME,
    },
    twitter: { card: 'summary_large_image', title: calc.title, description: calc.description },
  };
}

export default async function CalculatorPage({ params }: Props) {
  const calc = getCalculator((await params).slug);
  if (!calc) notFound();

  const Widget = WIDGETS[calc.slug];
  const base = siteUrl();
  const url = `${base}/calculators/${calc.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: calc.name,
        url,
        description: calc.description,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: base },
          { '@type': 'ListItem', position: 2, name: 'Calculators', item: `${base}/calculators` },
          { '@type': 'ListItem', position: 3, name: calc.name, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: calc.faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> /{' '}
        <Link href="/calculators" className="hover:text-foreground">Calculators</Link> / <span>{calc.name}</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{calc.name}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{calc.intro}</p>

      <div className="mt-6">
        <Widget />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Frequently asked questions</h2>
        <div className="mt-3 space-y-4">
          {calc.faqs.map((f) => (
            <div key={f.q}>
              <h3 className="text-sm font-semibold">{f.q}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">More calculators</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {CALCULATORS.filter((c) => c.slug !== calc.slug).map((c) => (
            <li key={c.slug}>
              <Link href={`/calculators/${c.slug}`} className="inline-block rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PublicShell>
  );
}
