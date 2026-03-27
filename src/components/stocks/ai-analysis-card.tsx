'use client';

import type { AIAnalysis } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SparklesIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ShieldAlertIcon,
  TargetIcon,
  Loader2Icon,
} from 'lucide-react';

interface AIAnalysisCardProps {
  analysis: AIAnalysis | null;
  loading: boolean;
  onAnalyze: () => void;
}

function getRecommendationConfig(recommendation: AIAnalysis['recommendation']) {
  switch (recommendation) {
    case 'strong_buy':
      return { label: 'Strong Buy', className: 'bg-primary text-primary-foreground' };
    case 'buy':
      return { label: 'Buy', className: 'bg-primary/12 text-primary' };
    case 'hold':
      return { label: 'Hold', className: 'bg-hold/15 text-hold' };
    case 'sell':
      return { label: 'Sell', className: 'bg-loss/12 text-loss' };
    case 'strong_sell':
      return { label: 'Strong Sell', className: 'bg-destructive text-destructive-foreground' };
  }
}

export default function AIAnalysisCard({ analysis, loading, onAnalyze }: AIAnalysisCardProps) {
  if (!analysis && !loading) {
    return (
      <Card className="border-dashed border-border shadow-none">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <SparklesIcon className="size-8 text-muted-foreground" />
          <div className="max-w-md space-y-1">
            <p className="font-medium">Run AI analysis</p>
            <p className="text-sm text-muted-foreground">Recommendation, factors, risks, and levels.</p>
          </div>
          <Button variant="outline" onClick={onAnalyze} className="gap-2">
            <SparklesIcon className="size-4" />
            Analyze
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-border shadow-none">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
            Working…
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-[90%]" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-20 rounded-md" />
            <Skeleton className="h-20 rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const recConfig = getRecommendationConfig(analysis.recommendation);

  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <SparklesIcon className="size-4 text-muted-foreground" />
            Result
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={recConfig.className}>{recConfig.label}</Badge>
            <Badge variant="outline">{analysis.confidence}% confidence</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div>
          <p className="text-sm leading-relaxed">{analysis.summary}</p>
        </div>

        {/* Key Factors and Risks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-sm font-medium">
              <TrendingUpIcon className="size-4 text-gain" />
              Key Factors
            </h4>
            <ul className="space-y-1">
              {(analysis.key_factors || []).map((factor, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gain" />
                  {factor}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-sm font-medium">
              <ShieldAlertIcon className="size-4 text-loss" />
              Risks
            </h4>
            <ul className="space-y-1">
              {(analysis.risks || []).map((risk, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-loss" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Price Targets */}
        {analysis.price_targets && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-sm font-medium">
              <TargetIcon className="size-4 text-primary" />
              Price Targets
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Support</p>
                <p className="text-lg font-semibold text-loss">
                  {analysis.price_targets.support.toFixed(2)}
                </p>
              </div>
              {analysis.price_targets.target_6m && (
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Target (6M)</p>
                  <p className="text-lg font-semibold text-primary">
                    {analysis.price_targets.target_6m.toFixed(2)}
                  </p>
                </div>
              )}
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Resistance</p>
                <p className="text-lg font-semibold text-gain">
                  {analysis.price_targets.resistance.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sector Outlook */}
        {analysis.sector_outlook && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-sm font-medium">
              <TrendingDownIcon className="size-4 text-muted-foreground" />
              Sector Outlook
            </h4>
            <p className="text-sm text-muted-foreground">{analysis.sector_outlook}</p>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] sm:text-xs text-muted-foreground border-t pt-3">
          This analysis is purely based on available market data and technical indicators. All investments are subject to market risk. Please do your own research before making any investment decisions.
        </p>

        {/* Re-analyze button */}
        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onAnalyze} className="gap-2">
            <SparklesIcon className="size-3.5" />
            Re-analyze
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
