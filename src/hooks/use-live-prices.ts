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
}

interface UseLivePricesOptions {
  symbols?: string[];
  enabled?: boolean;
}

const POLL_INTERVAL_OPEN = 10_000;   // 10s during market hours
const POLL_INTERVAL_CLOSED = 300_000; // 5 min after hours

export function useLivePrices({ symbols, enabled = true }: UseLivePricesOptions = {}) {
  const [prices, setPrices] = useState<Map<string, LivePrice>>(new Map());
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>({ isOpen: true });
  const prevPricesRef = useRef<Map<string, number>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const initialFetchDone = useRef(false);

  const fetchPrices = useCallback(async () => {
    if (!enabled || fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      let url = '/api/market/prices';
      if (symbols && symbols.length > 0) {
        url += `?symbols=${symbols.join(',')}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch failed');

      const data = await res.json();
      if (!mountedRef.current) return;

      setConnected(true);
      setMarketStatus(data.marketStatus);
      setLastUpdate(new Date(data.timestamp));

      if (Array.isArray(data.prices)) {
        setPrices((prev) => {
          const next = new Map(prev);
          for (const item of data.prices) {
            const prevPrice = prevPricesRef.current.get(item.symbol);
            const isLive = data.marketStatus.isOpen;
            const direction: 'up' | 'down' | 'unchanged' =
              !isLive || prevPrice === undefined || prevPrice === item.price
                ? 'unchanged'
                : item.price > prevPrice
                ? 'up'
                : 'down';

            next.set(item.symbol, { ...item, prevPrice, direction });
            prevPricesRef.current.set(item.symbol, item.price);
          }
          return next;
        });
      }
    } catch {
      if (mountedRef.current) setConnected(false);
    } finally {
      fetchingRef.current = false;
    }
  }, [enabled, symbols]);

  // Poll loop
  useEffect(() => {
    mountedRef.current = true;
    initialFetchDone.current = false;

    function schedule() {
      if (!mountedRef.current || !enabled) return;
      const interval = marketStatus.isOpen ? POLL_INTERVAL_OPEN : POLL_INTERVAL_CLOSED;
      timerRef.current = setTimeout(async () => {
        await fetchPrices();
        schedule();
      }, interval);
    }

    // Initial fetch
    fetchPrices().then(() => {
      if (!initialFetchDone.current) {
        initialFetchDone.current = true;
        schedule();
      }
    });

    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [fetchPrices, enabled, marketStatus.isOpen]);

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
