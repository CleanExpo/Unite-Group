-- SYN-518: Pipeline cost monitoring report
-- Run in Supabase SQL Editor or psql for ongoing margin monitoring

-- 1. Cost by pipeline (all time)
SELECT
  pipeline_name,
  COUNT(*) AS total_runs,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  ROUND(SUM(cost_usd)::numeric, 4) AS total_cost_usd,
  ROUND(AVG(cost_usd)::numeric, 6) AS avg_cost_per_run
FROM pipeline_cost_ledger
GROUP BY pipeline_name
ORDER BY total_cost_usd DESC;

-- 2. Monthly cost trend (last 6 months)
SELECT
  DATE_TRUNC('month', created_at) AS month,
  pipeline_name,
  ROUND(SUM(cost_usd)::numeric, 4) AS monthly_cost_usd,
  COUNT(*) AS runs
FROM pipeline_cost_ledger
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;

-- 3. Per-client cost (top 20)
SELECT
  client_id,
  COUNT(*) AS total_runs,
  ROUND(SUM(cost_usd)::numeric, 4) AS total_cost_usd,
  ROUND(AVG(cost_usd)::numeric, 6) AS avg_cost_per_run
FROM pipeline_cost_ledger
WHERE client_id IS NOT NULL
GROUP BY client_id
ORDER BY total_cost_usd DESC
LIMIT 20;

-- 4. Model distribution
SELECT
  model,
  COUNT(*) AS runs,
  ROUND(SUM(cost_usd)::numeric, 4) AS total_cost_usd
FROM pipeline_cost_ledger
GROUP BY model
ORDER BY total_cost_usd DESC;

-- 5. Board-level pipelines (null client_id)
SELECT
  pipeline_name,
  COUNT(*) AS runs,
  ROUND(SUM(cost_usd)::numeric, 4) AS total_cost_usd
FROM pipeline_cost_ledger
WHERE client_id IS NULL
GROUP BY pipeline_name
ORDER BY total_cost_usd DESC;
