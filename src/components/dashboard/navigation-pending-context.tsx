'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

type NavigationPendingContextValue = {
  /** Programmatic in-app navigation; keeps React in a pending transition so UI can show a loader. */
  navigate: (href: string) => void;
  isPending: boolean;
};

const NavigationPendingContext = createContext<NavigationPendingContextValue | null>(null);

export function NavigationPendingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (href: string) => {
      startTransition(() => {
        router.push(href);
      });
    },
    [router]
  );

  const value = useMemo(() => ({ navigate, isPending }), [navigate, isPending]);

  return (
    <NavigationPendingContext.Provider value={value}>{children}</NavigationPendingContext.Provider>
  );
}

export function useOptionalNavigationPending(): NavigationPendingContextValue | null {
  return useContext(NavigationPendingContext);
}

export function useNavigationPending(): NavigationPendingContextValue {
  const ctx = useContext(NavigationPendingContext);
  if (!ctx) {
    throw new Error('useNavigationPending must be used within NavigationPendingProvider');
  }
  return ctx;
}
