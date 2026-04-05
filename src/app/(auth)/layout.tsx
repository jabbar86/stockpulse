import { LineChart, TrendingUp, Shield, BarChart3, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      {/* Left: Branding Panel — vivid gradient */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[oklch(0.59_0.20_255)] via-[oklch(0.52_0.18_258)] to-[oklch(0.45_0.16_268)] text-white p-10">
        {/* Decorative orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 -left-16 size-80 rounded-full bg-white/[0.06] blur-[100px]" />
          <div className="absolute bottom-10 right-0 size-96 rounded-full bg-white/[0.04] blur-[120px]" />
          <div className="absolute top-1/3 right-1/4 size-64 rounded-full bg-[oklch(0.72_0.16_155)] opacity-[0.06] blur-[80px]" />
        </div>

        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.25) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm shadow-lg">
              <LineChart className="size-5" />
            </div>
            <span className="font-bold text-2xl tracking-tight">
              Stock<span className="opacity-80">Pulse</span>
            </span>
          </Link>
        </div>

        {/* Headline + features */}
        <div className="relative z-10 space-y-8 max-w-lg">
          <div className="space-y-4">
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
              Smart investing
              <br />
              starts here.
            </h2>
            <p className="text-white/60 text-lg leading-relaxed max-w-md">
              Real-time Indian market data, AI-driven insights, and seamless
              broker integration — all in one dashboard.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            {[
              { Icon: TrendingUp, text: '1,800+ NSE & BSE stocks with live prices' },
              { Icon: Sparkles, text: 'Multi-model AI analysis (Claude, GPT, Gemini)' },
              { Icon: BarChart3, text: 'Technical indicators with buy/sell signals' },
              { Icon: Shield, text: 'Secure Upstox & Angel One integration' },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4" />
                </div>
                <p className="text-sm text-white/75">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Social proof */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <CheckCircle2 className="size-3.5" />
            <span>Free to start &middot; No credit card required</span>
          </div>
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} StockPulse. Built for Indian investors.
          </p>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex flex-col items-center justify-center bg-background px-4 py-10 sm:px-8">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-10 lg:hidden">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <LineChart className="size-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">
            Stock<span className="text-primary">Pulse</span>
          </span>
        </Link>

        <div className="w-full max-w-[400px]">{children}</div>

        <p className="text-[10px] text-muted-foreground/40 mt-8 lg:hidden">
          &copy; {new Date().getFullYear()} StockPulse
        </p>
      </div>
    </div>
  );
}
