'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  SCREENER_PRESETS,
  type ScreenerFilters,
} from '@/lib/screener/filters';

const ANY = 'any';

function presetActive(current: ScreenerFilters, preset: ScreenerFilters): boolean {
  return (Object.keys(preset) as (keyof ScreenerFilters)[]).every((k) => current[k] === preset[k]);
}

function togglePreset(current: ScreenerFilters, preset: ScreenerFilters): ScreenerFilters {
  const next = { ...current };
  if (presetActive(current, preset)) {
    for (const k of Object.keys(preset) as (keyof ScreenerFilters)[]) delete next[k];
    return next;
  }
  return { ...next, ...preset };
}

function numOrUndef(v: string): number | undefined {
  if (v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

type SelectFieldProps = {
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (v: string | undefined) => void;
};

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value ?? ANY} onValueChange={(v) => onChange(!v || v === ANY ? undefined : (v as string))}>
        <SelectTrigger className="w-full h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type NumberFieldProps = {
  label: string;
  value: number | undefined;
  placeholder?: string;
  onChange: (v: number | undefined) => void;
};

function NumberField({ label, value, placeholder, onChange }: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        type="number"
        inputMode="decimal"
        className="h-9 text-sm"
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(e) => onChange(numOrUndef(e.target.value))}
      />
    </div>
  );
}

type Props = {
  filters: ScreenerFilters;
  onChange: (f: ScreenerFilters) => void;
};

export function ScreenerFiltersPanel({ filters, onChange }: Props) {
  const set = <K extends keyof ScreenerFilters>(key: K, value: ScreenerFilters[K] | undefined) => {
    const next = { ...filters };
    if (value === undefined) delete next[key];
    else next[key] = value;
    onChange(next);
  };

  const activeCount = Object.keys(filters).length;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {SCREENER_PRESETS.map((p) => {
            const active = presetActive(filters, p.filters);
            return (
              <button
                key={p.id}
                type="button"
                title={p.description}
                aria-pressed={active}
                onClick={() => onChange(togglePreset(filters, p.filters))}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                )}
              >
                {p.label}
              </button>
            );
          })}
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange({})}>
              Clear all
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <NumberField label="RSI min" placeholder="0" value={filters.rsiMin} onChange={(v) => set('rsiMin', v)} />
          <NumberField label="RSI max" placeholder="100" value={filters.rsiMax} onChange={(v) => set('rsiMax', v)} />
          <SelectField
            label="Price vs 50 DMA"
            value={filters.sma50}
            options={[
              { value: 'above', label: 'Above' },
              { value: 'below', label: 'Below' },
            ]}
            onChange={(v) => set('sma50', v as ScreenerFilters['sma50'])}
          />
          <SelectField
            label="Price vs 200 DMA"
            value={filters.sma200}
            options={[
              { value: 'above', label: 'Above' },
              { value: 'below', label: 'Below' },
            ]}
            onChange={(v) => set('sma200', v as ScreenerFilters['sma200'])}
          />
          <SelectField
            label="50/200 DMA cross"
            value={filters.maCross}
            options={[
              { value: 'golden', label: 'Golden cross' },
              { value: 'death', label: 'Death cross' },
            ]}
            onChange={(v) => set('maCross', v as ScreenerFilters['maCross'])}
          />
          <SelectField
            label="MACD cross"
            value={filters.macdCross}
            options={[
              { value: 'bullish', label: 'Bullish' },
              { value: 'bearish', label: 'Bearish' },
            ]}
            onChange={(v) => set('macdCross', v as ScreenerFilters['macdCross'])}
          />
          <NumberField
            label="Within % of 52W high"
            placeholder="e.g. 5"
            value={filters.near52wHighPct}
            onChange={(v) => set('near52wHighPct', v)}
          />
          <NumberField
            label="Within % of 52W low"
            placeholder="e.g. 5"
            value={filters.near52wLowPct}
            onChange={(v) => set('near52wLowPct', v)}
          />
          <NumberField
            label="Volume ≥ × 20D avg"
            placeholder="e.g. 1.5"
            value={filters.minVolumeRatio}
            onChange={(v) => set('minVolumeRatio', v)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
