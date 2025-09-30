-- API Backend Schema Pack
-- API-focused schema with logs, webhooks, rate limiting, and API management

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- API Users/Clients table
CREATE TABLE IF NOT EXISTS public.api_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    api_secret_hash TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, suspended, revoked
    tier VARCHAR(50) DEFAULT 'free', -- free, basic, pro, enterprise
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    rate_limit_per_day INTEGER DEFAULT 10000,
    allowed_origins TEXT[],
    allowed_ips INET[],
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Endpoints registry
CREATE TABLE IF NOT EXISTS public.api_endpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    path VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL, -- GET, POST, PUT, PATCH, DELETE
    version VARCHAR(20) DEFAULT 'v1',
    name VARCHAR(255),
    description TEXT,
    category VARCHAR(100),
    auth_required BOOLEAN DEFAULT TRUE,
    rate_limit_override INTEGER,
    cache_ttl INTEGER DEFAULT 0, -- seconds
    deprecated BOOLEAN DEFAULT FALSE,
    deprecated_message TEXT,
    replacement_endpoint VARCHAR(500),
    request_schema JSONB,
    response_schema JSONB,
    example_request JSONB,
    example_response JSONB,
    tags TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(path, method, version)
);

-- API Request logs
CREATE TABLE IF NOT EXISTS public.api_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.api_clients(id) ON DELETE SET NULL,
    endpoint_id UUID REFERENCES public.api_endpoints(id) ON DELETE SET NULL,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    query_params JSONB,
    request_headers JSONB,
    request_body JSONB,
    response_status INTEGER,
    response_headers JSONB,
    response_body JSONB,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    error_stack TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook configurations
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.api_clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    secret VARCHAR(255),
    events TEXT[] NOT NULL, -- Array of event types to subscribe to
    headers JSONB DEFAULT '{}',
    retry_policy JSONB DEFAULT '{"max_retries": 3, "retry_delay_seconds": 60}',
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMPTZ,
    failure_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255),
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,
    attempt_number INTEGER DEFAULT 1,
    next_retry_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
    window_type VARCHAR(20) NOT NULL, -- minute, hour, day
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, window_type, window_start)
);

-- API Keys rotation history
CREATE TABLE IF NOT EXISTS public.api_key_rotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
    old_key_hash VARCHAR(255),
    new_key_hash VARCHAR(255),
    reason VARCHAR(255),
    rotated_by VARCHAR(255),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error logs for debugging
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.api_clients(id) ON DELETE SET NULL,
    request_id UUID REFERENCES public.api_requests(id) ON DELETE SET NULL,
    error_code VARCHAR(50),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    context JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'error', -- debug, info, warning, error, critical
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API metrics and analytics
CREATE TABLE IF NOT EXISTS public.api_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.api_clients(id) ON DELETE SET NULL,
    endpoint_id UUID REFERENCES public.api_endpoints(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    hour INTEGER CHECK (hour >= 0 AND hour <= 23),
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    avg_response_time_ms NUMERIC(10,2),
    p50_response_time_ms INTEGER,
    p95_response_time_ms INTEGER,
    p99_response_time_ms INTEGER,
    total_response_size_bytes BIGINT DEFAULT 0,
    unique_ips INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, endpoint_id, date, hour)
);

-- API events for audit trail
CREATE TABLE IF NOT EXISTS public.api_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL, -- api_key_created, api_key_rotated, rate_limit_exceeded, etc.
    client_id UUID REFERENCES public.api_clients(id) ON DELETE SET NULL,
    actor VARCHAR(255),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service health checks
CREATE TABLE IF NOT EXISTS public.service_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(100) NOT NULL,
    endpoint VARCHAR(500),
    status VARCHAR(20) DEFAULT 'healthy', -- healthy, degraded, unhealthy
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth tokens for API authentication
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
    access_token_hash VARCHAR(255) UNIQUE NOT NULL,
    refresh_token_hash VARCHAR(255) UNIQUE,
    scope TEXT[],
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_clients_api_key ON public.api_clients(api_key);
CREATE INDEX IF NOT EXISTS idx_api_clients_status ON public.api_clients(status);
CREATE INDEX IF NOT EXISTS idx_api_clients_tier ON public.api_clients(tier);

CREATE INDEX IF NOT EXISTS idx_api_endpoints_path_method ON public.api_endpoints(path, method);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_version ON public.api_endpoints(version);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_is_active ON public.api_endpoints(is_active);

