import { siteUrl, SITE_NAME, SITE_TAGLINE } from '@/lib/seo/site-config';

/** Structured data for Google: WebSite, Organization, SoftwareApplication. */
export function JsonLdSite() {
  const base = siteUrl();
  const ogImage = `${base}/opengraph-image`;
  const sameAs = process.env.NEXT_PUBLIC_SOCIAL_PROFILES?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const organization: Record<string, unknown> = {
    '@type': 'Organization',
    '@id': `${base}/#organization`,
    name: SITE_NAME,
    url: base,
    logo: ogImage,
  };
  if (sameAs?.length) {
    organization.sameAs = sameAs;
  }

  const payload = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        name: SITE_NAME,
        url: base,
        description: SITE_TAGLINE,
        inLanguage: 'en-IN',
        publisher: { '@id': `${base}/#organization` },
      },
      organization,
      {
        '@type': 'SoftwareApplication',
        name: SITE_NAME,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        description: SITE_TAGLINE,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'INR',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
