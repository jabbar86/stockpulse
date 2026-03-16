'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/session-provider';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  LineChart,
  Link2,
  LogOut,
  BarChart3,
  ChevronRight,
  Newspaper,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/market', label: 'Market', icon: BarChart3 },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/stocks', label: 'Stocks', icon: TrendingUp },
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/brokers', label: 'Connect', icon: Link2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const name = profile?.name || 'User';
  const email = profile?.email || '';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-sidebar border-r border-sidebar-border md:flex flex-col">
      <div className="p-5 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-md">
            <LineChart className="size-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-sidebar-foreground">StockPulse</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 mt-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <item.icon className="size-5" />
              {item.label}
              {isActive && <ChevronRight className="size-4 ml-auto opacity-70" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        {/* User profile — links to profile page */}
        <Link
          href="/profile"
          className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-sidebar-accent transition-colors"
        >
          <Avatar className="size-9 ring-2 ring-sidebar-primary/30">
            <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-foreground text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">{name}</p>
            {email && (
              <p className="text-xs text-sidebar-foreground/50 truncate">{email}</p>
            )}
          </div>
          <ChevronRight className="size-4 text-sidebar-foreground/30" />
        </Link>
      </div>
    </aside>
  );
}
