import type { TechnicalIndicators, AIAnalysis } from '@/types';

type Recommendation = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';

const TECHNICAL_WEIGHT = 0.4;
const AI_WEIGHT = 0.6;

function aiRecommendationToScore(
  recommendation: AIAnalysis['recommendation']
): number {
  switch (recommendation) {
    case 'strong_buy':
      return 80;
    case 'buy':
      return 40;
    case 'hold':
      return 0;
    case 'sell':
      return -40;
    case 'strong_sell':
      return -80;
    default:
      return 0;
  }
}

function mapScoreToRecommendation(score: number): Recommendation {
  if (score >= 50) return 'strong_buy';
  if (score >= 20) return 'buy';
  if (score > -20) return 'hold';
  if (score > -50) return 'sell';
  return 'strong_sell';
}

export function getCombinedRecommendation(
  technical: TechnicalIndicators,
  ai?: AIAnalysis
): { recommendation: Recommendation; confidence: number } {
  const technicalScore = technical.score;

  if (!ai) {
    // Without AI analysis, use only technical score
    return {
      recommendation: mapScoreToRecommendation(technicalScore),
      confidence: Math.min(Math.abs(technicalScore), 100),
    };
  }

  const aiScore = aiRecommendationToScore(ai.recommendation);
  const combinedScore =
    technicalScore * TECHNICAL_WEIGHT + aiScore * AI_WEIGHT;

  // Confidence is a blend of AI confidence and the strength of the combined signal
  const signalStrength = Math.min(Math.abs(combinedScore), 100);
  const combinedConfidence = Math.round(
    ai.confidence * AI_WEIGHT + signalStrength * TECHNICAL_WEIGHT
  );

  return {
    recommendation: mapScoreToRecommendation(combinedScore),
    confidence: Math.max(0, Math.min(100, combinedConfidence)),
  };
}
