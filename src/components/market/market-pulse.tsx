'use client';

interface MarketItem {
  symbol: string;
  name: string;
  change: number;
  changePercent: number;
}

interface MarketPulseProps {
  indices: MarketItem[];
  topGainers: MarketItem[];
  topLosers: MarketItem[];
  allStocks: MarketItem[];
}

function getLabel(score: number): { text: string; color: string } {
  if (score >= 75) return { text: 'Extreme Greed', color: 'text-green-600 dark:text-green-400' };
  if (score >= 55) return { text: 'Greed', color: 'text-green-500 dark:text-green-400' };
  if (score >= 45) return { text: 'Neutral', color: 'text-yellow-600 dark:text-yellow-400' };
  if (score >= 25) return { text: 'Fear', color: 'text-orange-600 dark:text-orange-400' };
  return { text: 'Extreme Fear', color: 'text-red-600 dark:text-red-400' };
}

export default function MarketPulse({
  indices,
  topGainers,
  topLosers,
  allStocks,
}: MarketPulseProps) {
  // Calculate market sentiment score (0-100)
  // Based on: index performance, advance/decline ratio, breadth

  let score = 50; // Start neutral

  // Index contribution (Nifty/Sensex performance)
  const indexAvgChange =
    indices.length > 0
      ? indices.reduce((sum, i) => sum + i.changePercent, 0) / indices.length
      : 0;

  // Clamp index contribution: -2% to +2% maps to -25 to +25
  score += Math.max(-25, Math.min(25, indexAvgChange * 12.5));

  // Advance/decline ratio from all stocks
  if (allStocks.length > 0) {
    const advancers = allStocks.filter((s) => s.change > 0).length;
    const decliners = allStocks.filter((s) => s.change < 0).length;
    const total = advancers + decliners;
    if (total > 0) {
      const adRatio = advancers / total; // 0 to 1
      score += (adRatio - 0.5) * 30; // -15 to +15
    }
  }

  // Gainer/loser strength
  const gainerStrength =
    topGainers.length > 0
      ? topGainers.reduce((sum, g) => sum + g.changePercent, 0) / topGainers.length
      : 0;
  const loserStrength =
    topLosers.length > 0
      ? Math.abs(
          topLosers.reduce((sum, l) => sum + l.changePercent, 0) / topLosers.length
        )
      : 0;

  if (gainerStrength + loserStrength > 0) {
    const momentum = gainerStrength / (gainerStrength + loserStrength); // 0 to 1
    score += (momentum - 0.5) * 20; // -10 to +10
  }

  // Clamp final score
  score = Math.max(0, Math.min(100, Math.round(score)));

  const label = getLabel(score);
  const rotation = (score / 100) * 180 - 90; // -90 to 90 degrees

  // Legend data
  const zones = [
    { range: '0–24', label: 'Extreme Fear', color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400', meaning: 'Heavy selling, panic in markets' },
    { range: '25–44', label: 'Fear', color: 'bg-orange-500', textColor: 'text-orange-600 dark:text-orange-400', meaning: 'Bearish sentiment, caution advised' },
    { range: '45–54', label: 'Neutral', color: 'bg-yellow-500', textColor: 'text-yellow-600 dark:text-yellow-400', meaning: 'Balanced, no clear direction' },
    { range: '55–74', label: 'Greed', color: 'bg-green-500', textColor: 'text-green-600 dark:text-green-400', meaning: 'Bullish sentiment, optimism rising' },
    { range: '75–100', label: 'Extreme Greed', color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400', meaning: 'Euphoria, possible overvaluation' },
  ];

  // Determine which zone is active
  const activeZoneIndex = score >= 75 ? 4 : score >= 55 ? 3 : score >= 45 ? 2 : score >= 25 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      {/* Gauge */}
      <div className="relative w-[180px] sm:w-[200px] h-[100px] sm:h-[110px]">
        <svg
          viewBox="0 0 200 110"
          className="w-full h-full"
        >
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            className="text-muted/50"
          />

          {/* Gradient arc segments */}
          <path
            d="M 20 100 A 80 80 0 0 1 56 38"
            fill="none"
            stroke="#ef4444"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M 56 38 A 80 80 0 0 1 100 20"
            fill="none"
            stroke="#f97316"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M 100 20 A 80 80 0 0 1 144 38"
            fill="none"
            stroke="#eab308"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M 144 38 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#22c55e"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Needle */}
          <g
            className="animate-gauge"
            style={{
              transformOrigin: '100px 100px',
              transform: `rotate(${rotation}deg)`,
            }}
          >
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="35"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-foreground"
            />
            <circle
              cx="100"
              cy="100"
              r="5"
              className="fill-foreground"
            />
          </g>

          {/* Score text */}
          <text
            x="100"
            y="88"
            textAnchor="middle"
            className="fill-foreground font-bold"
            style={{ fontSize: '24px' }}
          >
            {score}
          </text>
          <text
            x="100"
            y="104"
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: '9px' }}
          >
            out of 100
          </text>
        </svg>

        {/* Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
          <span className="text-[10px] font-medium text-red-500">0</span>
          <span className="text-[10px] font-medium text-green-500">100</span>
        </div>
      </div>

      <p className={`text-base sm:text-lg font-bold mt-2 ${label.color}`}>
        {label.text}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        Market Sentiment Index
      </p>

      {/* Sentiment Zone Legend */}
      <div className="w-full mt-4 space-y-1.5">
        {zones.map((zone, i) => (
          <div
            key={zone.label}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
              i === activeZoneIndex ? 'bg-muted/80 ring-1 ring-border' : ''
            }`}
          >
            <span className={`size-2.5 rounded-full shrink-0 ${zone.color}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className={`text-xs font-semibold ${i === activeZoneIndex ? zone.textColor : 'text-foreground'}`}>
                  {zone.label}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{zone.range}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">{zone.meaning}</p>
            </div>
          </div>
        ))}
      </div>

      {/* How it's calculated */}
      <div className="w-full mt-3 pt-3 border-t">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">How it works:</span> Score is calculated from index performance, advance/decline ratio of Nifty stocks, and top gainer vs loser strength. Updated with each refresh.
        </p>
      </div>
    </div>
  );
}
