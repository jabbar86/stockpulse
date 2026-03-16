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
} from 'lucide-react';

interface AIAnalysisCardProps {
  analysis: AIAnalysis | null;
  loading: boolean;
  onAnalyze: () => void;
}

function getRecommendationConfig(recommendation: AIAnalysis['recommendation']) {
  switch (recommendation) {
    case 'strong_buy':
      return { label: 'Strong Buy', className: 'bg-green-600 text-white' };
    case 'buy':
      return { label: 'Buy', className: 'bg-green-500/10 text-green-600 dark:text-green-400' };
    case 'hold':
      return { label: 'Hold', className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' };
    case 'sell':
      return { label: 'Sell', className: 'bg-red-500/10 text-red-600 dark:text-red-400' };
    case 'strong_sell':
      return { label: 'Strong Sell', className: 'bg-red-600 text-white' };
  }
}

export default function AIAnalysisCard({ analysis, loading, onAnalyze }: AIAnalysisCardProps) {
  if (!analysis && !loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <SparklesIcon className="size-10 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">AI-Powered Analysis</p>
            <p className="text-sm text-muted-foreground mt-1">
              Get an AI-generated analysis including recommendation, key factors, and price targets.
            </p>
          </div>
          <Button onClick={onAnalyze} className="gap-2">
            <SparklesIcon className="size-4" />
            Analyze with AI
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="size-5 animate-pulse text-primary" />
            Analyzing...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const recConfig = getRecommendationConfig(analysis.recommendation);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-primary" />
            AI Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
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
              <TrendingUpIcon className="size-4 text-green-500" />
              Key Factors
            </h4>
            <ul className="space-y-1">
              {(analysis.key_factors || []).map((factor, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-green-500" />
                  {factor}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-sm font-medium">
              <ShieldAlertIcon className="size-4 text-red-500" />
              Risks
            </h4>
            <ul className="space-y-1">
              {(analysis.risks || []).map((risk, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-500" />
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
                <p className="text-lg font-semibold text-red-500">
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
                <p className="text-lg font-semibold text-green-500">
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
