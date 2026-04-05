'use client';

import { Reveal } from '@/components/motion/reveal';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Brain,
  Link2,
  TrendingUp,
  Shield,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  Check,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Mock Illustrations — CSS-rendered mini-mockups for each feature    */
/* ------------------------------------------------------------------ */

function IllustrationTechnical() {
  const indicators = [
    { name: 'RSI (14)', value: '42.8', signal: 'Oversold', color: 'text-gain', bg: 'bg-gain/15' },
    { name: 'MACD', value: '-2.15', signal: 'Bearish', color: 'text-loss', bg: 'bg-loss/15' },
    { name: 'SMA 200', value: 'Above', signal: 'Bullish', color: 'text-gain', bg: 'bg-gain/15' },
  ];
  return (
    <div className="space-y-2.5">
      {indicators.map((ind) => (
        <div
          key={ind.name}
          className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
        >
          <div>
            <p className="text-xs font-medium text-muted-foreground">{ind.name}</p>
            <p className="text-sm font-bold tabular-nums">{ind.value}</p>
          </div>
          <Badge variant="secondary" className={cn('text-[10px]', ind.color, ind.bg)}>
            {ind.signal}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function IllustrationAI() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Badge className="bg-primary text-primary-foreground text-[10px]">Buy</Badge>
        <span className="text-xs text-muted-foreground">RELIANCE</span>
      </div>
      <p className="mt-2 text-lg font-bold tabular-nums">87% confidence</p>
      <div className="mt-3 space-y-1.5">
        {['Strong revenue growth QoQ', 'RSI shows oversold bounce', 'Sector rotation into energy'].map((f) => (
          <div key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="mt-0.5 size-3 shrink-0 text-gain" />
            <span>{f}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: 'Support', value: '\u20B92,680' },
          { label: 'Target', value: '\u20B93,150' },
          { label: 'Stop Loss', value: '\u20B92,580' },
        ].map((item) => (
          <div key={item.label} className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
            <p className="text-[9px] text-muted-foreground">{item.label}</p>
            <p className="text-[11px] font-semibold tabular-nums">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function IllustrationBrokers() {
  const brokers = [
    { name: 'Upstox', connected: true },
    { name: 'Angel One', connected: false },
    { name: 'FYERS', connected: false },
    { name: 'CSV Import', icon: true },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {brokers.map((b) => (
        <div
          key={b.name}
          className={cn(
            'relative flex items-center justify-center rounded-lg border border-border bg-card px-3 py-4 text-center',
            b.connected && 'ring-1 ring-gain/40'
          )}
        >
          {b.icon ? (
            <Upload className="mr-1.5 size-4 text-muted-foreground" />
          ) : (
            <Link2 className="mr-1.5 size-4 text-muted-foreground" />
          )}
          <span className="text-xs font-medium">{b.name}</span>
          {b.connected && (
            <div className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-gain text-white">
              <Check className="size-3" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function IllustrationMarket() {
  const rows = [
    { name: 'NIFTY 50', price: '24,680.50', pct: '+1.23', up: true },
    { name: 'SENSEX', price: '81,245.30', pct: '+0.89', up: true },
    { name: 'Gold', price: '\u20B972,450', pct: '-0.12', up: false },
    { name: 'USD/INR', price: '\u20B983.42', pct: '', up: true },
  ];
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="size-1.5 rounded-full bg-gain live-dot" />
        <span className="text-[10px] font-medium text-gain">Live</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs font-medium">{r.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs tabular-nums font-semibold">{r.price}</span>
              {r.pct && (
                <span className={cn('flex items-center gap-0.5 text-[11px] tabular-nums font-medium', r.up ? 'text-gain' : 'text-loss')}>
                  {r.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                  {r.pct}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IllustrationPortfolio() {
  const stats = [
    { label: 'Total Value', value: '\u20B94,52,800', color: '' },
    { label: 'Total P&L', value: '+\u20B938,240', sub: '+9.2%', color: 'text-gain' },
    { label: 'Day Change', value: '+\u20B91,850', color: 'text-gain' },
    { label: 'Risk Score', value: '42', sub: 'Moderate', color: 'text-chart-5' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {stats.map((s) => (
        <div key={s.label} className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="h-0.5 w-full shrink-0 bg-gradient-to-r from-primary to-primary/50" />
          <div className="px-3 py-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className={cn('mt-1 text-sm font-bold tabular-nums', s.color)}>{s.value}</p>
            {s.sub && <p className={cn('text-[10px] tabular-nums', s.color)}>{s.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function IllustrationCopilot() {
  return (
    <div className="space-y-3">
      {/* User bubble */}
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-xs text-primary-foreground">
          What&apos;s my best performer this month?
        </div>
      </div>
      {/* AI bubble */}
      <div className="flex justify-start">
        <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3 text-xs leading-relaxed text-foreground">
          <span className="font-semibold">INFY</span> is your top gainer at{' '}
          <span className="font-semibold text-gain">+12.4%</span>, followed by TCS at{' '}
          <span className="font-semibold text-gain">+8.7%</span>. Both are in the IT sector which has shown strong momentum this quarter.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature data + main component                                      */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Technical analysis that speaks plain English',
    description:
      'RSI, MACD, Bollinger Bands, moving averages — all computed live with clear bullish, bearish, or neutral signals. No guesswork.',
    Illustration: IllustrationTechnical,
  },
  {
    icon: Brain,
    title: 'Three AI models. One clear recommendation.',
    description:
      'Claude, GPT, and Gemini each analyze fundamentals, technicals, and market context. Compare their views or deep-dive into each.',
    Illustration: IllustrationAI,
  },
  {
    icon: Link2,
    title: 'Connect your broker in 60 seconds',
    description:
      'Link Upstox, Angel One, or FYERS for automatic portfolio sync. Prefer manual? Import via CSV from Zerodha, Groww, or any broker.',
    Illustration: IllustrationBrokers,
  },
  {
    icon: TrendingUp,
    title: 'Every pulse of the Indian market',
    description:
      'NIFTY 50, SENSEX, sectoral indices, gold, silver, USD/INR — all live during market hours with WebSocket streaming and intelligent fallbacks.',
    Illustration: IllustrationMarket,
  },
  {
    icon: Shield,
    title: 'Your portfolio, X-rayed',
    description:
      'Invested value vs current, P&L by holding, allocation breakdown, day change tracking, and a risk dashboard with volatility, beta, and concentration scores.',
    Illustration: IllustrationPortfolio,
  },
  {
    icon: Sparkles,
    title: 'Ask anything about your portfolio',
    description:
      'The AI Copilot is your conversational assistant. Ask "Should I average down on RELIANCE?" or "What\'s my sector exposure?" and get instant, context-aware answers.',
    Illustration: IllustrationCopilot,
  },
] as const;

export function LandingFeatures() {
  return (
    <section id="features" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Everything you need to invest smarter
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Tools for tracking, analyzing, and deciding — powered by three AI
              models.
            </p>
          </div>
        </Reveal>

        <div className="mt-16 space-y-20 sm:space-y-24">
          {FEATURES.map((feature, i) => {
            const isEven = i % 2 === 1;
            const Icon = feature.icon;
            return (
              <Reveal key={feature.title} delayMs={0}>
                <div
                  className={cn(
                    'grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16',
                    isEven && 'lg:[direction:rtl]'
                  )}
                >
                  {/* Illustration */}
                  <div
                    className={cn(
                      'landing-illustration-glow rounded-xl border border-border bg-card/50 p-5 shadow-lg shadow-primary/[0.04] sm:p-6',
                      isEven ? 'lg:[direction:ltr]' : ''
                    )}
                  >
                    <feature.Illustration />
                  </div>

                  {/* Text */}
                  <div className={cn(isEven && 'lg:[direction:ltr]')}>
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="size-5 text-primary" strokeWidth={1.75} />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
