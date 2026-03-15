import { LineChart, TrendingUp, Shield, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.1fr]">
      {/* Left: Branding Panel */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#0f1a14] via-[#132a1c] to-[#0d2818] text-white p-10">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-20 -left-10 size-72 rounded-full bg-emerald-400 blur-3xl" />
          <div className="absolute bottom-20 right-0 size-96 rounded-full bg-emerald-500 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 size-64 rounded-full bg-teal-400 blur-3xl" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/20 backdrop-blur border border-emerald-500/20">
              <LineChart className="size-5 text-emerald-400" />
            </div>
            <span className="font-bold text-2xl tracking-tight">StockPulse</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8 max-w-lg">
          <h2 className="text-5xl font-bold leading-tight tracking-tight">
            Your portfolio,
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              powered by intelligence.
            </span>
          </h2>
          <p className="text-emerald-100/50 text-lg leading-relaxed">
            Real-time Indian market data, AI-driven insights, and seamless broker
            integration — all in one beautiful dashboard.
          </p>

          {/* Feature pills */}
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex items-center gap-4 bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] rounded-xl px-5 py-4">
              <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-500/15">
                <TrendingUp className="size-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-base font-medium">250+ NSE Stocks</p>
                <p className="text-sm text-emerald-200/40">Live prices with dynamic sector tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] rounded-xl px-5 py-4">
              <div className="flex size-11 items-center justify-center rounded-lg bg-teal-500/15">
                <BarChart3 className="size-5 text-teal-400" />
              </div>
              <div>
                <p className="text-base font-medium">AI-Powered Analysis</p>
                <p className="text-sm text-emerald-200/40">Technical & fundamental insights in seconds</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] rounded-xl px-5 py-4">
              <div className="flex size-11 items-center justify-center rounded-lg bg-cyan-500/15">
                <Shield className="size-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-base font-medium">Secure Broker Integration</p>
                <p className="text-sm text-emerald-200/40">Connect Upstox, Angel One & more</p>
              </div>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-emerald-300/25">
          &copy; {new Date().getFullYear()} StockPulse. Built for Indian investors.
        </p>
      </div>

      {/* Right: Auth Form */}
      <div className="flex flex-col items-center justify-center bg-gradient-to-b from-background via-background to-muted/20 px-4 py-10 sm:px-8">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-10 lg:hidden">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LineChart className="size-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">StockPulse</span>
        </Link>

        <div className="w-full max-w-[400px]">{children}</div>

        {/* Mobile footer */}
        <p className="text-[10px] text-muted-foreground/40 mt-8 lg:hidden">
          &copy; {new Date().getFullYear()} StockPulse
        </p>
      </div>
    </div>
  );
}
