import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LandingLiveIndices } from '@/components/landing/landing-live-indices';
import { siteUrl, SITE_TAGLINE } from '@/lib/seo/site-config';
import {
  LineChart,
  BarChart3,
  Brain,
  Link2,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI stock analysis & portfolio tracker for India',
  description: SITE_TAGLINE,
  alternates: {
    canonical: `${siteUrl()}/`,
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LineChart className="size-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">StockPulse</span>
          </Link>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-background dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent dark:from-blue-900/20" />

          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
            <div className="mx-auto max-w-3xl space-y-6 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
                Live market data for Indian stocks
              </div>

              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                Your portfolio,
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400">
                  powered by AI
                </span>
              </h1>

              <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Real-time market data, technical indicators, and AI-powered recommendations for your Indian stock
                portfolio. Connect your broker or add holdings manually.
              </p>

              <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
                <Link href="/register">
                  <Button size="lg" className="h-12 w-full gap-2 px-8 text-base sm:w-auto">
                    Start for free
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg" className="h-12 w-full px-8 text-base sm:w-auto">
                    Sign in
                  </Button>
                </Link>
              </div>
            </div>

            <LandingLiveIndices />

            <div className="flex justify-center gap-8 pt-14 sm:gap-16 sm:pt-16">
              {[
                { value: 'Live', label: 'Gold & Silver Prices' },
                { value: 'NSE', label: 'Market Coverage' },
                { value: 'AI', label: 'Stock Analysis' },
                { value: '4+', label: 'Broker Integrations' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-xl font-bold sm:text-2xl">{stat.value}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="text-2xl font-bold sm:text-3xl">Everything you need to invest smarter</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              From real-time data to AI analysis, StockPulse gives you an edge in the Indian market.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {[
              {
                icon: BarChart3,
                title: 'Technical Analysis',
                desc: 'RSI, MACD, SMA, EMA, Bollinger Bands — all calculated automatically with clear buy/sell signals.',
                gradient: 'from-blue-500 to-cyan-500',
              },
              {
                icon: Brain,
                title: 'AI Recommendations',
                desc: 'AI analyzes fundamentals, technicals, and sentiment to give actionable buy/hold/sell recommendations.',
                gradient: 'from-violet-500 to-purple-500',
              },
              {
                icon: Link2,
                title: 'Multi-Broker Support',
                desc: 'Connect Upstox, Angel One, FYERS or import via CSV from Zerodha, Groww and more.',
                gradient: 'from-orange-500 to-red-500',
              },
              {
                icon: TrendingUp,
                title: 'Live Market Overview',
                desc: 'Track Nifty, Sensex, gold, silver, crude oil prices — all in Indian Rupees, updated live.',
                gradient: 'from-green-500 to-emerald-500',
              },
              {
                icon: Shield,
                title: 'Portfolio Tracking',
                desc: 'See your total invested value, current value, P&L, day change, and allocation at a glance.',
                gradient: 'from-indigo-500 to-blue-500',
              },
              {
                icon: Zap,
                title: 'Real-time Prices',
                desc: 'Multi-provider fallback ensures you always get the fastest, most reliable quotes available.',
                gradient: 'from-amber-500 to-orange-500',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-6"
              >
                <div
                  className={`mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${feature.gradient} text-white sm:size-11`}
                >
                  <feature.icon className="size-5" />
                </div>
                <h3 className="text-sm font-semibold sm:text-base">{feature.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center text-white sm:px-6 sm:py-20">
            <h2 className="text-2xl font-bold sm:text-3xl">Ready to take control of your portfolio?</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-blue-200/70 sm:text-base">
              Join StockPulse and start making data-driven investment decisions today.
            </p>
            <Link href="/register">
              <Button size="lg" className="mt-8 h-12 bg-white px-8 text-base text-slate-900 hover:bg-blue-50">
                Create free account
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground">
              <LineChart className="size-3" />
            </div>
            <span className="font-medium text-foreground">StockPulse</span>
          </div>
          <p>&copy; {new Date().getFullYear()} StockPulse. Built for Indian investors.</p>
        </div>
      </footer>
    </div>
  );
}
