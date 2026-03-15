'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface IndicatorCardProps {
  title: string;
  value: string | number;
  signal: 'bullish' | 'bearish' | 'neutral' | 'oversold' | 'overbought' | 'above' | 'within' | 'below';
  description?: string;
}

function getSignalConfig(signal: IndicatorCardProps['signal']) {
  switch (signal) {
    case 'bullish':
    case 'oversold':
    case 'below':
      return { label: signal, className: 'bg-green-500/10 text-green-600 dark:text-green-400' };
    case 'bearish':
    case 'overbought':
    case 'above':
      return { label: signal, className: 'bg-red-500/10 text-red-600 dark:text-red-400' };
    case 'neutral':
    case 'within':
    default:
      return { label: signal, className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' };
  }
}

export default function IndicatorCard({ title, value, signal, description }: IndicatorCardProps) {
  const config = getSignalConfig(signal);

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Badge className={config.className}>
            {config.label.charAt(0).toUpperCase() + config.label.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{typeof value === 'number' ? value.toFixed(2) : value}</p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
