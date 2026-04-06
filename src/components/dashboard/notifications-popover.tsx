'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DashboardLink } from '@/components/dashboard/dashboard-link';

export type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  link_href: string | null;
  kind: string;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function NotificationsPopover() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const j = await res.json();
      setItems(j.notifications ?? []);
      setUnreadCount(typeof j.unreadCount === 'number' ? j.unreadCount : 0);
      if (j.available === false) setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function markRead(ids: string[]) {
    if (!ids.length) return;
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    await load();
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    await load();
  }

  async function onItemActivate(n: NotificationRow) {
    if (!n.read_at) await markRead([n.id]);
    if (n.link_href) {
      setOpen(false);
      router.push(n.link_href);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'relative size-9 rounded-xl text-muted-foreground hover:text-foreground'
        )}
        aria-label="Notifications"
      >
        <BellIcon className="size-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-[min(420px,70vh)] flex flex-col p-0" align="end" side="bottom" sideOffset={8}>
        <PopoverHeader className="border-b border-border px-4 py-3 space-y-0">
          <div className="flex items-center justify-between gap-2">
            <PopoverTitle className="text-base">Notifications</PopoverTitle>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <PopoverDescription className="sr-only">Your recent alerts and updates</PopoverDescription>
        </PopoverHeader>

        {!available ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Notifications are not available yet. Ask your admin to run database migrations.
          </p>
        ) : loading && items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <ul className="overflow-y-auto py-1">
            {items.map((n) => (
              <li key={n.id} className="border-b border-border/80 last:border-0">
                <button
                  type="button"
                  onClick={() => void onItemActivate(n)}
                  className={cn(
                    'flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-muted/60',
                    !n.read_at && 'bg-primary/[0.04]'
                  )}
                >
                  <span className="text-sm font-medium leading-snug">{n.title}</span>
                  {n.body && (
                    <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                  {n.link_href && (
                    <span className="text-xs font-medium text-primary pt-0.5">Open →</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border px-4 py-2.5">
          <DashboardLink
            href="/today"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            Go to Today
          </DashboardLink>
        </div>
      </PopoverContent>
    </Popover>
  );
}
