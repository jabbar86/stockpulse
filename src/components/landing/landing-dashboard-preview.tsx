'use client';

import { Reveal } from '@/components/motion/reveal';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  WalletIcon,
  TrendingUp,
  Sun,
  Target,
} from 'lucide-react';

const MOCK_STATS = [
  { label: 'Total Value', value: '\u20B912,45,800', icon: WalletIcon, gradient: 'from-blue-500 to-blue-400' },
  { label: 'Total P&L', value: '+\u20B91,38,240', sub: '+12.4%', icon: TrendingUp, gradient: 'from-emerald-500 to-emerald-400', color: 'text-emerald-600' },
  { label: 'Day Change', value: '+\u20B94,850', sub: '+0.39%', icon: Sun, gradient: 'from-amber-500 to-amber-400', color: 'text-emerald-600' },
  { label: 'Best Performer', value: 'INFY', sub: '+\u20B924,500', icon: Target, gradient: 'from-violet-500 to-violet-400', color: 'text-emerald-600' },
] as const;

const MOCK_HOLDINGS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', ltp: '2,845.30', pct: '+2.14', up: true, pnl: '+\u20B918,420' },
  { symbol: 'TCS', name: 'Tata Consultancy', ltp: '3,980.50', pct: '+1.35', up: true, pnl: '+\u20B912,800' },
  { symbol: 'INFY', name: 'Infosys Limited', ltp: '1,685.20', pct: '+3.42', up: true, pnl: '+\u20B924,500' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', ltp: '1,720.80', pct: '-0.45', up: false, pnl: '-\u20B92,150' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', ltp: '1,245.60', pct: '+0.78', up: true, pnl: '+\u20B94,320' },
] as const;

const ALLOC_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#fb923c', '#f472b6'];

export function LandingDashboardPreview() {
  return (
    <section className="overflow-hidden py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              See the dashboard
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              A real-time command center for your Indian stock portfolio.
            </p>
          </div>
        </Reveal>

        <Reveal delayMs={100}>
          <div className="landing-dashboard-tilt relative mx-auto mt-12 max-w-5xl overflow-hidden rounded-2xl border border-[oklch(0.93_0.004_255)] bg-white text-[oklch(0.15_0.02_260)] shadow-2xl shadow-primary/10">
            {/* Mock header */}
            <div className="flex items-center justify-between border-b border-[oklch(0.93_0.004_255)] px-5 py-3 sm:px-6">
              <div>
                <p className="text-sm font-semibold">
                  <span className="text-[oklch(0.44_0.014_255)]">Welcome back, </span>
                  Jabbar
                </p>
                <p className="text-[11px] text-[oklch(0.44_0.014_255)]">
                  Here&apos;s what&apos;s happening today
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                  <span className="size-1.5 rounded-full bg-emerald-500 live-dot" />
                  Live
                </span>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-4 sm:p-5">
              {MOCK_STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="overflow-hidden rounded-xl border border-[oklch(0.93_0.004_255)] bg-[oklch(0.99_0.001_255)]"
                  >
                    <div className={`h-0.5 w-full bg-gradient-to-r ${stat.gradient}`} />
                    <div className="p-3 sm:p-3.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[8px] font-semibold uppercase tracking-wider text-[oklch(0.44_0.014_255)] sm:text-[9px]">
                          {stat.label}
                        </p>
                        <div className="flex size-6 items-center justify-center rounded-md bg-blue-500/10">
                          <Icon className="size-3 text-blue-500" />
                        </div>
                      </div>
                      <p className={`mt-2 text-sm font-bold tabular-nums sm:text-base ${'color' in stat && stat.color ? stat.color : ''}`}>
                        {stat.value}
                      </p>
                      {'sub' in stat && stat.sub && (
                        <p className={`text-[10px] tabular-nums ${stat.color || ''}`}>{stat.sub}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Holdings table + allocation */}
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              <div className="overflow-hidden rounded-xl border border-[oklch(0.93_0.004_255)] bg-[oklch(0.99_0.001_255)]">
                {/* Table header */}
                <div className="flex items-center justify-between border-b border-[oklch(0.93_0.004_255)] px-4 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.44_0.014_255)]">
                    Holdings
                  </p>
                  <p className="text-[10px] text-[oklch(0.44_0.014_255)]">5 stocks</p>
                </div>

                {/* Table rows */}
                <div className="hidden sm:block">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[oklch(0.93_0.004_255)] text-[9px] uppercase tracking-wider text-[oklch(0.44_0.014_255)]">
                        <th className="px-4 py-2 font-medium">Stock</th>
                        <th className="px-4 py-2 text-right font-medium">LTP</th>
                        <th className="px-4 py-2 text-right font-medium">Change</th>
                        <th className="px-4 py-2 text-right font-medium">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_HOLDINGS.map((h) => (
                        <tr key={h.symbol} className="border-b border-[oklch(0.95_0.004_255)] last:border-0">
                          <td className="px-4 py-2.5">
                            <p className="text-[11px] font-bold">{h.symbol}</p>
                            <p className="text-[9px] text-[oklch(0.44_0.014_255)]">{h.name}</p>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium">{h.ltp}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`inline-flex items-center gap-0.5 tabular-nums font-medium ${h.up ? 'text-emerald-600' : 'text-red-600'}`}>
                              {h.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                              {h.pct}%
                            </span>
                          </td>
                          <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${h.up ? 'text-emerald-600' : 'text-red-600'}`}>
                            {h.pnl}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: condensed list */}
                <div className="sm:hidden">
                  {MOCK_HOLDINGS.slice(0, 3).map((h) => (
                    <div key={h.symbol} className="flex items-center justify-between border-b border-[oklch(0.95_0.004_255)] px-4 py-2.5 last:border-0">
                      <div>
                        <p className="text-[11px] font-bold">{h.symbol}</p>
                        <p className="text-[9px] text-[oklch(0.44_0.014_255)]">{h.ltp}</p>
                      </div>
                      <span className={`text-[11px] tabular-nums font-semibold ${h.up ? 'text-emerald-600' : 'text-red-600'}`}>
                        {h.pnl}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Allocation bar */}
                <div className="border-t border-[oklch(0.93_0.004_255)] px-4 py-3">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-[oklch(0.44_0.014_255)]">
                    Allocation
                  </p>
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-[oklch(0.93_0.004_255)]">
                    {[32, 24, 20, 14, 10].map((pct, i) => (
                      <div
                        key={i}
                        className="h-full first:rounded-l-full last:rounded-r-full"
                        style={{ width: `${pct}%`, backgroundColor: ALLOC_COLORS[i] }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {MOCK_HOLDINGS.map((h, i) => (
                      <span key={h.symbol} className="inline-flex items-center gap-1 text-[9px] text-[oklch(0.44_0.014_255)]">
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: ALLOC_COLORS[i] }} />
                        {h.symbol}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating AI popup */}
            <div className="absolute right-4 top-16 hidden animate-in fade-in slide-in-from-right-4 duration-1000 [animation-delay:800ms] fill-mode-both lg:block">
              <div className="w-52 rounded-xl border border-[oklch(0.93_0.004_255)] bg-white p-3 shadow-xl">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-blue-500" />
                  <span className="text-[10px] font-semibold">AI Analysis</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge className="bg-emerald-500/15 text-emerald-600 text-[9px] px-1.5 py-0">
                    Buy
                  </Badge>
                  <span className="text-[10px] font-medium">RELIANCE</span>
                </div>
                <p className="mt-1.5 text-[9px] text-[oklch(0.44_0.014_255)]">
                  87% confidence based on technical momentum and sector rotation signals.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
