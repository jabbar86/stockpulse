'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { LineChart, Menu } from 'lucide-react';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
] as const;

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function LandingNavbar() {
  const [elevated, setElevated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setElevated(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-transparent bg-background/90 backdrop-blur-md transition-[box-shadow,border-color,background-color] duration-300 ease-out',
        elevated && 'border-border shadow-sm shadow-primary/[0.06]'
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="gaming-logo-bob flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/25 transition-transform duration-300 ease-out group-hover:scale-[1.04]">
            <LineChart className="size-4" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Stock<span className="text-primary">Pulse</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => scrollTo(link.href.slice(1))}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button
              size="sm"
              className="gaming-cta-glow transition-transform duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]"
            >
              Get started
            </Button>
          </Link>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-1.5 sm:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="size-9" />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex flex-col gap-1 pt-8">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.href}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setTimeout(() => scrollTo(link.href.slice(1)), 150);
                    }}
                    className="rounded-lg px-4 py-3 text-left text-base font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  >
                    {link.label}
                  </button>
                ))}
                <div className="my-3 border-t border-border" />
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  Sign in
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className="mt-1 px-4">
                  <Button className="w-full gaming-cta-glow">Get started</Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
