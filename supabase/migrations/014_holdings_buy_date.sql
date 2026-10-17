-- Optional purchase date per holding (used for STCG/LTCG classification).
-- Null = fall back to created_at (date added to StockPulse).

alter table public.holdings add column if not exists buy_date date;
