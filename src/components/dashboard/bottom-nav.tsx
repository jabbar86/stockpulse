'use client';

import { DashboardLink } from '@/components/dashboard/dashboard-link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BarChart3,
  Briefcase,
  TrendingUp,
  Link2,
  Newspaper,
  CalendarDays,
} from 'lucide-react';

const navItems = [
  {
    href: '/dashboard',
    label: 'Home',
    title: 'Dashboard — your portfolio, P&L, signals & watchlist picks',
    icon: LayoutDashboard,
  },
  {
    href: '/today',
    label: 'Today',
    title: 'Today — briefing vs Nifty/Sensex, what moved you, journal & SIP reminders',
    icon: CalendarDays,
  },
  {
    href: '/market',
    label: 'Market',
    title: 'Market — indices, commodities, sectors & NIFTY 50/100 trade ideas',
    icon: BarChart3,
  },
  { href: '/portfolio', label: 'Portfolio', title: 'Holdings & import', icon: Briefcase },
  { href: '/stocks', label: 'Stocks', title: 'Stock lookup & analysis', icon: TrendingUp },
  { href: '/news', label: 'News', title: 'Market news', icon: Newspaper },
  { href: '/brokers', label: 'Connect', title: 'Link your broker', icon: Link2 },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-xl md:hidden safe-area-bottom">
      <div className="flex items-center justify-around py-1.5 px-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <DashboardLink
              key={item.href}
              href={item.href}
              title={item.title}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-[10px] font-medium transition-colors min-w-[44px] min-h-[44px] justify-center',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground/90 active:text-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'size-5 transition-all',
                  isActive && 'scale-110'
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span>{item.label}</span>
              {isActive && (
                <div className="absolute left-1/2 top-0 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_color-mix(in_oklch,var(--primary)_40%,transparent)]" />
              )}
            </DashboardLink>
          );
        })}
      </div>
    </nav>
  );
}
