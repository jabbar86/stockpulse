'use client';

import { useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { cn } from '@/lib/utils';
import { MinimizeIcon, MaximizeIcon } from 'lucide-react';

interface WidgetCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

export function WidgetCard({
  title,
  icon,
  children,
  loading,
  collapsible = false,
  defaultCollapsed = false,
  className,
}: WidgetCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <Card className={cn('transition-all', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
            {icon}
            {title}
          </CardTitle>
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="size-7 p-0"
            >
              {collapsed ? (
                <MaximizeIcon className="size-3.5" />
              ) : (
                <MinimizeIcon className="size-3.5" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent>
          <ErrorBoundary>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              children
            )}
          </ErrorBoundary>
        </CardContent>
      )}
    </Card>
  );
}
