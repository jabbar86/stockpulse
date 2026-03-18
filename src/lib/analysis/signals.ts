import { SMA, EMA, ATR, RSI, BollingerBands, VolumeProfile } from 'technicalindicators';
import type { HistoricalDataPoint, StrategySignal } from '@/types';

interface BuildSignalParams {
  symbol: string;
  name?: string;
  candles: HistoricalDataPoint[];
}

function last<T>(arr: T[]): T | undefined {
  return arr.length ? arr[arr.length - 1] : undefined;
}

function generateId(symbol: string, strategy: string, timestamp: number): string {
  return `${symbol}-${strategy}-${timestamp}`;
}

export function computeBreakoutSignal({
  symbol,
  name,
  candles,
}: BuildSignalParams): StrategySignal | null {
  if (candles.length < 40) return null;
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);

  const period = 20;
  const recent = candles.slice(-period - 1);
  if (recent.length < period + 1) return null;

  const prevHighs = recent.slice(0, -1).map((c) => c.high);
  const prevVolumes = recent.slice(0, -1).map((c) => c.volume);
  const lastCandle = last(recent)!;

  const prevHigh = Math.max(...prevHighs);
  const avgVolume =
    prevVolumes.reduce((sum, v) => sum + v, 0) / prevVolumes.length || 0;

  const isBreakout =
    lastCandle.close > prevHigh && lastCandle.volume >= avgVolume * 1.5;
  if (!isBreakout) return null;

  const atr = ATR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
  });
  const lastAtr = last(atr);
  if (!lastAtr || !isFinite(lastAtr)) return null;

  const entry = lastCandle.close;
  const stopLoss = entry - 1.5 * lastAtr;
  const target = entry + 3 * lastAtr;

  return {
    id: generateId(symbol, 'breakout', Date.now()),
    symbol,
    name,
    timeframe: 'swing',
    type: 'long_breakout',
    direction: 'buy',
    entry,
    stop_loss: stopLoss,
    target,
    confidence: 75,
    reason:
      'Price closed above recent range high with strong volume, indicating a potential momentum breakout.',
    strategy_name: '20-day breakout with volume',
    generated_at: new Date().toISOString(),
  };
}

export function computePullbackLongSignal({
  symbol,
  name,
  candles,
}: BuildSignalParams): StrategySignal | null {
  if (candles.length < 60) return null;
  const closes = candles.map((c) => c.close);

  const ema20 = EMA.calculate({ values: closes, period: 20 });
  const ema50 = EMA.calculate({ values: closes, period: 50 });
  const rsi = RSI.calculate({ values: closes, period: 14 });

  const lastClose = last(closes);
  const lastEma20 = last(ema20);
  const lastEma50 = last(ema50);
  const lastRsi = last(rsi);

  if (
    lastClose === undefined ||
    lastEma20 === undefined ||
    lastEma50 === undefined ||
    lastRsi === undefined
  ) {
    return null;
  }

  const inUptrend = lastClose > lastEma50;
  const nearEma20 = Math.abs(lastClose - lastEma20) / lastEma20 < 0.02;
  const rsiInZone = lastRsi >= 40 && lastRsi <= 55;

  if (!inUptrend || !nearEma20 || !rsiInZone) return null;

  const atr = ATR.calculate({
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    close: closes,
    period: 14,
  });
  const lastAtr = last(atr);
  if (!lastAtr || !isFinite(lastAtr)) return null;

  const entry = lastClose;
  const stopLoss = lastEma50 - 1.5 * lastAtr;
  const target = entry + 2 * (entry - stopLoss);

  return {
    id: generateId(symbol, 'pullback', Date.now()),
    symbol,
    name,
    timeframe: 'swing',
    type: 'pullback_long',
    direction: 'buy',
    entry,
    stop_loss: stopLoss,
    target,
    confidence: 70,
    reason:
      'Stock is in an uptrend and pulling back towards support with healthy RSI, suggesting a buy-the-dip opportunity.',
    strategy_name: 'Uptrend pullback to EMA20',
    generated_at: new Date().toISOString(),
  };
}

