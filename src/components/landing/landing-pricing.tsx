'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Reveal } from '@/components/motion/reveal';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    name: 'Free',
    price: '0',
    period: 'forever',
    description: 'Everything you need to get started.',
    features: [
      'Full NSE & BSE coverage',
      'Technical indicators (RSI, MACD, Bollinger)',
      'Portfolio tracking & P&L',
      'CSV import from any broker',
      'Market overview & live indices',
      '5 AI analyses per day',
    ],
    cta: 'Get started',
    variant: 'outline' as const,
    popular: false,
  },
  {
    name: 'Pro',
    price: '499',
    period: 'per month',
    description: 'For serious investors who want the edge.',
    features: [
      'Everything in Free',
      'Unlimited AI analyses',
      'AI Copilot conversations',
      'Broker auto-sync (Upstox, Angel One, FYERS)',
      'Risk dashboard & correlation matrix',
      'Priority support',
    ],
    cta: 'Start free trial',
    variant: 'default' as const,
    popular: true,
  },
] as const;

export function LandingPricing() {
  return (
    <section id="pricing" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Start free. Upgrade when you need more power.
            </p>
          </div>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delayMs={i * 80}>
              <div
                className={cn(
                  'relative flex flex-col rounded-2xl border bg-card p-6 sm:p-8',
                  plan.popular
                    ? 'ring-2 ring-primary shadow-lg shadow-primary/10'
                    : 'border-border'
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2.5 right-6 bg-primary text-primary-foreground">
                    Popular
                  </Badge>
                )}

                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.description}
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tabular-nums">
                    {'\u20B9'}{plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{plan.period}
                  </span>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-gain" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/register" className="mt-8">
                  <Button
                    variant={plan.variant}
                    className={cn(
                      'w-full h-11',
                      plan.popular && 'gaming-cta-glow'
                    )}
                  >
                    {plan.cta}
                  </Button>
                </Link>

                {plan.popular && (
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    7-day free trial included
                  </p>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
