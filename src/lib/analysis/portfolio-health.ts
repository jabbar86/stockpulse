import type {
  HoldingWithMetrics,
  PortfolioHealthResult,
  PortfolioHealthRiskTag,
  PortfolioHealthSuggestion,
} from '@/types';

type SectorMeta = {
  sector: string;
  weightPercent: number;
};

interface ComputeOptions {
  benchmarkSectors?: SectorMeta[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeSectorBreakdown(holdings: HoldingWithMetrics[]): SectorMeta[] {
  const total = holdings.reduce((sum, h) => sum + h.current_value, 0);
  if (total <= 0) return [];

  const bySector = new Map<string, number>();
  for (const h of holdings) {
    const sector = (h as any).sector || 'Unknown';
    bySector.set(sector, (bySector.get(sector) ?? 0) + h.current_value);
  }

  return Array.from(bySector.entries())
    .map(([sector, value]) => ({
      sector,
      weightPercent: (value / total) * 100,
    }))
    .sort((a, b) => b.weightPercent - a.weightPercent);
}

function buildRiskTags(
  holdings: HoldingWithMetrics[],
  sectors: SectorMeta[],
  options?: ComputeOptions
): PortfolioHealthRiskTag[] {
  const tags: PortfolioHealthRiskTag[] = [];

  const total = holdings.reduce((sum, h) => sum + h.current_value, 0);
  if (total <= 0) return tags;

  const sortedByWeight = [...holdings].sort(
    (a, b) => b.current_value - a.current_value
  );
  const top1 = sortedByWeight[0];
  const top1Weight = top1 ? (top1.current_value / total) * 100 : 0;
  const top3Weight =
    sortedByWeight
      .slice(0, 3)
      .reduce((sum, h) => sum + h.current_value, 0) / total * 100;

  if (top1Weight > 25 || top3Weight > 60) {
    tags.push({
      id: 'concentration',
      label: 'High Concentration Risk',
      severity: 'high',
      description:
        'A small number of holdings make up most of the portfolio value.',
    });
  } else if (top1Weight > 15 || top3Weight > 45) {
    tags.push({
      id: 'concentration',
      label: 'Moderate Concentration',
      severity: 'medium',
      description: 'Portfolio is somewhat concentrated in a few stocks.',
    });
  }

  const benchmark = options?.benchmarkSectors ?? [];
  if (sectors.length > 0) {
    const maxSector = sectors[0];
    if (maxSector.weightPercent > 40) {
      tags.push({
        id: 'sector_imbalance',
        label: 'Sector Imbalance',
        severity: 'high',
        description: `Portfolio is heavily tilted towards ${maxSector.sector}.`,
      });
    } else if (maxSector.weightPercent > 30) {
      tags.push({
        id: 'sector_imbalance',
        label: 'Sector Tilt',
        severity: 'medium',
        description: `Portfolio has a noticeable tilt towards ${maxSector.sector}.`,
      });
    }

    if (benchmark.length > 0) {
      for (const b of benchmark) {
        const actual = sectors.find((s) => s.sector === b.sector);
        if (!actual) continue;
        const diff = actual.weightPercent - b.weightPercent;
        if (diff > 15) {
          if (!tags.find((t) => t.id === 'sector_imbalance')) {
            tags.push({
              id: 'sector_imbalance',
              label: 'Sector Imbalance',
              severity: 'medium',
              description:
                'Sector weights differ significantly from benchmark.',
            });
          }
          break;
        }
      }
    }
  }

  const smallCaps = holdings.filter((h) => (h as any).market_cap === 'small');
  if (smallCaps.length > 0) {
    const smallCapValue = smallCaps.reduce(
      (sum, h) => sum + h.current_value,
      0
    );
    const smallCapWeight = (smallCapValue / total) * 100;
    if (smallCapWeight > 35) {
      tags.push({
        id: 'smallcap_risk',
        label: 'High Small-cap Exposure',
        severity: 'high',
        description:
          'Significant exposure to small-cap stocks increases volatility and drawdown risk.',
      });
    } else if (smallCapWeight > 20) {
      tags.push({
        id: 'smallcap_risk',
        label: 'Elevated Small-cap Exposure',
        severity: 'medium',
        description:
          'Moderate exposure to small-caps can increase risk during market stress.',
      });
    }
  }

  const lowQuality = holdings.filter((h) => {
    const quality = (h as any).quality_score as number | undefined;
    return typeof quality === 'number' && quality < 40;
  });
  if (lowQuality.length > 0) {
    tags.push({
      id: 'quality_risk',
      label: 'Quality Risk',
      severity: 'medium',
      description:
        'Some holdings show weak fundamentals such as low returns on capital or high debt.',
    });
  }

  const overValued = holdings.filter((h) => {
    const valuation = (h as any).valuation_score as number | undefined;
    return typeof valuation === 'number' && valuation < 40;
  });
  if (overValued.length > 0) {
    tags.push({
      id: 'valuation_risk',
      label: 'Rich Valuations',
      severity: 'medium',
      description:
        'Several holdings trade at rich valuations relative to their history or sector.',
    });
  }

  return tags;
}

function buildSuggestions(
  holdings: HoldingWithMetrics[],
  sectors: SectorMeta[],
  risks: PortfolioHealthRiskTag[]
): PortfolioHealthSuggestion[] {
  const suggestions: PortfolioHealthSuggestion[] = [];
  const total = holdings.reduce((sum, h) => sum + h.current_value, 0);
  if (total <= 0) {
    return suggestions;
  }

  const sortedByWeight = [...holdings].sort(
    (a, b) => b.current_value - a.current_value
  );
  const top1 = sortedByWeight[0];
  const top3 = sortedByWeight.slice(0, 3);
  const top1Weight = top1 ? (top1.current_value / total) * 100 : 0;
  const top3Weight =
    top3.reduce((sum, h) => sum + h.current_value, 0) / total * 100;

  if (risks.find((r) => r.id === 'concentration') && top1) {
    suggestions.push({
      id: 'trim_top_holding',
      title: `Trim ${top1.symbol} allocation`,
      description: `Your top holding ${top1.symbol} is about ${top1Weight.toFixed(
        1
      )}% of the portfolio. Consider reducing it towards 10–15% to lower concentration risk.`,
      priority: 'high',
    });
  }

  if (risks.find((r) => r.id === 'concentration') && top3.length === 3) {
    suggestions.push({
      id: 'balance_top3',
      title: 'Balance top 3 positions',
      description: `Your top 3 positions account for approximately ${top3Weight.toFixed(
        1
      )}% of portfolio value. Adding 2–3 new quality names can improve diversification.`,
      priority: 'medium',
    });
  }

  const sectorRisk = risks.find((r) => r.id === 'sector_imbalance');
  if (sectorRisk && sectors.length > 0) {
    const topSector = sectors[0];
    suggestions.push({
      id: 'reduce_sector_tilt',
      title: `Reduce ${topSector.sector} exposure`,
      description: `About ${topSector.weightPercent.toFixed(
        1
      )}% of your portfolio is in ${topSector.sector}. Consider gradually reallocating some gains into other sectors for balance.`,
      priority: 'medium',
    });
  }

  if (risks.find((r) => r.id === 'smallcap_risk')) {
    suggestions.push({
      id: 'add_large_caps',
      title: 'Increase large-cap allocation',
      description:
        'Introduce or increase allocation to large-cap, cash-generative companies to stabilise portfolio volatility.',
      priority: 'high',
    });
  }

  if (risks.find((r) => r.id === 'valuation_risk')) {
    suggestions.push({
      id: 'stagger_entries',
      title: 'Stagger new investments',
      description:
        'Given rich valuations in parts of your portfolio, stagger fresh investments over time instead of deploying lump sums.',
      priority: 'medium',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'maintain_discipline',
      title: 'Maintain current allocation with review',
      description:
        'Your portfolio looks reasonably balanced. Maintain allocation discipline and review quarterly or when major events occur.',
      priority: 'low',
    });
  }

  return suggestions;
}

export function computePortfolioHealth(
  holdings: HoldingWithMetrics[],
  options?: ComputeOptions
): PortfolioHealthResult {
  const total = holdings.reduce((sum, h) => sum + h.current_value, 0);
  if (total <= 0) {
    return {
      score: 0,
      risk_tags: [],
      suggestions: [],
      sector_breakdown: [],
      concentration: {
        top_holding_weight: 0,
        top3_weight: 0,
      },
    };
  }

  const sectors = computeSectorBreakdown(holdings);
  const risks = buildRiskTags(holdings, sectors, options);
  const suggestions = buildSuggestions(holdings, sectors, risks);

  const sortedByWeight = [...holdings].sort(
    (a, b) => b.current_value - a.current_value
  );
  const top1 = sortedByWeight[0];
  const top3 = sortedByWeight.slice(0, 3);
  const top1Weight = top1 ? (top1.current_value / total) * 100 : 0;
  const top3Weight =
    top3.reduce((sum, h) => sum + h.current_value, 0) / total * 100;

  let score = 100;

  if (top1Weight > 25) {
    score -= 20;
  } else if (top1Weight > 15) {
    score -= 10;
  }

  if (top3Weight > 60) {
    score -= 15;
  } else if (top3Weight > 45) {
    score -= 8;
  }

  const smallCaps = holdings.filter((h) => (h as any).market_cap === 'small');
  if (smallCaps.length > 0) {
    const smallCapValue = smallCaps.reduce(
      (sum, h) => sum + h.current_value,
      0
    );
    const smallCapWeight = (smallCapValue / total) * 100;
    if (smallCapWeight > 35) {
      score -= 20;
    } else if (smallCapWeight > 20) {
      score -= 10;
    }
  }

  const lowQuality = holdings.filter((h) => {
    const quality = (h as any).quality_score as number | undefined;
    return typeof quality === 'number' && quality < 40;
  });
  if (lowQuality.length > 0) {
    score -= 10;
  }

  const overValued = holdings.filter((h) => {
    const valuation = (h as any).valuation_score as number | undefined;
    return typeof valuation === 'number' && valuation < 40;
  });
  if (overValued.length > 0) {
    score -= 10;
  }

  score = clamp(score, 0, 100);

  return {
    score,
    risk_tags: risks,
    suggestions,
    sector_breakdown: sectors.map((s) => ({
      sector: s.sector,
      weight_percent: s.weightPercent,
    })),
    concentration: {
      top_holding_weight: top1Weight,
      top3_weight: top3Weight,
    },
  };
}

