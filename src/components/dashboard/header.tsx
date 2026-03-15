'use client';

import { useAuth } from '@/lib/auth/session-provider';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LineChart, LogOut } from 'lucide-react';
import Link from 'next/link';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/market': 'Market',
  '/portfolio': 'Portfolio',
  '/stocks': 'Stocks',
  '/brokers': 'Connect',
};

export default function Header() {
  const { profile, signOut } = useAuth();
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
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LineChart className="size-3.5" />
          </div>
          <span className="font-bold text-sm tracking-tight">StockPulse</span>
        </Link>
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

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Mobile sign out */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 md:hidden"
          onClick={() => signOut()}
        >
          <LogOut className="size-4 text-muted-foreground" />
        </Button>
        <Avatar className="size-8 md:size-9">
          <AvatarFallback className="text-[10px] md:text-xs font-medium">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
