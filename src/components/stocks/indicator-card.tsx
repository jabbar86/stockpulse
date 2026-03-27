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
      return { label: signal, className: 'bg-gain/12 text-gain' };
    case 'bearish':
    case 'overbought':
    case 'above':
      return { label: signal, className: 'bg-loss/12 text-loss' };
    case 'neutral':
    case 'within':
    default:
      return { label: signal, className: 'bg-hold/12 text-hold' };
  }
}

export default function IndicatorCard({ title, value, signal, description }: IndicatorCardProps) {
  const config = getSignalConfig(signal);

  return (
    <Card size="sm" className="border-border shadow-none">
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
