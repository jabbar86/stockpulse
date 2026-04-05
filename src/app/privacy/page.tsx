import type { Metadata } from 'next';
import Link from 'next/link';
import { LineChart } from 'lucide-react';
import { siteUrl, SITE_NAME } from '@/lib/seo/site-config';

const base = siteUrl();
const canonical = `${base}/privacy`;
const desc = `How ${SITE_NAME} collects and uses data for analytics and to run the service.`;

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: desc,
  alternates: { canonical },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: canonical,
    title: `Privacy Policy | ${SITE_NAME}`,
    description: desc,
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary',
    title: `Privacy Policy | ${SITE_NAME}`,
    description: desc,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LineChart className="size-4" />
            </div>
            {SITE_NAME}
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 5 April 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. Overview</h2>
            <p>
              {SITE_NAME} (“we”, “us”) provides portfolio tracking, market data views, and AI-assisted summaries for
              educational purposes. This policy explains what we collect and how we use it.{' '}
              <strong>
                We use your information primarily to operate the product and for analytics—to understand how features
                are used and to improve the service.
              </strong>{' '}
              We do not sell your personal data to third parties for their own advertising.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. What we collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Account data:</strong> When you sign up, we store identifiers and profile fields needed for
                login (for example email and name) through our authentication provider.
              </li>
              <li>
                <strong>Content you add:</strong> Portfolio holdings, watchlists, notes, and similar data you choose
                to save in the app.
              </li>
              <li>
                <strong>Usage and analytics:</strong> Technical logs, approximate location from IP where applicable,
                device/browser type, and in-app events to measure performance, fix errors, and understand feature usage.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. How we use data</h2>
            <p>We process data to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Provide, secure, and improve {SITE_NAME};</li>
              <li>Run product and service analytics (aggregated or pseudonymous where reasonable);</li>
              <li>Send service-related emails (for example account or digest emails you opt into);</li>
              <li>Comply with law and respond to valid requests.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. Sharing</h2>
            <p>
              We use infrastructure providers (for example database and hosting) that process data on our behalf
              under agreements. They may be located outside India depending on the vendor. We do not sell personal
              information to data brokers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Retention</h2>
            <p>
              We keep account and content data while your account is active and for a limited period afterward for
              backups and legal obligations, unless you ask us to delete it sooner where the law allows.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">6. Your choices</h2>
            <p>
              You may update profile information in the app, opt out of non-essential communications where offered, and
              contact us to request access or deletion of your account data, subject to applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">7. Children</h2>
            <p>The service is not directed at children under 16. We do not knowingly collect their personal data.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">8. Changes</h2>
            <p>
              We may update this policy. We will post the new date at the top and, where appropriate, notify you in the
              app or by email.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">9. Contact</h2>
            <p>
              Questions about this policy:{' '}
              <a href="mailto:hello@stock-pulse.in" className="font-medium text-primary underline-offset-4 hover:underline">
                hello@stock-pulse.in
              </a>
              .
            </p>
          </section>

          <p className="text-xs text-muted-foreground">
            This page is for transparency only and does not constitute legal advice. For regulated advice, consult a
            qualified professional.
          </p>
        </div>
      </main>
    </div>
  );
}
