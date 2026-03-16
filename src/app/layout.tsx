import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://stockpulse.app'),
  title: {
    default: 'StockPulse - AI-Powered Stock Analysis Platform',
    template: '%s | StockPulse',
  },
  description:
    'StockPulse helps Indian investors with AI-powered stock analysis, portfolio health scoring, and real-time market insights.',
  keywords: [
    'Indian stocks',
    'stock analysis',
    'NSE',
    'BSE',
    'portfolio tracker',
    'stock recommendation engine',
  ],
  openGraph: {
    type: 'website',
    url: '/',
    title: 'StockPulse - AI-Powered Stock Analysis for Indian Markets',
    description:
      'Analyze your Indian stock portfolio with AI, technical indicators, and real-time market data.',
    siteName: 'StockPulse',
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
  verification: {
    // Replace this with your actual Google Search Console verification code
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
