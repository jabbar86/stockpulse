-- Speed up GET /api/profile parallel counts (run in Supabase SQL editor or via CLI)
-- Idempotent: same index names as schema.sql — IF NOT EXISTS is a no-op when already applied.

-- analysis_history: count non-cached AI rows per user
create index if not exists idx_analysis_history_user_ai_noncached
  on analysis_history (user_id)
  where type = 'ai' and cached = false;

-- broker_connections: count connected rows per user
create index if not exists idx_broker_connections_user_connected
  on broker_connections (user_id)
  where status = 'connected';

-- holdings(user_id): already covered by idx_holdings_user_id in schema.sql
