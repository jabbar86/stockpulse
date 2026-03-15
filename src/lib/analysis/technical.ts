import { RSI, MACD, SMA, EMA, BollingerBands } from 'technicalindicators';
import type { HistoricalDataPoint, TechnicalIndicators } from '@/types';

function last<T>(arr: T[]): T {
  return arr[arr.length - 1];
}

export function calculateTechnicalIndicators(
  historicalData: HistoricalDataPoint[]
): TechnicalIndicators {
  if (historicalData.length < 200) {
    // We need at least some data; 200 points is ideal for SMA200
    // but we handle gracefully if fewer
  }

  const closes = historicalData.map((d) => d.close);
  const highs = historicalData.map((d) => d.high);
  const lows = historicalData.map((d) => d.low);
  const currentPrice = last(closes);

  // RSI(14)
  const rsiValues = RSI.calculate({ values: closes, period: 14 });
  const rsiValue = rsiValues.length > 0 ? last(rsiValues) : 50;
  const rsiSignal: 'oversold' | 'neutral' | 'overbought' =
    rsiValue < 30 ? 'oversold' : rsiValue > 70 ? 'overbought' : 'neutral';

  // MACD(12, 26, 9)
  const macdValues = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const latestMacd = macdValues.length > 0 ? last(macdValues) : null;
  const macdLine = latestMacd?.MACD ?? 0;
  const macdSignalLine = latestMacd?.signal ?? 0;
  const macdHistogram = latestMacd?.histogram ?? 0;
  const macdTrend: 'bullish' | 'bearish' | 'neutral' =
    macdHistogram > 0 ? 'bullish' : macdHistogram < 0 ? 'bearish' : 'neutral';

  // SMA(20, 50, 200)
  const sma20Values = SMA.calculate({ values: closes, period: 20 });
  const sma50Values = SMA.calculate({ values: closes, period: 50 });
  const sma200Values = SMA.calculate({ values: closes, period: 200 });
  const sma20 = sma20Values.length > 0 ? last(sma20Values) : currentPrice;
  const sma50 = sma50Values.length > 0 ? last(sma50Values) : currentPrice;
  const sma200 = sma200Values.length > 0 ? last(sma200Values) : currentPrice;

  // EMA(12, 26)
  const ema12Values = EMA.calculate({ values: closes, period: 12 });
  const ema26Values = EMA.calculate({ values: closes, period: 26 });
  const ema12 = ema12Values.length > 0 ? last(ema12Values) : currentPrice;
  const ema26 = ema26Values.length > 0 ? last(ema26Values) : currentPrice;

  // Bollinger Bands(20, 2)
  const bbValues = BollingerBands.calculate({
    values: closes,
    period: 20,
    stdDev: 2,
  });
  const latestBB = bbValues.length > 0 ? last(bbValues) : null;
  const bbUpper = latestBB?.upper ?? currentPrice * 1.02;
  const bbMiddle = latestBB?.middle ?? currentPrice;
  const bbLower = latestBB?.lower ?? currentPrice * 0.98;
  const bbPosition: 'above' | 'within' | 'below' =
    currentPrice > bbUpper
      ? 'above'
      : currentPrice < bbLower
        ? 'below'
        : 'within';

  // Calculate overall signal score (-100 to 100)
  const score = calculateSignalScore({
    rsiValue,
    macdHistogram,
    macdLine,
    macdSignalLine,
    currentPrice,
    sma20,
    sma50,
    sma200,
    ema12,
    ema26,
    bbPosition,
  });

  const overallSignal = mapScoreToSignal(score);

  return {
    rsi: { value: Math.round(rsiValue * 100) / 100, signal: rsiSignal },
    macd: {
      macd: Math.round(macdLine * 100) / 100,
      signal: Math.round(macdSignalLine * 100) / 100,
      histogram: Math.round(macdHistogram * 100) / 100,
      trend: macdTrend,
    },
    sma: {
      sma20: Math.round(sma20 * 100) / 100,
      sma50: Math.round(sma50 * 100) / 100,
      sma200: Math.round(sma200 * 100) / 100,
    },
    ema: {
      ema12: Math.round(ema12 * 100) / 100,
      ema26: Math.round(ema26 * 100) / 100,
    },
    bollingerBands: {
      upper: Math.round(bbUpper * 100) / 100,
      middle: Math.round(bbMiddle * 100) / 100,
      lower: Math.round(bbLower * 100) / 100,
      position: bbPosition,
    },
    overallSignal,
    score,
  };
}

interface ScoreInputs {
  rsiValue: number;
  macdHistogram: number;
  macdLine: number;
  macdSignalLine: number;
  currentPrice: number;
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;
  bbPosition: 'above' | 'within' | 'below';
}

function calculateSignalScore(inputs: ScoreInputs): number {
  let score = 0;

  // RSI contribution (-25 to +25)
  if (inputs.rsiValue < 30) {
    score += 25; // Oversold = buy signal
  } else if (inputs.rsiValue < 40) {
    score += 15;
  } else if (inputs.rsiValue > 70) {
    score -= 25; // Overbought = sell signal
  } else if (inputs.rsiValue > 60) {
    score -= 10;
  }

  // MACD contribution (-20 to +20)
  if (inputs.macdHistogram > 0 && inputs.macdLine > inputs.macdSignalLine) {
    score += 20; // Bullish crossover
  } else if (inputs.macdHistogram > 0) {
    score += 10;
  } else if (
    inputs.macdHistogram < 0 &&
    inputs.macdLine < inputs.macdSignalLine
  ) {
    score -= 20; // Bearish crossover
  } else if (inputs.macdHistogram < 0) {
    score -= 10;
  }

  // SMA trend contribution (-25 to +25)
  if (
    inputs.currentPrice > inputs.sma20 &&
    inputs.currentPrice > inputs.sma50 &&
    inputs.currentPrice > inputs.sma200
  ) {
    score += 25; // Strong uptrend
  } else if (
    inputs.currentPrice > inputs.sma20 &&
    inputs.currentPrice > inputs.sma50
  ) {
    score += 15;
  } else if (inputs.currentPrice > inputs.sma20) {
    score += 5;
  } else if (
    inputs.currentPrice < inputs.sma20 &&
    inputs.currentPrice < inputs.sma50 &&
    inputs.currentPrice < inputs.sma200
  ) {
    score -= 25; // Strong downtrend
  } else if (
    inputs.currentPrice < inputs.sma20 &&
    inputs.currentPrice < inputs.sma50
  ) {
    score -= 15;
  } else if (inputs.currentPrice < inputs.sma20) {
    score -= 5;
  }

  // EMA crossover contribution (-15 to +15)
  if (inputs.ema12 > inputs.ema26) {
    score += 15; // Bullish EMA crossover
  } else if (inputs.ema12 < inputs.ema26) {
    score -= 15; // Bearish EMA crossover
  }

  // Bollinger Bands contribution (-15 to +15)
  if (inputs.bbPosition === 'below') {
    score += 15; // Price below lower band = potential buy
  } else if (inputs.bbPosition === 'above') {
    score -= 15; // Price above upper band = potential sell
  }

  // Clamp to -100..100
  return Math.max(-100, Math.min(100, score));
}

function mapScoreToSignal(
  score: number
): 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell' {
  if (score >= 50) return 'strong_buy';
  if (score >= 20) return 'buy';
  if (score > -20) return 'neutral';
  if (score > -50) return 'sell';
  return 'strong_sell';
}
