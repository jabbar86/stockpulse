/** Risk-based position sizing. Pure functions, no I/O. */

export interface PositionSizeInput {
  capital: number;
  riskPercent: number;
  entry: number;
  stopLoss: number;
  target?: number;
}

export interface PositionSizeResult {
  direction: 'long' | 'short';
  quantity: number;
  /** Max loss budgeted from capital × risk %. */
  riskBudget: number;
  /** Actual loss if the stop is hit at `quantity`. */
  riskAmount: number;
  riskPerShare: number;
  positionValue: number;
  /** True when quantity was reduced so the position fits within capital. */
  cappedByCapital: boolean;
  rewardPerShare: number | null;
  rewardAmount: number | null;
  riskReward: number | null;
}

export type PositionSizeError = { error: string };

export function calculatePositionSize(
  input: PositionSizeInput
): PositionSizeResult | PositionSizeError {
  const { capital, riskPercent, entry, stopLoss, target } = input;
  if (![capital, riskPercent, entry, stopLoss].every(Number.isFinite)) {
    return { error: 'Enter valid numbers.' };
  }
  if (capital <= 0) return { error: 'Capital must be greater than 0.' };
  if (riskPercent <= 0 || riskPercent > 100) return { error: 'Risk % must be between 0 and 100.' };
  if (entry <= 0 || stopLoss <= 0) return { error: 'Prices must be greater than 0.' };
  if (entry === stopLoss) return { error: 'Stop-loss must differ from entry.' };

  const direction = stopLoss < entry ? 'long' : 'short';
  const riskPerShare = Math.abs(entry - stopLoss);
  const riskBudget = (capital * riskPercent) / 100;
  const byRisk = Math.floor(riskBudget / riskPerShare);
  const byCapital = Math.floor(capital / entry);
  const quantity = Math.max(0, Math.min(byRisk, byCapital));

  let rewardPerShare: number | null = null;
  if (typeof target === 'number' && Number.isFinite(target) && target > 0) {
    const r = direction === 'long' ? target - entry : entry - target;
    rewardPerShare = r > 0 ? r : null;
  }

  return {
    direction,
    quantity,
    riskBudget,
    riskAmount: quantity * riskPerShare,
    riskPerShare,
    positionValue: quantity * entry,
    cappedByCapital: byCapital < byRisk,
    rewardPerShare,
    rewardAmount: rewardPerShare === null ? null : rewardPerShare * quantity,
    riskReward: rewardPerShare === null ? null : rewardPerShare / riskPerShare,
  };
}
