import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type RouteTransitionProps = {
  children: ReactNode;
  /** Slightly stronger motion for full-width auth column vs dense dashboard. */
  variant?: 'default' | 'auth';
};

/**
 * Page enter — smooth fade + slide (remounts each navigation via template.tsx).
 * Uses globals `.gaming-route-enter*`. Respects prefers-reduced-motion in CSS.
 */
export function RouteTransition({ children, variant = 'default' }: RouteTransitionProps) {
  return (
    <div
      className={cn(
        variant === 'auth' ? 'gaming-route-enter-auth' : 'gaming-route-enter'
      )}
    >
      {children}
    </div>
  );
}
