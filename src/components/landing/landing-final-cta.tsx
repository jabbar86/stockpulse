'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';
import { ArrowRight } from 'lucide-react';

export function LandingFinalCta() {
  return (
    <section className="landing-cta-animated border-t border-primary/10">
      <Reveal>
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to make smarter trades?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
            Join thousands of Indian investors using AI-powered analysis. Free
            forever for core features.
          </p>
          <Link href="/register" className="group mt-10 inline-block">
            <Button
              size="lg"
              className="gaming-cta-glow h-12 gap-2 px-10 text-base transition-transform duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]"
            >
              Create free account
              <ArrowRight className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-1" />
            </Button>
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required
          </p>
        </div>
      </Reveal>
    </section>
  );
}
