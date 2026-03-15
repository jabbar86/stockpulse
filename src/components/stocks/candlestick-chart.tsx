'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { HistoricalDataPoint } from '@/types';

type ChartType = 'candlestick' | 'line' | 'bar';

interface StockChartProps {
  data: HistoricalDataPoint[];
}

function resolveColor(cssVar: string, alpha?: number) {
  const el = document.createElement('div');
  el.style.color = `var(${cssVar})`;
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color;
  document.body.removeChild(el);
  const match = computed.match(/[\d.]+/g);
  if (!match) return alpha !== undefined ? 'rgba(128,128,128,0.3)' : '#888888';
  const [r, g, b] = match.map(Number);
  if (alpha !== undefined) return `rgba(${r},${g},${b},${alpha})`;
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function formatVol(v: number): string {
  if (v >= 10000000) return `${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `${(v / 100000).toFixed(2)} L`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)} K`;
  return v.toString();
}

function formatPrice(v: number): string {
  return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface TooltipData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
}

export default function CandlestickChart({ data }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import('lightweight-charts').createChart> | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Build a date->data lookup
  const dataMap = useRef(new Map<string, HistoricalDataPoint>());
  useEffect(() => {
    const map = new Map<string, HistoricalDataPoint>();
    data.forEach((d) => map.set(d.date, d));
    dataMap.current = map;
  }, [data]);

  const handleCrosshairMove = useCallback((param: any) => {
    if (!param?.time) {
      setTooltip(null);
      return;
    }
    const dateStr = param.time as string;
    const d = dataMap.current.get(dateStr);
    if (!d) {
      setTooltip(null);
      return;
    }
    const change = d.close - d.open;
    const changePercent = d.open !== 0 ? (change / d.open) * 100 : 0;
    setTooltip({
      date: dateStr,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
      change,
      changePercent,
    });
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    let isMounted = true;

    async function initChart() {
      const {
        createChart,
        CandlestickSeries,
        BarSeries,
        LineSeries,
        HistogramSeries,
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
      const gridColor = resolveColor('--border', 0.3);

      const chart = createChart(container, {
        width: container.clientWidth,
        height: 400,
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
          mode: CrosshairMode.Normal,
          vertLine: {
            labelBackgroundColor: '#3b82f6',
          },
          horzLine: {
            labelBackgroundColor: '#3b82f6',
          },
        },
        rightPriceScale: { borderColor },
        timeScale: { borderColor, timeVisible: false },
      });

      chartRef.current = chart;

      // Subscribe to crosshair move for tooltip
      chart.subscribeCrosshairMove(handleCrosshairMove);

      if (chartType === 'candlestick') {
        const series = chart.addSeries(CandlestickSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderDownColor: '#ef4444',
          borderUpColor: '#22c55e',
          wickDownColor: '#ef4444',
          wickUpColor: '#22c55e',
        });
        series.setData(
          data.map((d) => ({
            time: d.date as unknown as import('lightweight-charts').Time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }))
        );
      } else if (chartType === 'line') {
        const series = chart.addSeries(LineSeries, {
          color: '#3b82f6',
          lineWidth: 2,
        });
        series.setData(
          data.map((d) => ({
            time: d.date as unknown as import('lightweight-charts').Time,
            value: d.close,
          }))
        );
      } else if (chartType === 'bar') {
        const series = chart.addSeries(BarSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
        });
        series.setData(
          data.map((d) => ({
            time: d.date as unknown as import('lightweight-charts').Time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }))
        );
      }

      // Buy volume (close >= open) and Sell volume (close < open) as separate series
      const buyVolSeries = chart.addSeries(HistogramSeries, {
        color: 'rgba(34,197,94,0.5)',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      const sellVolSeries = chart.addSeries(HistogramSeries, {
        color: 'rgba(239,68,68,0.5)',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.75, bottom: 0 },
      });

      buyVolSeries.setData(
        data.map((d) => ({
          time: d.date as unknown as import('lightweight-charts').Time,
          value: d.close >= d.open ? d.volume : 0,
          color: 'rgba(34,197,94,0.5)',
        }))
      );

      sellVolSeries.setData(
        data.map((d) => ({
          time: d.date as unknown as import('lightweight-charts').Time,
          value: d.close < d.open ? d.volume : 0,
          color: 'rgba(239,68,68,0.5)',
        }))
      );

      chart.timeScale().fitContent();
      setIsLoaded(true);

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    }

    initChart();

    return () => {
      isMounted = false;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, chartType, handleCrosshairMove]);

  const types: { value: ChartType; label: string }[] = [
    { value: 'candlestick', label: 'Candles' },
    { value: 'line', label: 'Line' },
    { value: 'bar', label: 'OHLC' },
  ];

  // Last data point for default display
  const lastPoint = data.length > 0 ? data[data.length - 1] : null;
  const display = tooltip || (lastPoint ? {
    date: lastPoint.date,
    open: lastPoint.open,
    high: lastPoint.high,
    low: lastPoint.low,
    close: lastPoint.close,
    volume: lastPoint.volume,
    change: lastPoint.close - lastPoint.open,
    changePercent: lastPoint.open !== 0 ? ((lastPoint.close - lastPoint.open) / lastPoint.open) * 100 : 0,
  } : null);

  const isUp = display ? display.close >= display.open : true;

  return (
    <div className="relative w-full">
      {/* Header: chart type toggle + tooltip info */}
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-1">
          {types.map((t) => (
            <button
              key={t.value}
              onClick={() => setChartType(t.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                chartType === t.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Price tooltip */}
        {display && (
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="text-muted-foreground">
              {new Date(display.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span>O <span className="font-medium">{formatPrice(display.open)}</span></span>
            <span>H <span className="font-medium text-green-600 dark:text-green-400">{formatPrice(display.high)}</span></span>
            <span>L <span className="font-medium text-red-600 dark:text-red-400">{formatPrice(display.low)}</span></span>
            <span>C <span className="font-medium">{formatPrice(display.close)}</span></span>
            <span className={`font-semibold ${isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isUp ? '+' : ''}{display.change.toFixed(2)} ({isUp ? '+' : ''}{display.changePercent.toFixed(2)}%)
            </span>
            <span className="text-muted-foreground">
              Vol: <span className={`font-medium ${isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatVol(display.volume)}
              </span>
              {isUp ? ' Buy' : ' Sell'}
            </span>
          </div>
        )}
      </div>

      {!isLoaded && data.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}
      <div ref={chartContainerRef} className="w-full" style={{ minHeight: 400 }} />
    </div>
  );
}