export function computeOverextendedExitSignal({
  symbol,
  name,
  candles,
}: BuildSignalParams): StrategySignal | null {
  if (candles.length < 40) return null;

  const closes = candles.map((c) => c.close);

  const bb = BollingerBands.calculate({
    period: 20,
    values: closes,
    stdDev: 2,
  });
  const rsi = RSI.calculate({ values: closes, period: 14 });

  const lastClose = last(closes);
  const lastBb = last(bb);
  const lastRsi = last(rsi);

  if (!lastClose || !lastBb || lastRsi === undefined) return null;

  const aboveUpperBand = lastClose > lastBb.upper;
  const rsiOverbought = lastRsi > 70;

  if (!aboveUpperBand || !rsiOverbought) return null;

  const target = lastBb.middle;
  const stopLoss = lastClose * 1.03;

  return {
    id: generateId(symbol, 'overextended', Date.now()),
    symbol,
    name,
    timeframe: 'swing',
    type: 'take_profit',
    direction: 'exit',
    entry: lastClose,
    stop_loss: stopLoss,
    target,
    confidence: 65,
    reason:
      'Price is extended above Bollinger upper band with overbought RSI, suggesting a good zone to book partial profits or tighten stops.',
    strategy_name: 'Overextended take-profit',
    generated_at: new Date().toISOString(),
  };
}

export function computeIntradayBreakoutSignal({
  symbol,
  name,
  candles,
}: BuildSignalParams): StrategySignal | null {
  // Expect 5m candles for last 1 trading day
  if (candles.length < 40) return null;

  const recentWindow = 20;
  const recent = candles.slice(-recentWindow - 1);
  if (recent.length < recentWindow + 1) return null;

  const lastCandle = last(recent)!;
  const prev = recent.slice(0, -1);
  const prevHigh = Math.max(...prev.map((c) => c.high));
  const avgVol = prev.reduce((sum, c) => sum + c.volume, 0) / prev.length || 0;

  // Intraday: tighter volume threshold and faster target
  const isBreakout =
    lastCandle.close > prevHigh && lastCandle.volume >= avgVol * 1.3;
  if (!isBreakout) return null;

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const closes = candles.map((c) => c.close);
  const atr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
  const lastAtr = last(atr);
  if (!lastAtr || !isFinite(lastAtr)) return null;

  const entry = lastCandle.close;
  const stopLoss = entry - 1.2 * lastAtr;
  const target = entry + 2.4 * lastAtr; // ~2R

  return {
    id: generateId(symbol, 'intraday_breakout', Date.now()),
    symbol,
    name,
    timeframe: 'intraday',
    type: 'intraday_breakout',
    direction: 'buy',
    entry,
    stop_loss: stopLoss,
    target,
    confidence: 68,
    reason:
      'Intraday breakout above recent 5m range with rising volume. Consider strict risk management and time-based exits.',
    strategy_name: '5m breakout (intraday)',
    generated_at: new Date().toISOString(),
  };
}

export function computePositionalTrendSignal({
  symbol,
  name,
  candles,
}: BuildSignalParams): StrategySignal | null {
  // Expect daily candles (1y)
  if (candles.length < 220) return null;
  const closes = candles.map((c) => c.close);
  const sma200 = SMA.calculate({ values: closes, period: 200 });
  const rsi = RSI.calculate({ values: closes, period: 14 });

  const lastClose = last(closes);
  const lastSma200 = last(sma200);
  const lastRsi = last(rsi);

  if (
    lastClose === undefined ||
    lastSma200 === undefined ||
    lastRsi === undefined
  ) {
    return null;
  }

  const uptrend = lastClose > lastSma200;
  const rsiHealthy = lastRsi >= 45 && lastRsi <= 65;
  if (!uptrend || !rsiHealthy) return null;

  // Use daily ATR for wider positional stops
  const atr = ATR.calculate({
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    close: closes,
    period: 14,
  });
  const lastAtr = last(atr);
  if (!lastAtr || !isFinite(lastAtr)) return null;

  const entry = lastClose;
  const stopLoss = entry - 2.5 * lastAtr;
  const target = entry + 5 * lastAtr;

  return {
    id: generateId(symbol, 'positional_trend', Date.now()),
    symbol,
    name,
    timeframe: 'positional',
    type: 'positional_trend',
    direction: 'buy',
    entry,
    stop_loss: stopLoss,
    target,
    confidence: 72,
    reason:
      'Price is above the 200-day trend baseline with healthy momentum. Suitable for positional holding with wider stop-loss.',
    strategy_name: 'Trend-follow (SMA200 + RSI)',
    generated_at: new Date().toISOString(),
  };
}

