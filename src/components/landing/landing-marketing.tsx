'use client';

import { LandingNavbar } from '@/components/landing/landing-navbar';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingStatsBar } from '@/components/landing/landing-stats-bar';
import { LandingFeatures } from '@/components/landing/landing-features';
import { LandingHowItWorks } from '@/components/landing/landing-how-it-works';
import { LandingDashboardPreview } from '@/components/landing/landing-dashboard-preview';
import { LandingPricing } from '@/components/landing/landing-pricing';
import { LandingFinalCta } from '@/components/landing/landing-final-cta';
import { LandingFooter } from '@/components/landing/landing-footer';

export function LandingMarketing() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingStatsBar />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingDashboardPreview />
        <LandingPricing />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
