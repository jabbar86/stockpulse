import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TrendingUp, BarChart3, Brain, Link2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">StockAnalysis</span>
          </div>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center space-y-6 mb-20">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            AI-Powered Stock Analysis
            <br />
            <span className="text-muted-foreground">for Indian Markets</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect your Upstox or Zerodha account, get technical indicators and
            AI-powered recommendations for your portfolio.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/register">
              <Button size="lg">Start analyzing</Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Technical Analysis</h3>
            <p className="text-sm text-muted-foreground">
              RSI, MACD, SMA, EMA, Bollinger Bands — all calculated
              automatically with clear signals.
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">AI Recommendations</h3>
            <p className="text-sm text-muted-foreground">
              Claude AI analyzes fundamentals, technicals, and market sentiment
              to give buy/hold/sell recommendations.
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Link2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Broker Integration</h3>
            <p className="text-sm text-muted-foreground">
              Connect Upstox or Zerodha to automatically import your holdings
              and track your portfolio.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
