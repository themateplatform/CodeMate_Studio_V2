// @deno-types="https://deno.land/x/supabase_functions_js@2.0.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { getCorsHeaders, corsHeaders } from "../_shared/cors.ts"

// Global Deno types for TypeScript
declare global {
  var Deno: {
    env: {
      get(key: string): string | undefined;
    };
  };
}

console.log("Secure API Proxy Edge Function starting up")

interface ProxyRequest {
  provider: 'openai' | 'github';
  action: string;
  payload?: any;
  scope?: string;
}

interface ProxyResponse {
  success: boolean;
  data?: any;
  error?: string;
  usage?: {
    tokens?: number;
    cost?: number;
  };
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client for JWT validation and audit logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE')!
    const supabase = createClient(supabaseUrl, supabaseServiceRole)

    // Verify and validate JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      await logAuditEvent(supabase, requestId, null, 'auth_failed', 'Missing authorization header', origin);
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const token = authHeader.substring(7)
    // Use anon key for user validation
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!)
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token)

    if (authError || !user) {
      await logAuditEvent(supabase, requestId, null, 'auth_failed', 'Invalid or expired token', origin);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request
    const requestBody: ProxyRequest = await req.json()
    const { provider, action, payload } = requestBody

    if (!provider || !action) {
      await logAuditEvent(supabase, requestId, user.id, 'validation_failed', 'Missing required fields', origin);
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: provider, action' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check rate limits
    const rateLimitResult = await checkRateLimit(supabase, user.id, provider);
    if (!rateLimitResult.allowed) {
      await logAuditEvent(supabase, requestId, user.id, 'rate_limited', `${provider}:${action}`, origin);
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded', retry_after: rateLimitResult.retryAfter }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } 
        }
      )
    }

    // Log API access
    await logAuditEvent(supabase, requestId, user.id, 'api_call', `${provider}:${action}`, origin);

    let response: ProxyResponse = { success: false }

    // Route to secure proxy handlers - NO SECRETS EXPOSED
    switch (provider) {
      case 'openai':
        response = await proxyOpenAI(supabase, action, payload, user.id, requestId)
        break
      case 'github':
        response = await proxyGitHub(supabase, action, payload, user.id, requestId)
        break
      default:
        response = { success: false, error: 'Unsupported provider' }
    }

    // Update usage tracking
    if (response.success && response.usage) {
      await updateUsageTracking(supabase, user.id, provider, response.usage);
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: response.success ? 200 : 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        } 
      }
    )

  } catch (error) {
    console.error(`API proxy error [${requestId}]:`, error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Secure OpenAI API proxy - NEVER exposes API keys to client
 * All OpenAI calls are proxied through this function
 */
// Audit logging functions
async function logAuditEvent(supabase: any, requestId: string, userId: string | null, eventType: string, details: string, origin: string | null): Promise<void> {
  try {
    await supabase.from('api_audit_logs').insert({
      id: requestId,
      user_id: userId,
      event_type: eventType,
      details,
      origin,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

// Rate limiting functions using secure database functions
async function checkRateLimit(supabase: any, userId: string, provider: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const { data, error } = await supabase.rpc('get_current_usage', {
      p_user_id: userId,
      p_provider: provider,
      p_window_minutes: 1
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      return { allowed: true }; // Allow on error for availability
    }

    const limits = {
      openai: { requests: 100, tokens: 10000 },
      github: { requests: 200, tokens: 0 },
    };

    const limit = limits[provider as keyof typeof limits] || { requests: 50, tokens: 1000 };
    const usage = data?.[0];
    
    if (usage) {
      if (usage.request_count >= limit.requests || usage.tokens_used >= limit.tokens) {
        return { allowed: false, retryAfter: 60 };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true }; // Allow on error for availability
  }
}

async function updateUsageTracking(supabase: any, userId: string, provider: string, usage: { tokens?: number; cost?: number }): Promise<void> {
  try {
    const windowStart = new Date(Date.now() - (Date.now() % 60000)).toISOString(); // Round to minute
    
    const { error } = await supabase.rpc('increment_usage_tracking', {
      p_user_id: userId,
      p_provider: provider,
      p_window_start: windowStart,
      p_tokens: usage.tokens || 0,
      p_cost: usage.cost || 0
    });

    if (error) {
      console.error('Failed to update usage tracking:', error);
    }
  } catch (error) {
    console.error('Failed to update usage tracking:', error);
  }
}

// GitHub token storage functions
async function storeGitHubToken(supabase: any, userId: string, accessToken: string, scope: string): Promise<void> {
  try {
    await supabase.from('github_tokens').upsert({
      user_id: userId,
      access_token: accessToken,
      scope,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });
  } catch (error) {
    console.error('Failed to store GitHub token:', error);
    throw error;
  }
}

async function getGitHubToken(supabase: any, userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('github_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Failed to get GitHub token:', error);
      return null;
    }

    return data?.access_token || null;
  } catch (error) {
    console.error('Failed to get GitHub token:', error);
    return null;
  }
}

async function proxyOpenAI(supabase: any, action: string, payload: any, userId: string, requestId: string): Promise<ProxyResponse> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!apiKey) {
    return { success: false, error: 'OpenAI service unavailable' }
  }

  try {
    switch (action) {
      case 'chat':
        return await handleOpenAIChat(apiKey, payload, userId)
      case 'completion':
        return await handleOpenAICompletion(apiKey, payload, userId)
      case 'models':
        return await handleOpenAIModels(apiKey, userId)
      default:
        return { success: false, error: 'Unsupported OpenAI action' }
    }
  } catch (error) {
    console.error(`OpenAI proxy error for user ${userId}:`, error)
    return { success: false, error: 'OpenAI request failed' }
  }
}

/**
 * Secure GitHub API proxy - handles OAuth flow securely
 */
async function proxyGitHub(supabase: any, action: string, payload: any, userId: string, requestId: string): Promise<ProxyResponse> {
  const clientId = Deno.env.get('GITHUB_CLIENT_ID')
  const clientSecret = Deno.env.get('GITHUB_CLIENT_SECRET')
  
  if (!clientId || !clientSecret) {
    return { success: false, error: 'GitHub service unavailable' }
  }

  try {
    switch (action) {
      case 'oauth-url':
        return await generateGitHubOAuthURL(clientId, payload, userId)
      case 'exchange-code':
        return await exchangeGitHubCode(supabase, clientId, clientSecret, payload, userId)
      case 'user-repos':
        return await fetchUserRepositories(supabase, userId)
      default:
        return { success: false, error: 'Unsupported GitHub action' }
    }
  } catch (error) {
    console.error(`GitHub proxy error for user ${userId}:`, error)
    return { success: false, error: 'GitHub request failed' }
  }
}

// OpenAI proxy handlers
async function handleOpenAIChat(apiKey: string, payload: any, userId: string): Promise<ProxyResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: payload.model || 'gpt-4o',
      messages: payload.messages,
      max_tokens: Math.min(payload.max_tokens || 1000, 4000), // Rate limit
      temperature: payload.temperature || 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    data: {
      choices: data.choices,
      usage: data.usage,
    },
    usage: {
      tokens: data.usage?.total_tokens || 0,
      cost: calculateOpenAICost(data.usage, payload.model)
    }
  }
}

async function handleOpenAICompletion(apiKey: string, payload: any, userId: string): Promise<ProxyResponse> {
  // Legacy completion endpoint handling
  const response = await fetch('https://api.openai.com/v1/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: payload.model || 'gpt-3.5-turbo-instruct',
      prompt: payload.prompt,
      max_tokens: Math.min(payload.max_tokens || 1000, 2000),
      temperature: payload.temperature || 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    data: {
      choices: data.choices,
      usage: data.usage,
    },
    usage: {
      tokens: data.usage?.total_tokens || 0,
      cost: calculateOpenAICost(data.usage, payload.model)
    }
  }
}

async function handleOpenAIModels(apiKey: string, userId: string): Promise<ProxyResponse> {
  const response = await fetch('https://api.openai.com/v1/models', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    data: data.data
  }
}

// GitHub proxy handlers
async function generateGitHubOAuthURL(clientId: string, payload: any, userId: string): Promise<ProxyResponse> {
  const scope = payload.scope || 'repo,user'
  const state = payload.state || crypto.randomUUID()
  const redirectUri = payload.redirectUri
  
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scope}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`
  
  return {
    success: true,
    data: { url, state }
  }
}

async function exchangeGitHubCode(supabase: any, clientId: string, clientSecret: string, payload: any, userId: string): Promise<ProxyResponse> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: payload.code,
      redirect_uri: payload.redirectUri,
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub OAuth error: ${response.status}`)
  }

  const data = await response.json()
  
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description}`)
  }
  
  // Store token securely server-side
  await storeGitHubToken(supabase, userId, data.access_token, data.scope);
  
  return {
    success: true,
    data: {
      // DO NOT return access_token to client
      scope: data.scope,
      token_type: data.token_type,
      connected: true,
    }
  }
}

async function fetchUserRepositories(supabase: any, userId: string): Promise<ProxyResponse> {
  // Get stored GitHub token
  const accessToken = await getGitHubToken(supabase, userId);
  
  if (!accessToken) {
    return {
      success: false,
      error: 'GitHub token not found. Please connect your GitHub account first.'
    };
  }

  const response = await fetch('https://api.github.com/user/repos?per_page=100', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    data: data.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      description: repo.description,
      language: repo.language,
      updated_at: repo.updated_at,
    }))
  }
}

// Utility functions
function calculateOpenAICost(usage: any, model: string): number {
  if (!usage) return 0
  
  // Simplified cost calculation (update with current pricing)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
  }
  
  const rates = pricing[model] || pricing['gpt-3.5-turbo']
  const inputCost = (usage.prompt_tokens || 0) * rates.input / 1000
  const outputCost = (usage.completion_tokens || 0) * rates.output / 1000
  
  return inputCost + outputCost
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/secret-broker' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFub24iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTg5MjIwM30.K9w8eJFgrvT5T6lJl6pKw8QBPcIjD-0K-OZo5U4oC8_-uHc' \
    --header 'Content-Type: application/json' \
    --data '{"provider":"openai","action":"get"}'

*/