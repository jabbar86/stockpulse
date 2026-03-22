import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { siteUrl, SITE_TAGLINE } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'AI stock analysis & portfolio tracker for India',
  description: SITE_TAGLINE,
  alternates: {
    canonical: `${siteUrl()}/`,
  },
};
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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LineChart className="size-4" />
            </div>
            <span className="font-bold text-lg tracking-tight">StockPulse</span>
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
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-background dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent dark:from-blue-900/20" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20">
            <div className="text-center space-y-6 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                Live market data for Indian stocks
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                Your portfolio,
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                  powered by AI
                </span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Real-time market data, technical indicators, and AI-powered recommendations
                for your Indian stock portfolio. Connect your broker or add holdings manually.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto gap-2 h-12 px-8 text-base">
                    Start for free
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto h-12 px-8 text-base"
                  >
                    Sign in
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="flex justify-center gap-8 sm:gap-16 pt-14 sm:pt-16">
              {[
                { value: 'Live', label: 'Gold & Silver Prices' },
                { value: 'NSE', label: 'Market Coverage' },
                { value: 'AI', label: 'Stock Analysis' },
                { value: '4+', label: 'Broker Integrations' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Everything you need to invest smarter
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-3 max-w-xl mx-auto">
              From real-time data to AI analysis, StockPulse gives you an edge in the Indian market.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                className="group rounded-xl border bg-card p-5 sm:p-6 hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                <div
                  className={`inline-flex size-10 sm:size-11 items-center justify-center rounded-lg bg-gradient-to-br ${feature.gradient} text-white mb-4`}
                >
                  <feature.icon className="size-5" />
                </div>
                <h3 className="font-semibold text-sm sm:text-base">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center text-white">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Ready to take control of your portfolio?
            </h2>
            <p className="text-blue-200/70 mt-3 max-w-md mx-auto text-sm sm:text-base">
              Join StockPulse and start making data-driven investment decisions today.
            </p>
            <Link href="/register">
              <Button
                size="lg"
                className="mt-8 h-12 px-8 text-base bg-white text-slate-900 hover:bg-blue-50"
              >
                Create free account
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
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
