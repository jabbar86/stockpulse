import { cn } from '@/lib/utils';

/** Standard notice for Indian securities / mutual fund context (informational, not legal advice). */
export const MARKET_RISK_DISCLAIMER =
  'Investments in securities and mutual funds are subject to market risks. Read all scheme-related and other relevant documents carefully before investing. Past performance does not guarantee future results. StockPulse provides educational tools only and does not offer investment, legal, or tax advice.';

type MarketRiskDisclaimerProps = {
  className?: string;
  /** Slightly larger text for landing vs compact app footer */
  size?: 'sm' | 'xs';
};

export function MarketRiskDisclaimer({ className, size = 'xs' }: MarketRiskDisclaimerProps) {
  return (
    <p
      role="note"
      aria-label="Market risk notice"
      className={cn(
        'text-pretty text-center leading-snug text-muted-foreground',
        size === 'sm' ? 'text-xs sm:text-[13px]' : 'text-[10px] sm:text-[11px]',
        className
      )}
    >
      {MARKET_RISK_DISCLAIMER}
    </p>
  );
}
