'use client';

import type { HoldingWithMetrics } from '@/types';
import {
  TrophyIcon,
  AlertTriangleIcon,
  PieChartIcon,
  TrendingUpIcon,
  ShieldIcon,
  ZapIcon,
} from 'lucide-react';

interface SmartInsightsProps {
  holdings: HoldingWithMetrics[];
}

interface Insight {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 10000000) {
    return `${(value / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(value) >= 100000) {
    return `${(value / 100000).toFixed(2)} L`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function generateInsights(holdings: HoldingWithMetrics[]): Insight[] {
  if (holdings.length === 0) return [];

  const insights: Insight[] = [];

  // Best performer
  const sorted = [...holdings].sort((a, b) => b.pnl_percent - a.pnl_percent);
  const best = sorted[0];
  if (best && best.pnl_percent > 0) {
    insights.push({
      icon: TrophyIcon,
      title: 'Star Performer',
      description: `${best.symbol} is your best holding at +${best.pnl_percent.toFixed(1)}% (${formatCurrency(best.pnl)} profit)`,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    });
  }

  // Worst performer
  const worst = sorted[sorted.length - 1];
  if (worst && worst.pnl_percent < -5) {
    insights.push({
      icon: AlertTriangleIcon,
      title: 'Needs Attention',
      description: `${worst.symbol} is down ${worst.pnl_percent.toFixed(1)}% — review if your thesis still holds`,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-500/10',
    });
  }

  // Concentration risk
  const totalValue = holdings.reduce((sum, h) => sum + h.current_value, 0);
  const topHolding = sorted.reduce((max, h) => (h.current_value > max.current_value ? h : max), sorted[0]);
  const topPercent = totalValue > 0 ? (topHolding.current_value / totalValue) * 100 : 0;
  if (topPercent > 30 && holdings.length > 1) {
    insights.push({
      icon: PieChartIcon,
      title: 'Concentration Risk',
      description: `${topHolding.symbol} is ${topPercent.toFixed(0)}% of your portfolio — consider diversifying`,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-500/10',
    });
  }

  // Good diversification
  if (holdings.length >= 5 && topPercent <= 25) {
    insights.push({
      icon: ShieldIcon,
      title: 'Well Diversified',
      description: `${holdings.length} stocks with no single holding above 25% — good risk management`,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10',
    });
  }

  // Today's momentum
  const gainersToday = holdings.filter((h) => h.day_change > 0).length;
  const losersToday = holdings.filter((h) => h.day_change < 0).length;
  if (gainersToday > 0 || losersToday > 0) {
    const ratio = gainersToday / (gainersToday + losersToday);
    if (ratio >= 0.7) {
      insights.push({
        icon: TrendingUpIcon,
        title: 'Strong Day',
        description: `${gainersToday} of ${holdings.length} stocks are green today — momentum is in your favor`,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-500/10',
      });
    } else if (ratio <= 0.3) {
      insights.push({
        icon: ZapIcon,
        title: 'Rough Day',
        description: `${losersToday} of ${holdings.length} stocks are red today — stay patient`,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-500/10',
      });
    }
  }

  // Portfolio milestone
  if (totalValue >= 1000000) {
    const crores = totalValue / 10000000;
    if (crores >= 1) {
      insights.push({
        icon: TrophyIcon,
        title: 'Portfolio Milestone',
        description: `Your portfolio has crossed ${crores.toFixed(1)} Cr — impressive growth!`,
        color: 'text-violet-600 dark:text-violet-400',
        bgColor: 'bg-violet-500/10',
      });
    } else {
      insights.push({
        icon: TrendingUpIcon,
        title: 'Portfolio Milestone',
        description: `Your portfolio is worth ${formatCurrency(totalValue)} — keep growing!`,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-500/10',
      });
    }
  }

  return insights.slice(0, 4);
}

export default function SmartInsights({ holdings }: SmartInsightsProps) {
  const insights = generateInsights(holdings);

  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
      {insights.map((insight) => {
        const Icon = insight.icon;
        return (
          <div
            key={insight.title}
            className={`flex items-start gap-3 rounded-xl border p-3 sm:p-4 ${insight.bgColor}`}
          >
            <div className={`shrink-0 mt-0.5 ${insight.color}`}>
              <Icon className="size-4 sm:size-5" />
            </div>
            <div className="min-w-0">
              <p className={`text-xs sm:text-base font-semibold ${insight.color}`}>
                {insight.title}
              </p>
              <p className="text-[11px] sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                {insight.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
