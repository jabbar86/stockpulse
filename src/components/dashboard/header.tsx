'use client';

import { useAuth } from '@/lib/auth/session-provider';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LineChart, CalendarDays } from 'lucide-react';
import { DashboardLink } from '@/components/dashboard/dashboard-link';
import { NotificationsPopover } from '@/components/dashboard/notifications-popover';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/market': 'Market',
  '/portfolio': 'Portfolio',
  '/algo': 'AI Algo',
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

  const pageTitle =
    Object.entries(PAGE_TITLES).find(([path]) =>
      pathname === path || pathname.startsWith(path + '/')
    )?.[1] || '';

  const dashWelcome = pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:px-4 md:h-auto md:min-h-[4.25rem] md:px-6 md:py-3">
      {/* Mobile: App logo + page title */}
      <div className="flex items-center gap-2 md:hidden">
        <DashboardLink href="/dashboard" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <LineChart className="size-4" />
          </div>
          <span className="font-bold text-base tracking-tight">
            Stock<span className="text-primary">Pulse</span>
          </span>
        </DashboardLink>
        {pageTitle && (
          <>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm font-semibold">{pageTitle}</span>
          </>
        )}
      </div>

      {/* Desktop: Welcome */}
      <div className="hidden min-w-0 flex-1 md:block">
        <p className="text-lg font-semibold tracking-tight">
          <span className="text-muted-foreground">Welcome back, </span>
          <span>{name}</span>
        </p>
        {dashWelcome ? (
          <p className="mt-0.5 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening in the markets today
          </p>
        ) : pageTitle ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{pageTitle}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        <DashboardLink
          href="/today"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'hidden h-9 gap-2 rounded-xl md:inline-flex'
          )}
        >
          <CalendarDays className="size-4 text-primary" />
          <span className="text-xs font-medium tabular-nums">
            {new Intl.DateTimeFormat('en-IN', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }).format(new Date())}
          </span>
        </DashboardLink>
        <NotificationsPopover />
        <DashboardLink href="/profile" className="flex items-center">
          <Avatar className="size-8 ring-2 ring-transparent transition-all hover:ring-primary/35 md:size-9">
            <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary md:text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DashboardLink>
      </div>
    </header>
  );
}
