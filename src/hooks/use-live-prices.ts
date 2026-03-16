'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface LivePrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: number;
  // UI helpers
  prevPrice?: number;
  direction?: 'up' | 'down' | 'unchanged';
}

interface MarketStatus {
  isOpen: boolean;
  isWeekend?: boolean;
  isHoliday?: boolean;
  message?: string;
  cachedAt?: number;
}

interface UseLivePricesOptions {
  symbols?: string[];
  enabled?: boolean;
}

export function useLivePrices({ symbols, enabled = true }: UseLivePricesOptions = {}) {
  const [prices, setPrices] = useState<Map<string, LivePrice>>(new Map());
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>({ isOpen: true });
  const eventSourceRef = useRef<EventSource | null>(null);
  const prevPricesRef = useRef<Map<string, number>>(new Map());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    // Close existing connection
    eventSourceRef.current?.close();
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    let url = '/api/market/stream';
    if (symbols && symbols.length > 0) {
      url += `?symbols=${symbols.join(',')}`;
    }

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);

        // Handle market status messages
        if (parsed.type === 'market_status') {
          setMarketStatus({
            isOpen: parsed.isOpen,
            isWeekend: parsed.isWeekend,
            isHoliday: parsed.isHoliday,
            message: parsed.message,
            cachedAt: parsed.cachedAt,
          });
        }

        // Handle price updates (both live and cached)
        if (parsed.type === 'prices' && Array.isArray(parsed.data)) {
          setPrices((prev) => {
            const next = new Map(prev);
            for (const item of parsed.data) {
              const prevPrice = prevPricesRef.current.get(item.symbol);

              // Only show direction flash for live data, not cached
              const isLive = parsed.source === 'live';
              const direction =
                !isLive || prevPrice === undefined || prevPrice === item.price
                  ? 'unchanged'
                  : item.price > prevPrice
                  ? 'up'
                  : 'down';

              next.set(item.symbol, {
                ...item,
                prevPrice,
                direction,
              });
              prevPricesRef.current.set(item.symbol, item.price);
            }
            return next;
          });
          setLastUpdate(
            parsed.cachedAt ? new Date(parsed.cachedAt) : new Date()
          );
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      eventSourceRef.current = null;

      // After hours: don't reconnect aggressively — check every 5 minutes
      // During hours: reconnect in 5s
      const retryMs = marketStatus.isOpen ? 5000 : 5 * 60 * 1000;
      reconnectTimerRef.current = setTimeout(connect, retryMs);
    };
  }, [enabled, symbols, marketStatus.isOpen]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connect]);

  // Schedule reconnect at market open if currently closed
  useEffect(() => {
    if (!enabled || marketStatus.isOpen) return;

    // Calculate ms until next market open (9:15 AM IST)
    function msUntilMarketOpen(): number {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);

      // Find next weekday
      let target = new Date(ist);
      target.setHours(9, 15, 0, 0);

      // If today's market open already passed, move to tomorrow
      if (target <= ist) {
        target.setDate(target.getDate() + 1);
      }

      // Skip weekends
      while (target.getDay() === 0 || target.getDay() === 6) {
        target.setDate(target.getDate() + 1);
      }

      // Convert back to local time
      const targetLocal = new Date(target.getTime() - istOffset - now.getTimezoneOffset() * 60 * 1000);
      const ms = targetLocal.getTime() - now.getTime();

      // Cap at 24 hours to avoid overflow issues
      return Math.min(ms, 24 * 60 * 60 * 1000);
    }

    const ms = msUntilMarketOpen();
    const timer = setTimeout(() => {
      // Market should be opening — reconnect to get live stream
      connect();
    }, ms);

    return () => clearTimeout(timer);
  }, [enabled, marketStatus.isOpen, connect]);

  const getPrice = useCallback(
    (symbol: string): LivePrice | undefined => {
      return prices.get(symbol.toUpperCase().replace('.NS', '').replace('.BO', ''));
    },
    [prices]
  );

  return {
    prices,
    connected,
    lastUpdate,
    getPrice,
    marketStatus,
  };
}
