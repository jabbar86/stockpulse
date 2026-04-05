import type { HoldingWithMetrics, HistoricalDataPoint } from '@/types';

export interface RiskMetrics {
  /** Overall risk score 0 (low risk) to 100 (high risk) */
  score: number;
  /** Portfolio beta relative to Nifty 50 */
  beta: number;
  /** Annualized portfolio volatility (%) */
  volatility: number;
  /** Herfindahl-Hirschman Index for concentration (0-10000) */
  hhi: number;
  /** Number of sectors in portfolio */
  sectorCount: number;
  /** Risk breakdown by component */
  breakdown: {
    concentration: number;
    volatility: number;
    beta: number;
  };
}

/**
 * Calculate portfolio risk metrics.
 * @param holdings Current holdings with metrics
 * @param holdingHistory Map of symbol -> recent daily returns
 * @param benchmarkReturns Recent daily returns for Nifty 50 benchmark
 */
export function calculateRiskMetrics(
  holdings: HoldingWithMetrics[],
  holdingHistory?: Map<string, number[]>,
  benchmarkReturns?: number[]
): RiskMetrics {
  const totalValue = holdings.reduce((s, h) => s + h.current_value, 0);
  if (totalValue <= 0) {
    return { score: 0, beta: 1, volatility: 0, hhi: 0, sectorCount: 0, breakdown: { concentration: 0, volatility: 0, beta: 0 } };
  }

  // Concentration: Herfindahl-Hirschman Index
  const weights = holdings.map((h) => h.current_value / totalValue);
  const hhi = Math.round(weights.reduce((s, w) => s + (w * 100) ** 2, 0));

  // Sector diversification
  const sectors = new Set(holdings.map((h) => h.symbol.split('.')[0])); // simplified
  const sectorCount = sectors.size;

  // Volatility & Beta (if history available)
  let volatility = 15; // default moderate
  let beta = 1;

  if (holdingHistory && holdingHistory.size > 0 && benchmarkReturns && benchmarkReturns.length > 0) {
    // Portfolio daily returns (weighted)
    const minLen = Math.min(
      ...Array.from(holdingHistory.values()).map((r) => r.length),
      benchmarkReturns.length
    );

    if (minLen > 5) {
      const portfolioReturns: number[] = [];
      for (let i = 0; i < minLen; i++) {
        let dayReturn = 0;
        for (const h of holdings) {
          const w = h.current_value / totalValue;
          const returns = holdingHistory.get(h.symbol);
          if (returns && returns[i] !== undefined) {
            dayReturn += w * returns[i];
          }
        }
        portfolioReturns.push(dayReturn);
      }

      // Annualized volatility
      const mean = portfolioReturns.reduce((s, r) => s + r, 0) / portfolioReturns.length;
      const variance = portfolioReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (portfolioReturns.length - 1);
      volatility = Math.round(Math.sqrt(variance) * Math.sqrt(252) * 100 * 100) / 100;

      // Beta = Cov(portfolio, benchmark) / Var(benchmark)
      const bmMean = benchmarkReturns.reduce((s, r) => s + r, 0) / benchmarkReturns.length;
      let cov = 0;
      let bmVar = 0;
      for (let i = 0; i < minLen; i++) {
        cov += (portfolioReturns[i] - mean) * (benchmarkReturns[i] - bmMean);
        bmVar += (benchmarkReturns[i] - bmMean) ** 2;
      }
      if (bmVar > 0) {
        beta = Math.round((cov / bmVar) * 100) / 100;
      }
    }
  }

  // Score components (each 0-33)
  const concentrationScore = Math.min(33, Math.round(hhi / 300));
  const volatilityScore = Math.min(33, Math.round(volatility / 1.5));
  const betaScore = Math.min(34, Math.round(Math.abs(beta - 1) * 30 + (beta > 1.5 ? 10 : 0)));

  const score = Math.min(100, concentrationScore + volatilityScore + betaScore);

  return {
    score,
    beta,
    volatility,
    hhi,
    sectorCount,
    breakdown: {
      concentration: concentrationScore,
      volatility: volatilityScore,
      beta: betaScore,
    },
  };
}

/** Convert daily prices to daily returns (percentage) */
export function pricesToReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

/** Pearson correlation between two return series */
export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;

  const meanA = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanB = b.slice(0, n).reduce((s, v) => s + v, 0) / n;

  let cov = 0;
  let varA = 0;
  let varB = 0;

  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }

  const denom = Math.sqrt(varA * varB);
  if (denom === 0) return 0;
  return Math.round((cov / denom) * 100) / 100;
}
