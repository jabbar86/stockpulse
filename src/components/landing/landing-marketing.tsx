'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LandingLiveIndices } from '@/components/landing/landing-live-indices';
import { HeroEnter } from '@/components/motion/hero-enter';
import { Reveal } from '@/components/motion/reveal';
import { cn } from '@/lib/utils';
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

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Technical analysis',
    desc: 'RSI, MACD, moving averages, Bollinger Bands — with clear signals.',
  },
  {
    icon: Brain,
    title: 'AI recommendations',
    desc: 'Buy / hold / sell suggestions from fundamentals, technicals, and context.',
  },
  {
    icon: Link2,
    title: 'Brokers',
    desc: 'Upstox, Angel One, FYERS, CSV from Zerodha, Groww, and more.',
  },
  {
    icon: TrendingUp,
    title: 'Market overview',
    desc: 'Nifty, Sensex, commodities — in INR, updated through the session.',
  },
  {
    icon: Shield,
    title: 'Portfolio',
    desc: 'Invested vs current value, P&L, allocation, and day change.',
  },
  {
    icon: Zap,
    title: 'Quotes',
    desc: 'Fast quotes with fallback providers when one source is slow.',
  },
] as const;

const STATS = [
  { value: 'Live', label: 'Gold & silver' },
  { value: 'NSE', label: 'Coverage' },
  { value: 'AI', label: 'Analysis' },
  { value: '4+', label: 'Brokers' },
] as const;

export function LandingMarketing() {
  const [headerElevated, setHeaderElevated] = useState(false);

  useEffect(() => {
    const onScroll = () => setHeaderElevated(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header
        className={cn(
          'sticky top-0 z-50 border-b border-transparent bg-background/90 backdrop-blur-md transition-[box-shadow,border-color,background-color] duration-300 ease-out',
          headerElevated && 'border-border shadow-sm shadow-primary/[0.06]'
        )}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="group flex items-center gap-2">
            <div className="gaming-logo-bob flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-md shadow-primary/25 transition-transform duration-300 ease-out group-hover:scale-[1.04]">
              <LineChart className="size-4" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">StockPulse</span>
          </Link>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="gaming-cta-glow relative transition-transform duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]"
              >
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="landing-blob pointer-events-none absolute -left-32 top-0 size-[min(70vw,380px)] rounded-full bg-primary/20 blur-[100px] dark:bg-primary/15" />
          <div className="landing-blob-reverse pointer-events-none absolute -right-24 top-24 size-[min(60vw,320px)] rounded-full bg-primary/15 blur-[90px] dark:bg-primary/12" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-30%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_55%)] dark:opacity-90" />

          <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <HeroEnter step={0}>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Indian equities
                </p>
              </HeroEnter>
              <HeroEnter step={1}>
                <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.65rem] lg:leading-[1.15]">
                  Portfolio insight,
                  <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {' '}
                    without the noise
                  </span>
                </h1>
              </HeroEnter>
              <HeroEnter step={2}>
                <p className="mt-5 text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                  Real-time data, technicals, and optional AI views for NSE &amp; BSE. Connect a broker or enter
                  holdings manually.
                </p>
              </HeroEnter>
              <HeroEnter step={3}>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:gap-3">
                  <Link href="/register" className="inline-block sm:inline">
                    <Button className="gaming-cta-glow h-11 w-full px-8 transition-transform duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] sm:w-auto">
                      Start free
                    </Button>
                  </Link>
                  <Link href="/login" className="inline-block sm:inline">
                    <Button
                      variant="outline"
                      className="h-11 w-full px-8 transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.04] sm:w-auto"
                    >
                      Sign in
                    </Button>
                  </Link>
                </div>
              </HeroEnter>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700 [animation-delay:400ms] motion-reduce:animate-none">
              <LandingLiveIndices />
            </div>

            <div className="mx-auto mt-14 flex max-w-xl flex-wrap justify-center gap-x-12 gap-y-6 text-center sm:mt-16">
              {STATS.map((stat, i) => (
                <Reveal key={stat.label} delayMs={i * 70}>
                  <div className="gaming-stat-hover min-w-[4.5rem] cursor-default">
                    <p className="text-lg font-semibold tabular-nums sm:text-xl">{stat.value}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{stat.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">What you get</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Tools for tracking and deciding — not a replacement for your own research.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delayMs={i * 55}>
                <div className="group gaming-feature-card rounded-lg border border-border bg-card px-5 py-5 hover:border-primary/40 hover:bg-primary/[0.04]">
                  <feature.icon
                    className="size-5 text-primary transition-transform duration-300 ease-out group-hover:scale-110"
                    strokeWidth={1.75}
                  />
                  <h3 className="mt-3 text-[15px] font-medium">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="landing-cta-animated border-t border-primary/10">
          <Reveal>
            <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 sm:py-16">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Create an account</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Use StockPulse on the web — no install required.
              </p>
              <Link href="/register" className="group mt-8 inline-block">
                <Button
                  size="lg"
                  className="gaming-cta-glow gap-2 px-8 transition-transform duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]"
                >
                  Register
                  <ArrowRight className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground">
              <LineChart className="size-3" />
            </div>
            <span className="font-medium text-foreground">StockPulse</span>
          </div>
          <p>&copy; {new Date().getFullYear()} StockPulse</p>
        </div>
      </footer>
    </div>
  );
}
