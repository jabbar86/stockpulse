'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/session-provider';

/**
 * Client-side auth guard for dashboard routes.
 * Avoids redirecting in middleware so sessions can rehydrate after tab/browser restart.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (user) return;
    const url = `/login?callbackUrl=${encodeURIComponent(pathname || '/dashboard')}`;
    router.replace(url);
    router.refresh();
  }, [loading, user, router, pathname]);

  if (loading) return null;
  if (!user) return null;
  return <>{children}</>;
}

