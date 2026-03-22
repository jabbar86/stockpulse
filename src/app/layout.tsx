import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { JsonLdSite } from '@/components/seo/json-ld';
import { siteUrl, SITE_NAME, SITE_TAGLINE } from '@/lib/seo/site-config';
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — AI stock analysis & portfolio tracker for India`,
    template: '%s | StockPulse',
  },
  description: SITE_TAGLINE,
  applicationName: SITE_NAME,
  category: 'finance',
  keywords: [
    'Indian stocks',
    'NSE',
    'BSE',
    'Nifty 50',
    'Sensex',
    'stock analysis',
    'portfolio tracker',
    'mutual funds India',
    'AI stock recommendations',
    'technical analysis',
    'broker integration India',
    'Upstox',
    'Zerodha',
  ],
  authors: [{ name: SITE_NAME, url: siteUrl() }],
  creator: SITE_NAME,
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
      </body>
    </html>
  );
}
