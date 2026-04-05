'use client';

import { DashboardLink } from '@/components/dashboard/dashboard-link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/session-provider';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  LineChart,
  Link2,
  BarChart3,
  Newspaper,
  LifeBuoy,
  Banknote,
  CalendarDays,
  SearchIcon,
  SettingsIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/today', label: 'Today', icon: CalendarDays },
  { href: '/market', label: 'Markets', icon: BarChart3 },
  { href: '/stocks', label: 'Stocks', icon: TrendingUp },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/mutual-funds', label: 'Mutual Funds', icon: Banknote },
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/brokers', label: 'Connect', icon: Link2 },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const name = profile?.name || 'User';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="hidden min-h-0 w-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar md:flex md:sticky md:top-0 md:h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <DashboardLink href="/dashboard" className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/20">
            <LineChart className="size-5" strokeWidth={2.5} />
          </div>
          <div>
            <span className="block font-bold text-[22px] tracking-tight text-foreground">
              Stock<span className="text-primary">Pulse</span>
            </span>
            <span className="text-xs text-muted-foreground font-medium">AI Analytics</span>
          </div>
        </DashboardLink>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <DashboardLink href="/stocks" className="block">
          <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 border border-border px-3 py-2.5">
            <SearchIcon className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Search stocks...</span>
          </div>
        </DashboardLink>
      </div>

      {/* Main navigation */}
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <DashboardLink
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-4 py-3 rounded-xl text-[17px] font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-r-full bg-primary" />
              )}
              <item.icon
                className={cn(
                  'size-5 shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
                strokeWidth={isActive ? 2.25 : 1.75}
              />
              <span>{item.label}</span>
            </DashboardLink>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 pb-1 space-y-1">
        <DashboardLink
          href="/support"
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl text-[17px] font-medium transition-all duration-200',
            pathname === '/support'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <LifeBuoy className="size-5 shrink-0" />
          <span>Support</span>
        </DashboardLink>
        <DashboardLink
          href="/profile"
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl text-[17px] font-medium transition-all duration-200',
            pathname === '/profile'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <SettingsIcon className="size-5 shrink-0" />
          <span>Settings</span>
        </DashboardLink>
      </div>

      {/* User profile */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <DashboardLink
          href="/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors"
        >
          <Avatar className="size-10 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-foreground truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">Premium Pro</p>
          </div>
        </DashboardLink>
      </div>
    </aside>
  );
}
