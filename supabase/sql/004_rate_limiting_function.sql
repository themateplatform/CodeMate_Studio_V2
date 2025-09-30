-- Atomic rate limiting function for proper usage tracking
-- This ensures race-condition-free increment operations

CREATE OR REPLACE FUNCTION increment_usage_tracking(
  p_user_id UUID,
  p_provider TEXT,
  p_window_start TIMESTAMPTZ,
  p_tokens INTEGER DEFAULT 0,
  p_cost DECIMAL DEFAULT 0
) RETURNS TABLE (
  new_request_count INTEGER,
  new_tokens_used INTEGER,
  new_cost_incurred DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_record RECORD;
BEGIN
  -- Atomic upsert with increment
  INSERT INTO api_usage_tracking (
    user_id, 
    provider, 
    window_start, 
    request_count, 
    tokens_used, 
    cost_incurred,
    updated_at
  ) VALUES (
    p_user_id, 
    p_provider, 
    p_window_start, 
    1, 
    p_tokens, 
    p_cost,
    NOW()
  )
  ON CONFLICT (user_id, provider, window_start) 
  DO UPDATE SET
    request_count = api_usage_tracking.request_count + 1,
    tokens_used = api_usage_tracking.tokens_used + p_tokens,
    cost_incurred = api_usage_tracking.cost_incurred + p_cost,
    updated_at = NOW()
  RETURNING 
    api_usage_tracking.request_count,
    api_usage_tracking.tokens_used,
    api_usage_tracking.cost_incurred
  INTO result_record;
  
  -- Return the new values
  new_request_count := result_record.request_count;
  new_tokens_used := result_record.tokens_used;
  new_cost_incurred := result_record.cost_incurred;
  
  RETURN NEXT;
END;
$$;

-- Grant execution to service role only
GRANT EXECUTE ON FUNCTION increment_usage_tracking TO service_role;
REVOKE EXECUTE ON FUNCTION increment_usage_tracking FROM anon, authenticated;

-- Get current usage for rate limiting
CREATE OR REPLACE FUNCTION get_current_usage(
  p_user_id UUID,
  p_provider TEXT,
  p_window_minutes INTEGER DEFAULT 1
) RETURNS TABLE (
  request_count INTEGER,
  tokens_used INTEGER,
  cost_incurred DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(aut.request_count), 0)::INTEGER as request_count,
    COALESCE(SUM(aut.tokens_used), 0)::INTEGER as tokens_used,
    COALESCE(SUM(aut.cost_incurred), 0)::DECIMAL as cost_incurred
  FROM api_usage_tracking aut
  WHERE 
    aut.user_id = p_user_id 
    AND aut.provider = p_provider 
    AND aut.window_start >= (NOW() - (p_window_minutes || ' minutes')::INTERVAL);
END;
$$;

-- Grant execution to service role only
GRANT EXECUTE ON FUNCTION get_current_usage TO service_role;
REVOKE EXECUTE ON FUNCTION get_current_usage FROM anon, authenticated;

-- Comments
COMMENT ON FUNCTION increment_usage_tracking IS 'Atomically increment usage tracking counters to prevent race conditions';
COMMENT ON FUNCTION get_current_usage IS 'Get current usage within a time window for rate limiting checks';