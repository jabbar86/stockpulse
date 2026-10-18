import type { Metadata } from 'next';
import Script from 'next/script';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';

import { JsonLdSite } from '@/components/seo/json-ld';
import { siteUrl, SITE_NAME, SITE_TAGLINE, SEO_KEYWORDS } from '@/lib/seo/site-config';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
const twitterSite = process.env.NEXT_PUBLIC_TWITTER_SITE?.trim();
const twitterCreator = process.env.NEXT_PUBLIC_TWITTER_CREATOR?.trim();
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || 'G-V4W7M9PCMY';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — AI stock analysis & portfolio tracker for India`,
    template: '%s | StockPulse',
  },
  description: SITE_TAGLINE,
  applicationName: SITE_NAME,
  category: 'finance',
  keywords: [...SEO_KEYWORDS],
  authors: [{ name: SITE_NAME, url: siteUrl() }],
  creator: SITE_NAME,
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: '/',
    title: `${SITE_NAME} — AI-powered analysis for NSE & BSE`,
    description: SITE_TAGLINE,
    siteName: SITE_NAME,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'StockPulse — Indian stock analysis',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Indian markets & portfolio AI`,
    description: SITE_TAGLINE,
    images: ['/opengraph-image'],
    ...(twitterSite ? { site: twitterSite } : {}),
    ...(twitterCreator ? { creator: twitterCreator } : {}),
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <body
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <JsonLdSite />
        <TooltipProvider>{children}</TooltipProvider>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaMeasurementId}');`}
        </Script>
      </body>
    </html>
  );
}
