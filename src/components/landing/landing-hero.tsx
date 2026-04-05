'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LandingLiveIndices } from '@/components/landing/landing-live-indices';
import { HeroEnter } from '@/components/motion/hero-enter';
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react';

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Animated blobs */}
      <div className="landing-blob pointer-events-none absolute -left-32 top-0 size-[min(70vw,420px)] rounded-full bg-primary/20 blur-[100px]" />
      <div className="landing-blob-reverse pointer-events-none absolute -right-24 top-24 size-[min(60vw,350px)] rounded-full bg-primary/15 blur-[90px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-30%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_55%)]" />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          {/* AI badge */}
          <HeroEnter step={0}>
            <div className="flex justify-center">
              <Badge
                variant="outline"
                className="gap-1.5 px-3 py-1 text-xs font-medium"
              >
                <Sparkles className="size-3 text-primary" />
                Powered by Claude, GPT & Gemini
              </Badge>
            </div>
          </HeroEnter>

          {/* Headline */}
          <HeroEnter step={1}>
            <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.1]">
              Smarter decisions for{' '}
              <span className="landing-gradient-text">Indian markets</span>
            </h1>
          </HeroEnter>

          {/* Subtext */}
          <HeroEnter step={2}>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              AI-powered analysis, real-time data, and portfolio tracking for
              NSE & BSE. Connect your broker, add holdings, and let three AI
              models guide your next move.
            </p>
          </HeroEnter>

          {/* CTAs */}
          <HeroEnter step={3}>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="gaming-cta-glow h-12 w-full gap-2 px-8 text-base transition-transform duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
                >
                  Start free
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-full px-8 text-base transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.04] sm:w-auto"
                onClick={() => scrollTo('how-it-works')}
              >
                See how it works
              </Button>
            </div>
          </HeroEnter>
        </div>

        {/* Live indices */}
        <div className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700 [animation-delay:400ms] motion-reduce:animate-none">
          <LandingLiveIndices />
        </div>

        {/* Scroll hint */}
        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={() => scrollTo('stats')}
            className="landing-scroll-hint text-muted-foreground/50 transition-colors hover:text-muted-foreground"
            aria-label="Scroll down"
          >
            <ChevronDown className="size-6" />
          </button>
        </div>
      </div>
    </section>
  );
}
