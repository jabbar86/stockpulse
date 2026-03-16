'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  NewspaperIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  SearchIcon,
  ChevronDownIcon,
  TrendingUpIcon,
  LandmarkIcon,
  BarChart3Icon,
  BitcoinIcon,
  WalletIcon,
  LayersIcon,
  GlobeIcon,
  ClockIcon,
} from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  source: string;
  category: string;
  image_url: string | null;
  published_at: string;
}

const CATEGORIES = [
  { value: '', label: 'All News', icon: NewspaperIcon },
  { value: 'markets', label: 'Markets', icon: BarChart3Icon },
  { value: 'stocks', label: 'Stocks', icon: TrendingUpIcon },
  { value: 'economy', label: 'Economy', icon: LandmarkIcon },
  { value: 'ipo', label: 'IPO', icon: LayersIcon },
  { value: 'mutual-funds', label: 'Mutual Funds', icon: WalletIcon },
  { value: 'crypto', label: 'Crypto', icon: BitcoinIcon },
  { value: 'general', label: 'General', icon: GlobeIcon },
];

const CATEGORY_COLORS: Record<string, string> = {
  markets: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  stocks: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  economy: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  ipo: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  'mutual-funds': 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  crypto: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  general: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const AUTO_REFRESH_MS = 30 * 60 * 1000; // 30 minutes

function isMarketOpen(): boolean {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  const day = ist.getUTCDay();
  if (day === 0 || day === 6) return false;
  const totalMinutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  // Refresh from 9:00 AM to 4:00 PM IST (slightly wider than trading hours for post-market news)
  return totalMinutes >= 540 && totalMinutes <= 960;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const LIMIT = 30;

  const fetchNews = useCallback(async (cat: string, off: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
      if (cat) params.set('category', cat);
      const res = await fetch(`/api/news?${params}`);
      const data = await res.json();
      if (append) {
        setNews(prev => [...prev, ...(data.news || [])]);
      } else {
        setNews(data.news || []);
      }
      setTotal(data.total || 0);
      if (data.lastScrapedAt) setLastRefresh(new Date(data.lastScrapedAt));
      else setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch news:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setOffset(0);
    fetchNews(category, 0, false);
  }, [category, fetchNews]);

  // Auto-refresh during market hours every 30 minutes
  useEffect(() => {
    function startAutoRefresh() {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = setInterval(() => {
        if (isMarketOpen()) {
          fetchNews(category, 0, false);
        }
      }, AUTO_REFRESH_MS);
    }

    startAutoRefresh();
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [category, fetchNews]);

  function handleLoadMore() {
    const newOffset = offset + LIMIT;
    setOffset(newOffset);
    fetchNews(category, newOffset, true);
  }

  const filteredNews = search
    ? news.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        (n.summary && n.summary.toLowerCase().includes(search.toLowerCase()))
      )
    : news;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <NewspaperIcon className="size-7 text-primary" />
            Market News
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Latest Indian stock market headlines
            {isMarketOpen() && (
              <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                · Auto-refreshes every 30 min
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setOffset(0); fetchNews(category, 0, false); }}
          disabled={loading}
          className="self-start sm:self-auto"
        >
          <RefreshCwIcon className={`size-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search & Category Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search news..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition-colors"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                category === cat.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <cat.icon className="size-3.5" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* News List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredNews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <NewspaperIcon className="size-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">No news found</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {search ? 'Try a different search term' : 'News will appear here once the scraper runs'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredNews.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <Card className="h-full overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-200">
                  {item.image_url && (
                    <div className="relative h-40 bg-muted overflow-hidden">
                      <img
                        src={item.image_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <CardContent className={`p-4 space-y-3 ${!item.image_url ? 'pt-5' : ''}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className={`text-[10px] px-2 py-0 ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general}`}>
                        {item.category}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <ClockIcon className="size-2.5" />
                        {timeAgo(item.published_at)}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>

                    {item.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-muted-foreground/70 capitalize">
                        {item.source.replace('-', ' ')}
                      </span>
                      <ExternalLinkIcon className="size-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>

          {/* Load More */}
          {news.length < total && !search && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-xl"
              >
                {loadingMore ? (
                  <RefreshCwIcon className="size-4 mr-2 animate-spin" />
                ) : (
                  <ChevronDownIcon className="size-4 mr-2" />
                )}
                Load more news
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
