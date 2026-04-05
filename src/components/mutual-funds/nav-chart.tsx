'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { MutualFundNavPoint } from '@/types';

function resolveColor(cssVar: string, alpha?: number) {
  const el = document.createElement('div');
  el.style.color = `var(${cssVar})`;
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color;
  document.body.removeChild(el);
  const match = computed.match(/[\d.]+/g);
  if (!match) return alpha !== undefined ? 'rgba(128,128,128,0.3)' : '#888888';
  const [r, g, b] = match.map((v) => Math.round(Number(v)));
  if (alpha !== undefined) return `rgba(${r},${g},${b},${alpha})`;
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function parseMfDate(ddmmyyyy: string): Date | null {
  const [dd, mm, yyyy] = ddmmyyyy.split('-').map((x) => Number(x));
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  return Number.isNaN(d.getTime()) ? null : d;
}

interface NavChartProps {
  data: MutualFundNavPoint[];
  schemeName?: string;
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export default function NavChart({ data, schemeName }: NavChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import('lightweight-charts').createChart> | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [range, setRange] = useState<TimeRange>('3M');
  const [tooltip, setTooltip] = useState<{ date: string; nav: number } | null>(null);

  // Build lookup for tooltip
  const dataMap = useRef(new Map<string, MutualFundNavPoint>());

  // Filter data by time range, reverse so oldest is first (mfapi returns latest first)
  const filteredData = (() => {
    const sorted = [...data].reverse(); // oldest first
    if (range === 'ALL') return sorted;
    const now = new Date();
    const months: Record<TimeRange, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, ALL: 0 };
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months[range], now.getDate());
    return sorted.filter((p) => {
      const d = parseMfDate(p.date);
      return d && d >= cutoff;
    });
  })();

  const handleCrosshairMove = useCallback((param: { time?: unknown }) => {
    if (!param?.time) {
      setTooltip(null);
      return;
    }
    const key = param.time as string;
    const d = dataMap.current.get(key);
    if (!d) {
      setTooltip(null);
      return;
    }
    setTooltip({ date: d.date, nav: d.nav });
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current || filteredData.length === 0) return;

    let isMounted = true;

    async function initChart() {
      const {
        createChart,
        AreaSeries,
        ColorType,
        CrosshairMode,
      } = await import('lightweight-charts');

      if (!isMounted || !chartContainerRef.current) return;

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const container = chartContainerRef.current;
      const textColor = resolveColor('--foreground');
      const borderColor = resolveColor('--border', 0.5);
      const gridColor = resolveColor('--border', 0.2);
      const primaryColor = resolveColor('--primary');

      const chart = createChart(container, {
        width: container.clientWidth,
        height: 340,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        },
        grid: {
          vertLines: { color: gridColor },
          horzLines: { color: gridColor },
        },
        crosshair: {
          mode: CrosshairMode.Magnet,
          vertLine: { labelBackgroundColor: primaryColor },
          horzLine: { labelBackgroundColor: primaryColor },
        },
        rightPriceScale: { borderColor },
        timeScale: { borderColor, fixLeftEdge: true, fixRightEdge: true },
      });

      chartRef.current = chart;
      chart.subscribeCrosshairMove(handleCrosshairMove);

      // Build data map
      const map = new Map<string, MutualFundNavPoint>();
      const chartData = filteredData.map((p) => {
        const d = parseMfDate(p.date);
        const dateStr = d
          ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
          : p.date;
        map.set(dateStr, p);
        return { time: dateStr as import('lightweight-charts').Time, value: p.nav };
      });
      dataMap.current = map;

      // Determine color based on gain/loss
      const firstNav = filteredData[0]?.nav ?? 0;
      const lastNav = filteredData[filteredData.length - 1]?.nav ?? 0;
      const isGain = lastNav >= firstNav;
      const lineColor = isGain ? resolveColor('--gain') : resolveColor('--loss');
      const topColor = isGain ? resolveColor('--gain', 0.25) : resolveColor('--loss', 0.25);
      const bottomColor = isGain ? resolveColor('--gain', 0.02) : resolveColor('--loss', 0.02);

      const series = chart.addSeries(AreaSeries, {
        lineColor,
        lineWidth: 2,
        topColor,
        bottomColor,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 5,
        crosshairMarkerBorderColor: lineColor,
        crosshairMarkerBackgroundColor: '#ffffff',
      });

      series.setData(chartData);
      chart.timeScale().fitContent();
      setIsLoaded(true);

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      return () => resizeObserver.disconnect();
    }

    initChart();

    return () => {
      isMounted = false;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [filteredData, handleCrosshairMove]);

  const ranges: TimeRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

  // Compute overall change for display
  const firstNav = filteredData[0]?.nav ?? 0;
  const lastNav = filteredData[filteredData.length - 1]?.nav ?? 0;
  const change = firstNav > 0 ? ((lastNav - firstNav) / firstNav) * 100 : 0;
  const isGain = change >= 0;

  return (
    <div className="relative w-full">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-1">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                range === r
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs">
          {tooltip ? (
            <>
              <span className="text-muted-foreground">{tooltip.date}</span>
              <span className="font-semibold tabular-nums">{tooltip.nav.toFixed(4)}</span>
            </>
          ) : filteredData.length > 0 ? (
            <>
              <span className="font-semibold tabular-nums">{lastNav.toFixed(4)}</span>
              <span className={`font-semibold ${isGain ? 'text-gain' : 'text-loss'}`}>
                {isGain ? '+' : ''}{change.toFixed(2)}%
              </span>
            </>
          ) : null}
        </div>
      </div>

      {!isLoaded && data.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg z-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}
      <div ref={chartContainerRef} className="w-full" style={{ minHeight: 340 }} />
    </div>
  );
}
