'use client';

import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function Header() {
  const { data: session } = useSession();
  const name = session?.user?.name || 'User';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <div className="md:ml-0 ml-12">
        <h2 className="text-sm text-muted-foreground">Welcome back,</h2>
        <p className="font-semibold">{name}</p>
      </div>
      <Avatar className="h-9 w-9">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
    </header>
  );
}
