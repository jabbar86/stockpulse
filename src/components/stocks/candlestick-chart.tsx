'use client';

import { useEffect, useRef, useState } from 'react';
import type { HistoricalDataPoint } from '@/types';

interface CandlestickChartProps {
  data: HistoricalDataPoint[];
}

export default function CandlestickChart({ data }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import('lightweight-charts').createChart> | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    let isMounted = true;

    async function initChart() {
      const { createChart, CandlestickSeries, HistogramSeries, ColorType } = await import(
        'lightweight-charts'
      );

      if (!isMounted || !chartContainerRef.current) return;

      // Clear any previous chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const container = chartContainerRef.current;

      const chart = createChart(container, {
        width: container.clientWidth,
        height: 400,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'hsl(var(--foreground))',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        },
        grid: {
          vertLines: { color: 'hsl(var(--border) / 0.3)' },
          horzLines: { color: 'hsl(var(--border) / 0.3)' },
        },
        crosshair: {
          mode: 0,
        },
        rightPriceScale: {
          borderColor: 'hsl(var(--border) / 0.5)',
        },
        timeScale: {
          borderColor: 'hsl(var(--border) / 0.5)',
          timeVisible: false,
        },
      });

      chartRef.current = chart;

      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        wickUpColor: '#22c55e',
      });

      const candlestickData = data.map((d) => ({
        time: d.date as unknown as import('lightweight-charts').Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      candlestickSeries.setData(candlestickData);

      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      const volumeData = data.map((d) => ({
        time: d.date as unknown as import('lightweight-charts').Time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
      }));

      volumeSeries.setData(volumeData);

      chart.timeScale().fitContent();
      setIsLoaded(true);

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
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
  }, [data]);

  return (
    <div className="relative w-full">
      {!isLoaded && data.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}
      <div ref={chartContainerRef} className="w-full" style={{ minHeight: 400 }} />
    </div>
  );
}
