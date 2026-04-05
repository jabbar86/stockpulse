'use client';

import { useEffect, useState } from 'react';
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function TickerItemView({ item }: { item: TickerItem }) {
  const isPositive = item.change >= 0;
  return (
    <div className="flex items-center gap-2.5 px-4 sm:px-6 whitespace-nowrap py-1">
      <span className="text-xs sm:text-base font-semibold">{item.symbol}</span>
      <span className="text-xs sm:text-base tabular-nums">{formatPrice(item.price)}</span>
      <span
        className={`flex items-center gap-0.5 text-[11px] font-medium tabular-nums sm:text-sm ${
          isPositive ? 'text-gain' : 'text-loss'
        }`}
      >
        {isPositive ? (
          <TrendingUpIcon className="size-3 sm:size-3.5" />
        ) : (
          <TrendingDownIcon className="size-3 sm:size-3.5" />
        )}
        {isPositive ? '+' : ''}
        {item.changePercent.toFixed(2)}%
      </span>
    </div>
  );
}

export default function TickerTape() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    async function fetchTicker() {
      try {
        const res = await fetch('/api/market/overview');
        if (!res.ok) return;
        const data = await res.json();
        const tickers: TickerItem[] = [];

        // Add indices
        for (const item of data.indices || []) {
          tickers.push({
            symbol: item.name,
            name: item.name,
            price: item.price,
            change: item.change,
            changePercent: item.changePercent,
          });
        }

        // Add gold/silver
        for (const item of data.goldSilver || []) {
          tickers.push({
            symbol: item.name,
            name: item.name,
            price: item.price,
            change: item.change,
            changePercent: item.changePercent,
          });
        }

        // Add top movers
        for (const item of [...(data.topGainers || []).slice(0, 3), ...(data.topLosers || []).slice(0, 3)]) {
          tickers.push({
            symbol: item.symbol.replace('.NS', '').replace('.BO', ''),
            name: item.name,
            price: item.price,
            change: item.change,
            changePercent: item.changePercent,
          });
        }

        setItems(tickers);
      } catch {
        // silent fail
      }
    }

    fetchTicker();
    const interval = setInterval(fetchTicker, 60000);
    return () => clearInterval(interval);
  }, []);

  if (items.length === 0) return null;

  // Double the items for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="w-full overflow-hidden border-b border-border bg-card/90 py-1.5 backdrop-blur-md">
      <div className="flex animate-ticker hover:[animation-play-state:paused]">
        {doubled.map((item, i) => (
          <div key={`${item.symbol}-${i}`} className="flex items-center">
            <TickerItemView item={item} />
            <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
          </div>
        ))}
      </div>
    </div>
  );
}