CREATE INDEX IF NOT EXISTS idx_api_requests_client_id ON public.api_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_api_requests_endpoint_id ON public.api_requests(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_api_requests_created_at ON public.api_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_response_status ON public.api_requests(response_status);
CREATE INDEX IF NOT EXISTS idx_api_requests_ip_address ON public.api_requests(ip_address);

CREATE INDEX IF NOT EXISTS idx_webhooks_client_id ON public.webhooks(client_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON public.webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON public.webhooks USING GIN(events);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON public.webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_type ON public.webhook_deliveries(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON public.webhook_deliveries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limits_client_window ON public.rate_limits(client_id, window_type, window_start);

CREATE INDEX IF NOT EXISTS idx_error_logs_client_id ON public.error_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved);

CREATE INDEX IF NOT EXISTS idx_api_metrics_client_endpoint_date ON public.api_metrics(client_id, endpoint_id, date);
CREATE INDEX IF NOT EXISTS idx_api_metrics_date ON public.api_metrics(date DESC);

CREATE INDEX IF NOT EXISTS idx_api_events_client_id ON public.api_events(client_id);
CREATE INDEX IF NOT EXISTS idx_api_events_event_type ON public.api_events(event_type);
CREATE INDEX IF NOT EXISTS idx_api_events_created_at ON public.api_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_health_service_name ON public.service_health(service_name);
CREATE INDEX IF NOT EXISTS idx_service_health_status ON public.service_health(status);
CREATE INDEX IF NOT EXISTS idx_service_health_checked_at ON public.service_health(checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_access_token ON public.oauth_tokens(access_token_hash);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_client_id ON public.oauth_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON public.oauth_tokens(expires_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_api_clients_updated_at BEFORE UPDATE ON public.api_clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_api_endpoints_updated_at BEFORE UPDATE ON public.api_endpoints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON public.webhooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON public.rate_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_oauth_tokens_updated_at BEFORE UPDATE ON public.oauth_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to clean up old logs (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.api_requests WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM public.webhook_deliveries WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    DELETE FROM public.error_logs WHERE created_at < NOW() - INTERVAL '1 day' * (days_to_keep * 2) AND resolved = TRUE;
    DELETE FROM public.api_events WHERE created_at < NOW() - INTERVAL '1 day' * (days_to_keep * 3);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate API metrics
CREATE OR REPLACE FUNCTION public.calculate_api_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.api_metrics (
        client_id,
        endpoint_id,
        date,
        hour,
        total_requests,
        successful_requests,
        failed_requests,
        avg_response_time_ms,
        p50_response_time_ms,
        p95_response_time_ms,
        p99_response_time_ms,
        total_response_size_bytes,
        unique_ips
    )
    SELECT
        client_id,
        endpoint_id,
        target_date,
        EXTRACT(HOUR FROM created_at)::INTEGER as hour,
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE response_status BETWEEN 200 AND 299) as successful_requests,
        COUNT(*) FILTER (WHERE response_status >= 400) as failed_requests,
        AVG(response_time_ms)::NUMERIC(10,2) as avg_response_time_ms,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as p50_response_time_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as p95_response_time_ms,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as p99_response_time_ms,
        SUM(LENGTH(response_body::TEXT))::BIGINT as total_response_size_bytes,
        COUNT(DISTINCT ip_address) as unique_ips
    FROM public.api_requests
    WHERE DATE(created_at) = target_date
    GROUP BY client_id, endpoint_id, EXTRACT(HOUR FROM created_at)
    ON CONFLICT (client_id, endpoint_id, date, hour)
    DO UPDATE SET
        total_requests = EXCLUDED.total_requests,
        successful_requests = EXCLUDED.successful_requests,
        failed_requests = EXCLUDED.failed_requests,
        avg_response_time_ms = EXCLUDED.avg_response_time_ms,
        p50_response_time_ms = EXCLUDED.p50_response_time_ms,
        p95_response_time_ms = EXCLUDED.p95_response_time_ms,
        p99_response_time_ms = EXCLUDED.p99_response_time_ms,
        total_response_size_bytes = EXCLUDED.total_response_size_bytes,
        unique_ips = EXCLUDED.unique_ips;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies
ALTER TABLE public.api_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (customize based on your auth strategy)
-- These assume you have a way to identify the current API client
CREATE POLICY "Clients can view own data" ON public.api_clients FOR SELECT USING (id = auth.uid()::UUID);
CREATE POLICY "Clients can update own data" ON public.api_clients FOR UPDATE USING (id = auth.uid()::UUID);

CREATE POLICY "Public endpoints are viewable" ON public.api_endpoints FOR SELECT USING (is_active = true);

CREATE POLICY "Clients can view own requests" ON public.api_requests FOR SELECT USING (client_id = auth.uid()::UUID);
CREATE POLICY "Clients can view own webhooks" ON public.webhooks FOR ALL USING (client_id = auth.uid()::UUID);
CREATE POLICY "Clients can view own webhook deliveries" ON public.webhook_deliveries FOR SELECT 
    USING (webhook_id IN (SELECT id FROM public.webhooks WHERE client_id = auth.uid()::UUID));

CREATE POLICY "Clients can view own rate limits" ON public.rate_limits FOR SELECT USING (client_id = auth.uid()::UUID);
CREATE POLICY "Clients can view own metrics" ON public.api_metrics FOR SELECT USING (client_id = auth.uid()::UUID);
CREATE POLICY "Clients can view own events" ON public.api_events FOR SELECT USING (client_id = auth.uid()::UUID);
CREATE POLICY "Clients can manage own tokens" ON public.oauth_tokens FOR ALL USING (client_id = auth.uid()::UUID);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON public.api_endpoints TO anon, authenticated;
GRANT ALL ON public.api_requests TO authenticated;
GRANT ALL ON public.api_metrics TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.api_clients IS 'API client registry with authentication and rate limiting';
COMMENT ON TABLE public.api_endpoints IS 'API endpoint definitions and documentation';
COMMENT ON TABLE public.api_requests IS 'Detailed API request and response logs';
COMMENT ON TABLE public.webhooks IS 'Webhook configurations for event subscriptions';
COMMENT ON TABLE public.rate_limits IS 'Rate limiting tracking per client and time window';
COMMENT ON TABLE public.api_metrics IS 'Aggregated API performance metrics';