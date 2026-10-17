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
  /** Purchase date (YYYY-MM-DD); null = unknown, fall back to created_at. */
  buy_date?: string | null;
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

export interface PortfolioHealthRiskTag {
  id: 'concentration' | 'sector_imbalance' | 'smallcap_risk' | 'quality_risk' | 'valuation_risk';
  label: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface PortfolioHealthSuggestion {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface PortfolioHealthResult {
  score: number; // 0-100
  risk_tags: PortfolioHealthRiskTag[];
  suggestions: PortfolioHealthSuggestion[];
  sector_breakdown: {
    sector: string;
    weight_percent: number;
  }[];
  concentration: {
    top_holding_weight: number;
    top3_weight: number;
  };
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
  /** Average True Range (14-period) — optional, populated when extended technicals are computed */
  atr?: number;
  /** Volume Weighted Average Price — optional, for intraday data */
  vwap?: number;
  /** Fibonacci retracement levels — optional */
  fibonacci?: {
    swingHigh: number;
    swingLow: number;
    levels: { ratio: number; label: string; price: number }[];
  };
}

export interface RiskMetrics {
  score: number;
  beta: number;
  volatility: number;
  hhi: number;
  sectorCount: number;
  breakdown: {
    concentration: number;
    volatility: number;
    beta: number;
  };
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

export type StrategyTimeframe = 'intraday' | 'swing' | 'positional';

export type StrategySignalType =
  | 'long_breakout'
  | 'intraday_breakout'
  | 'pullback_long'
  | 'positional_trend'
  | 'mean_reversion_long'
  | 'take_profit'
  | 'risk_exit';

export interface StrategySignal {
  id: string;
  symbol: string;
  name?: string;
  timeframe: StrategyTimeframe;
  type: StrategySignalType;
  direction: 'buy' | 'sell' | 'exit';
  entry: number;
  stop_loss: number;
  target: number;
  confidence: number; // 0-100
  reason: string;
  strategy_name: string;
  generated_at: string;
}

export interface StockRecommendation {
  symbol: string;
  name?: string;
  timeframe: StrategyTimeframe;
  action: 'buy' | 'sell' | 'hold' | 'exit';
  conviction: number; // 0-100
  entry: number;
  stop_loss: number;
  target: number;
  reason: string;
  source_signal?: StrategySignalType;
  generated_at: string;
}

/** Rule-engine output per holding (portfolio signals API). */
export interface PortfolioHoldingSignals {
  symbol: string;
  name: string;
  intraday: StockRecommendation | null;
  swing: StockRecommendation | null;
  long_term: StockRecommendation | null;
  common: StockRecommendation | null;
}

/** AI synthesis for a single timeframe (portfolio signals). */
export interface PortfolioSignalAIForecast {
  action: 'buy' | 'sell' | 'hold' | 'exit';
  conviction: number;
  rationale: string;
}

export interface PortfolioSignalAIHoldingRow {
  symbol: string;
  intraday: PortfolioSignalAIForecast | null;
  swing: PortfolioSignalAIForecast | null;
  long_term: PortfolioSignalAIForecast | null;
  common: PortfolioSignalAIForecast | null;
}

export interface PortfolioSignalsAIResult {
  portfolio_note: string;
  holdings: PortfolioSignalAIHoldingRow[];
  model?: string;
}

/** AI + rules — simulated algo intent (paper trading; not a live order). */
export interface AlgoTradeIntent {
  symbol: string;
  name: string;
  side: 'buy' | 'sell' | 'hold';
  quantity: number;
  reference_price: number;
  stop_loss?: number;
  take_profit?: number;
  timeframe: string;
  conviction: number;
  rationale: string;
  source: 'consensus' | 'rules' | 'ai';
}

// Mutual Funds (India)
export interface MutualFundSearchResult {
  schemeCode: number;
  schemeName: string;
}

export interface MutualFundNavPoint {
  date: string; // DD-MM-YYYY (mfapi)
  nav: number;
}

export interface MutualFundDetails {
  schemeCode: number;
  schemeName: string;
  nav: MutualFundNavPoint[];
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
