export interface BookEventRow {
  symbol: string;
  name: string;
  type: 'earnings' | 'dividend';
  date: string;
  detail?: string;
}
