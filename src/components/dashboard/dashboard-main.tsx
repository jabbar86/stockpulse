'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useOptionalNavigationPending } from '@/components/dashboard/navigation-pending-context';
import { RouteLoading } from '@/components/dashboard/route-loading';

type DashboardMainProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Wraps dashboard `<main>` and shows {@link RouteLoading} while a {@link DashboardLink}
 * navigation transition is in flight.
 */
export function DashboardMain({ children, className }: DashboardMainProps) {
  const nav = useOptionalNavigationPending();
  const pending = nav?.isPending ?? false;

  return (
    <main className={cn('relative', className)}>
      {children}
      {pending ? (
        <div
          className="absolute inset-0 z-20 flex justify-center bg-background/75 backdrop-blur-[2px] pt-6 sm:pt-10 md:pt-8"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="w-full max-w-6xl px-3 sm:px-4 md:px-6">
            <RouteLoading label="Loading page…" />
          </div>
        </div>
      ) : null}
    </main>
  );
}
