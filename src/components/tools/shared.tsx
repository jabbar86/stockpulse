'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function formatInr(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}

/** Parse a form value; empty or invalid → NaN so calculators can reject it. */
export function toNumber(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

type NumberFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  prefix?: string;
  step?: string;
  min?: number;
  hint?: string;
};

export function NumberField({ id, label, value, onChange, suffix, prefix, step = 'any', min = 0, hint }: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs sm:text-sm">
        {label}
      </Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn('tabular-nums', prefix && 'pl-7', suffix && 'pr-12')}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

type SegmentedProps<T extends string> = {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-muted p-[3px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-3 py-1 text-xs sm:text-sm font-medium transition-colors',
            value === o.value ? 'bg-background text-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type StatRowProps = {
  label: string;
  value: string;
  tone?: 'gain' | 'loss' | 'default';
  emphasis?: boolean;
};

export function StatRow({ label, value, tone = 'default', emphasis }: StatRowProps) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 py-1.5', emphasis && 'border-t pt-2.5 mt-1')}>
      <span className={cn('text-xs sm:text-sm text-muted-foreground', emphasis && 'text-foreground font-medium')}>
        {label}
      </span>
      <span
        className={cn(
          'tabular-nums text-sm',
          emphasis && 'text-base sm:text-lg font-semibold',
          tone === 'gain' && 'text-gain',
          tone === 'loss' && 'text-loss'
        )}
      >
        {value}
      </span>
    </div>
  );
}
