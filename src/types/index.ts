// Stock types
export interface Stock {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE' | 'COMEX' | 'NYMEX';
  sector?: string;
  industry?: string;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  pe?: number;
  eps?: number;
  dividendYield?: number;
}

export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Portfolio types
export interface Holding {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE';
  quantity: number;
  avg_price: number;
  current_price?: number;
  source: 'manual' | 'upstox' | 'angelone' | 'fyers' | 'zerodha' | 'groww' | '5paisa' | 'dhan' | 'kotak' | 'icici' | 'hdfc' | 'motilal' | 'sharekhan' | 'paytm' | 'csv';
  created_at: string;
  updated_at: string;
}

export interface HoldingWithMetrics extends Holding {
  current_price: number;
  current_value: number;
  invested_value: number;
  pnl: number;
  pnl_percent: number;
  day_change: number;
  day_change_percent: number;
  allocation_percent?: number;
}

export interface PortfolioSummary {
  total_invested: number;
  current_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  day_change: number;
  day_change_percent: number;
  holdings_count: number;
  top_gainers: HoldingWithMetrics[];
  top_losers: HoldingWithMetrics[];
}

// Analysis types
export interface TechnicalIndicators {
  rsi: { value: number; signal: 'oversold' | 'neutral' | 'overbought' };
  macd: {
    macd: number;
    signal: number;
    histogram: number;
    trend: 'bullish' | 'bearish' | 'neutral';
  };
  sma: { sma20: number; sma50: number; sma200: number };
  ema: { ema12: number; ema26: number };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    position: 'above' | 'within' | 'below';
  };
  overallSignal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  score: number; // -100 to 100
}

export interface AIAnalysis {
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number; // 0-100
  summary: string;
  key_factors: string[];
  risks: string[];
  price_targets?: {
    support: number;
    resistance: number;
    target_6m?: number;
  };
  sector_outlook?: string;
}

export interface CombinedAnalysis {
  symbol: string;
  name: string;
  current_price: number;
  technical: TechnicalIndicators;
  ai?: AIAnalysis;
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number;
  analyzed_at: string;
}

// Broker types
export interface BrokerConnection {
  id: string;
  user_id: string;
  broker: 'upstox' | 'angelone' | 'fyers' | 'zerodha' | 'groww' | '5paisa' | 'dhan' | 'kotak' | 'icici' | 'hdfc' | 'motilal' | 'sharekhan' | 'paytm';
  status: 'connected' | 'disconnected' | 'expired';
  last_synced?: string;
  created_at: string;
}

export interface BrokerHolding {
  symbol: string;
  name: string;
  exchange: string;
  quantity: number;
  avg_price: number;
  last_price: number;
  pnl: number;
}

// Watchlist
export interface WatchlistItem {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE';
  added_at: string;
}
