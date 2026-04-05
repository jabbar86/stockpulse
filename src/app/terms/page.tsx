import type { Metadata } from 'next';
import Link from 'next/link';
import { LineChart } from 'lucide-react';
import { siteUrl, SITE_NAME } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms for using ${SITE_NAME} — educational analytics tool for Indian markets.`,
  alternates: { canonical: `${siteUrl()}/terms` },
  robots: { index: true, follow: true },
};

export default function TermsOfServicePage() {
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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 5 April 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. Agreement</h2>
            <p>
              By accessing or using {SITE_NAME}, you agree to these terms. If you do not agree, do not use the
              service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. What the service is</h2>
            <p>
              {SITE_NAME} offers tools to view market-related information, track a personal portfolio you enter, and
              optional AI-generated summaries.{' '}
              <strong>
                Investments in securities and mutual funds are subject to market risk. Read all scheme-related and
                other relevant documents carefully before investing.
              </strong>{' '}
              <strong>
                Everything on {SITE_NAME} is for information and analytics purposes only. Nothing here is investment,
                legal, or tax advice, and it is not a recommendation to buy or sell any security.
              </strong>{' '}
              Past performance does not guarantee future results. You are solely responsible for your decisions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. Accounts</h2>
            <p>
              You must provide accurate registration information and keep credentials secure. You are responsible for
              activity under your account. We may suspend or terminate accounts that violate these terms or harm the
              service or other users.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. Data and analytics</h2>
            <p>
              We process data you provide and usage data to run and improve the product, including{' '}
              <strong>analytics</strong> (how features are used, reliability, and performance). See our{' '}
              <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
                Privacy Policy
              </Link>{' '}
              for details. We do not sell your personal data to third parties for their independent marketing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Acceptable use</h2>
            <p>You agree not to misuse the service, including by:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Attempting unauthorized access, scraping in violation of our rules, or overloading systems;</li>
              <li>Uploading malware or unlawful content;</li>
              <li>Using the service in a way that violates applicable law.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">6. Third-party data and brokers</h2>
            <p>
              Market data and broker integrations depend on third parties. We do not control their accuracy or
              availability. Your use of third-party services may be subject to their terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">7. Disclaimers</h2>
            <p>
              The service is provided <strong>“as is”</strong> without warranties of any kind, to the fullest extent
              permitted by law. We do not guarantee uninterrupted or error-free operation or that outputs (including AI)
              are complete or correct.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">8. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, {SITE_NAME} and its operators are not liable for indirect,
              incidental, special, or consequential damages, or for any loss arising from your use of or reliance on the
              service or market data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">9. Changes</h2>
            <p>
              We may change these terms or the service. Continued use after changes become effective constitutes
              acceptance. Material changes may be announced in the app or by email where appropriate.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">10. Contact</h2>
            <p>
              <a href="mailto:hello@stock-pulse.in" className="font-medium text-primary underline-offset-4 hover:underline">
                hello@stock-pulse.in
              </a>
            </p>
          </section>

          <p className="text-xs text-muted-foreground">
            These terms are provided for clarity and are not a substitute for professional legal advice.
          </p>
        </div>
      </main>
    </div>
  );
}
