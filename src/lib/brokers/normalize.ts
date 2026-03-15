import type { BrokerHolding } from '@/types';

export function normalizeUpstoxHoldings(data: any[]): BrokerHolding[] {
  return data.map((item) => ({
    symbol: extractSymbol(item.tradingsymbol || item.trading_symbol || ''),
    name: item.company_name || item.tradingsymbol || item.trading_symbol || '',
    exchange: item.exchange || 'NSE',
    quantity: Number(item.quantity) || 0,
    avg_price: Number(item.average_price) || 0,
    last_price: Number(item.last_price) || Number(item.ltp) || 0,
    pnl: Number(item.pnl) || 0,
  }));
}

export function normalizeZerodhaHoldings(data: any[]): BrokerHolding[] {
  return data.map((item) => ({
    symbol: item.tradingsymbol || '',
    name: item.tradingsymbol || '',
    exchange: item.exchange || 'NSE',
    quantity: Number(item.quantity) || 0,
    avg_price: Number(item.average_price) || 0,
    last_price: Number(item.last_price) || 0,
    pnl: Number(item.pnl) || 0,
  }));
}

/**
 * Extracts a clean symbol from an Upstox trading symbol.
 * Upstox symbols may include exchange prefix like "NSE_EQ|INE002A01018"
 * or be formatted as "RELIANCE-EQ".
 */
function extractSymbol(tradingSymbol: string): string {
  // Handle "NSE_EQ|INE002A01018" format - use the tradingsymbol directly
  if (tradingSymbol.includes('|')) {
    return tradingSymbol;
  }
  // Handle "RELIANCE-EQ" format - strip the suffix
  if (tradingSymbol.includes('-')) {
    return tradingSymbol.split('-')[0];
  }
  return tradingSymbol;
}
