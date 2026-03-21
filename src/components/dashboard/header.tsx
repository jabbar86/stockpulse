'use client';

import { useAuth } from '@/lib/auth/session-provider';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LineChart } from 'lucide-react';
import { DashboardLink } from '@/components/dashboard/dashboard-link';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/market': 'Market',
  '/portfolio': 'Portfolio',
  '/stocks': 'Stocks',
  '/brokers': 'Connect',
  '/profile': 'Profile',
};

export default function Header() {
  const { profile } = useAuth();
  const pathname = usePathname();
  const name = profile?.name || 'User';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Get page title from pathname
  const pageTitle =
    Object.entries(PAGE_TITLES).find(([path]) =>
      pathname === path || pathname.startsWith(path + '/')
    )?.[1] || '';

  return (
    <header className="sticky top-0 z-30 h-14 md:h-16 border-b bg-card/95 backdrop-blur-lg flex items-center justify-between px-3 sm:px-4 md:px-6">
      {/* Mobile: App logo + page title */}
      <div className="flex items-center gap-2 md:hidden">
        <DashboardLink href="/dashboard" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <LineChart className="size-3.5" />
          </div>
          <span className="font-semibold text-sm tracking-tight">
            Stock<span className="text-primary">Pulse</span>
          </span>
        </DashboardLink>
        {pageTitle && (
          <>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-sm font-medium">{pageTitle}</span>
          </>
        )}
      </div>

      {/* Desktop: Welcome message */}
      <div className="hidden md:block">
        <p className="text-base">
          <span className="text-muted-foreground">Welcome back, </span>
          <span className="font-semibold">{name}</span>
        </p>
      </div>

      {/* Right side — avatar links to profile */}
      <DashboardLink href="/profile" className="flex items-center">
        <Avatar className="size-8 md:size-9 ring-2 ring-transparent hover:ring-primary/30 transition-all">
          <AvatarFallback className="text-[10px] md:text-xs font-medium">{initials}</AvatarFallback>
        </Avatar>
      </DashboardLink>
    </header>
  );
}
