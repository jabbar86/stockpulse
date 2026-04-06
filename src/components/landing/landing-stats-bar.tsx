'use client';

import { useEffect, useRef, useState } from 'react';
import { useCountUp } from './use-count-up';

const STATS = [
  { target: 1800, suffix: '+', label: 'NSE & BSE stocks', highlight: false },
  { target: 3, suffix: '', label: 'Analysis dimensions', highlight: false },
  { target: 4, suffix: '+', label: 'Broker integrations', highlight: false },
  { target: 0, suffix: '', label: 'Cost to start', prefix: '\u20B9', highlight: true },
] as const;

function StatItem({
  target,
  suffix,
  prefix,
  label,
  highlight,
  started,
}: {
  target: number;
  suffix: string;
  prefix?: string;
  label: string;
  highlight: boolean;
  started: boolean;
}) {
  const value = useCountUp(target, started);
  const display = `${prefix || ''}${value.toLocaleString('en-IN')}${suffix}`;

  return (
    <div className="min-w-[7rem] text-center">
      <p
        className={`text-2xl font-bold tabular-nums sm:text-3xl ${
          highlight ? 'text-gain' : 'text-foreground'
        }`}
      >
        {display}
      </p>
      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{label}</p>
    </div>
  );
}

export function LandingStatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="stats"
      ref={ref}
      className="border-y border-border bg-muted/30"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-around gap-6 px-4 py-10 sm:gap-8 sm:px-6 sm:py-12">
        {STATS.map((stat) => (
          <StatItem key={stat.label} {...stat} started={started} />
        ))}
      </div>
    </section>
  );
}
