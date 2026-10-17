'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { GrowthYearRow } from '@/lib/calculators/sip';
import { formatInr } from './shared';

function compactInr(value: number): string {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)}Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)}L`;
  if (value >= 1e3) return `₹${(value / 1e3).toFixed(0)}K`;
  return `₹${Math.round(value)}`;
}

export default function GrowthChart({ data }: { data: GrowthYearRow[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-xs sm:text-sm text-muted-foreground">
        Enter a duration of at least 1 year.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="year"
          tickFormatter={(y: number) => `Y${y}`}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={compactInr}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          formatter={(value, name) => [formatInr(Number(value)), name === 'value' ? 'Value' : 'Invested']}
          labelFormatter={(y) => `Year ${y}`}
          contentStyle={{
            backgroundColor: 'var(--popover)',
            color: 'var(--popover-foreground)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '13px',
          }}
        />
        <Area type="monotone" dataKey="value" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.18} strokeWidth={2} />
        <Area type="monotone" dataKey="invested" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.12} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
