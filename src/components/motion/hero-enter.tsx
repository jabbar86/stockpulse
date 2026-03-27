'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

type HeroEnterProps = {
  children: ReactNode;
  /** Stagger order (0 = first). */
  step: number;
  className?: string;
};

/** Mount-time stagger for hero lines. */
export function HeroEnter({ children, step, className }: HeroEnterProps) {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (reduced) {
      setShow(true);
      return;
    }
    const ms = 50 + step * 85;
    const id = window.setTimeout(() => setShow(true), ms);
    return () => window.clearTimeout(id);
  }, [reduced, step]);

  return (
    <div
      className={cn(
        reduced ? 'opacity-100' : show ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        !reduced && 'transition-[opacity,transform] duration-700 ease-out',
        className
      )}
    >
      {children}
    </div>
  );
}
