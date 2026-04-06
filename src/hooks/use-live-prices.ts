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

/** Sentinel: fetch `/api/market/prices` with no `symbols` param (server default universe). */
const DEFAULT_SYMBOLS_KEY = '__default__';

export function useLivePrices({ symbols, enabled = true }: UseLivePricesOptions = {}) {
  const [prices, setPrices] = useState<Map<string, LivePrice>>(new Map());
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>({ isOpen: false });
  /** First successful (or failed) quote tick finished — use to avoid empty-index flash */
  const [quotesReady, setQuotesReady] = useState(false);
  const prevPricesRef = useRef<Map<string, number>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const symbolsKeyRef = useRef('');

  // Stable key: omitting `symbols` (e.g. Market Overview) must still poll so `marketStatus` updates.
  const symbolsKey =
    symbols !== undefined && symbols.length > 0 ? symbols.join(',') : DEFAULT_SYMBOLS_KEY;

  const doFetch = useCallback(async (syms: string) => {
    try {
      let url = '/api/market/prices';
      if (syms !== DEFAULT_SYMBOLS_KEY) {
        url += `?symbols=${encodeURIComponent(syms)}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch failed');

      const data = await res.json();

      setConnected(true);
      setMarketStatus(data.marketStatus || { isOpen: false });
      setLastUpdate(new Date(data.timestamp));

      if (Array.isArray(data.prices)) {
        setPrices((prev) => {
          const next = new Map(prev);
          for (const item of data.prices) {
            const prevPrice = prevPricesRef.current.get(item.symbol);
            const isLive = data.marketStatus?.isOpen;
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

      setQuotesReady(true);
      return data.marketStatus?.isOpen ?? false;
    } catch {
      setConnected(false);
      setQuotesReady(true);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setQuotesReady(false);
      return;
    }

    // Clear previous interval if symbols changed
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    symbolsKeyRef.current = symbolsKey;
    setQuotesReady(false);

    let cancelled = false;
    let isOpen = false;

    // Initial fetch
    doFetch(symbolsKey).then((result) => {
      if (cancelled) return;
      if (result !== null) isOpen = result;

      // Start polling
      const interval = isOpen ? POLL_INTERVAL_OPEN : POLL_INTERVAL_CLOSED;
      intervalRef.current = setInterval(async () => {
        if (cancelled) return;
        const newStatus = await doFetch(symbolsKeyRef.current);
        if (newStatus !== null && newStatus !== isOpen) {
          // Market status changed — adjust interval
          isOpen = newStatus;
          if (intervalRef.current) clearInterval(intervalRef.current);
          const newInterval = isOpen ? POLL_INTERVAL_OPEN : POLL_INTERVAL_CLOSED;
          intervalRef.current = setInterval(async () => {
            if (cancelled) return;
            const s = await doFetch(symbolsKeyRef.current);
            if (s !== null) isOpen = s;
          }, newInterval);
        }
      }, interval);
    });

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, symbolsKey, doFetch]);

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
    quotesReady,
  };
}
