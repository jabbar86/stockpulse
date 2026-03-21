'use client';

import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { useOptionalNavigationPending } from '@/components/dashboard/navigation-pending-context';

export type DashboardLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;

/**
 * Dashboard in-app navigation that participates in {@link NavigationPendingProvider}
 * so {@link DashboardMain} can show a route loader during transitions.
 *
 * Plain {@link Link} resolves prefetched RSC payloads too quickly for `loading.tsx` to appear
 * on all-client pages; pairing with `useTransition` fixes that.
 */
export function DashboardLink({ href, onClick, prefetch = true, ...props }: DashboardLinkProps) {
  const nav = useOptionalNavigationPending();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (!nav) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.button !== 0) return;
    const target = e.currentTarget.getAttribute('target');
    if (target && target !== '_self') return;

    const el = e.currentTarget;
    const path = `${el.pathname}${el.search}${el.hash}`;
    if (!path.startsWith('/')) return;

    e.preventDefault();
    nav.navigate(path);
  };

  return <Link href={href} prefetch={prefetch} onClick={handleClick} {...props} />;
}
