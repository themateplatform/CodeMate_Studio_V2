-- API Proxy Support Tables
-- Created for Phase 3: Secure API Proxy implementation

-- Audit logging table for API access tracking
CREATE TABLE IF NOT EXISTS api_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details TEXT,
  origin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting and usage tracking table
CREATE TABLE IF NOT EXISTS api_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 1,
  tokens_used INTEGER DEFAULT 0,
  cost_incurred DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider, window_start)
);

-- GitHub token storage (encrypted)
CREATE TABLE IF NOT EXISTS github_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_audit_logs_user_id ON api_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_audit_logs_created_at ON api_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_tracking_user_provider ON api_usage_tracking(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_api_usage_tracking_window_start ON api_usage_tracking(window_start);
CREATE INDEX IF NOT EXISTS idx_github_tokens_user_id ON github_tokens(user_id);

-- Row Level Security policies
ALTER TABLE api_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_audit_logs
CREATE POLICY "Users can view their own audit logs" ON api_audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert audit logs" ON api_audit_logs
  FOR INSERT WITH CHECK (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

-- RLS Policies for api_usage_tracking
CREATE POLICY "Users can view their own usage tracking" ON api_usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert usage tracking" ON api_usage_tracking
  FOR INSERT WITH CHECK (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

CREATE POLICY "Service role can update usage tracking" ON api_usage_tracking
  FOR UPDATE USING (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

-- RLS Policies for github_tokens - NEVER allow client access to tokens
CREATE POLICY "Service role can manage GitHub tokens" ON github_tokens
  FOR ALL USING (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

-- Comments for documentation
COMMENT ON TABLE api_audit_logs IS 'Audit trail for all API proxy requests with user context';
COMMENT ON TABLE api_usage_tracking IS 'Rate limiting and usage tracking per user per provider';
COMMENT ON TABLE github_tokens IS 'Secure server-side storage of GitHub OAuth tokens';

COMMENT ON COLUMN api_audit_logs.event_type IS 'Type of event: auth_failed, api_call, rate_limited, etc.';
COMMENT ON COLUMN api_usage_tracking.window_start IS 'Start of the rate limiting window (rounded to minute)';
COMMENT ON COLUMN github_tokens.access_token IS 'GitHub OAuth access token (should be encrypted in production)';