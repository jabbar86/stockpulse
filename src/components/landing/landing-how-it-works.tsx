'use client';

import { Reveal } from '@/components/motion/reveal';
import { UserPlus, Link2, Sparkles } from 'lucide-react';

const STEPS = [
  {
    title: 'Create your free account',
    description:
      'Sign up with email in under a minute. No credit card, no strings attached.',
    Icon: UserPlus,
  },
  {
    title: 'Add your holdings',
    description:
      'Connect a broker for instant sync or enter stocks manually. Import CSVs from Zerodha, Groww, or any platform.',
    Icon: Link2,
  },
  {
    title: 'Get AI-powered insights',
    description:
      'View technical signals, run AI analysis, track P&L, and chat with the Copilot — all from one dashboard.',
    Icon: Sparkles,
  },
] as const;

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              From signup to insights in three simple steps.
            </p>
          </div>
        </Reveal>

        <div className="relative mx-auto mt-14 max-w-2xl pl-8 sm:pl-12">
          {/* Connecting line */}
          <div className="absolute bottom-8 left-[23px] top-2 w-px border-l-2 border-dashed border-primary/25 sm:left-[29px]" />

          <div className="space-y-12 sm:space-y-14">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delayMs={i * 100}>
                <div className="relative">
                  {/* Number circle */}
                  <div className="absolute -left-8 top-0 flex size-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/25 sm:-left-12 sm:size-12 sm:text-lg">
                    {i + 1}
                  </div>
                  {/* Content */}
                  <div className="ml-6 sm:ml-6">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold sm:text-xl">
                        {step.title}
                      </h3>
                      <step.Icon className="size-5 text-primary/40" />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {step.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
