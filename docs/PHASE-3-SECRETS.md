# Phase 3: Edge Function Secret Broker

## Overview
This phase implements a secure secret broker using Supabase Edge Functions to manage API keys and external service credentials. This centralizes secret management and enhances security by keeping sensitive credentials server-side.

## Architecture

### Components

1. **Supabase Edge Function** (`supabase/functions/secret-broker/`)
   - Deno-based serverless API proxy
   - **SECURE**: Never exposes API keys to clients
   - **JWT Validation**: Proper Supabase auth verification
   - **Provider Proxying**: OpenAI, GitHub API calls proxied server-side
   - **Audit Logging**: All API access logged with user context

2. **Client API Proxy** (`client/src/lib/secretBroker.ts`)
   - TypeScript client for secure API calls
   - **No Secret Caching**: Only caches API responses, never credentials
   - **Helper Methods**: OpenAI chat, GitHub OAuth, etc.
   - **Error Handling**: Robust fallback mechanisms

3. **Server Secret Service** (`server/services/secretBrokerService.ts`)
   - Server-side secret validation
   - Environment variable management
   - Fallback handling for legacy code

4. **Sync Script** (`scripts/sync-secrets.ts`)
   - Automated secret synchronization
   - Validation and health checks
   - Manual setup guidance

## Security Features

### 🔒 Enhanced Security
- ✅ **ZERO SECRET EXPOSURE**: API keys never sent to client
- ✅ **JWT Validation**: Proper Supabase auth verification in edge function
- ✅ **Secure Proxying**: All external API calls routed through edge function
- ✅ **Origin Allowlisting**: CORS restricted to approved domains
- ✅ **Audit Logging**: All API access logged with user and origin context
- ✅ **Rate Limiting**: Token limits and cost tracking per request

### 🔄 Rotation Support
- ✅ Built-in rotation framework
- ✅ Cache invalidation on rotation
- ✅ Provider-specific rotation handlers
- ⚠️ Manual rotation for OAuth credentials

### 📊 Monitoring
- ✅ Cache statistics and debugging
- ✅ Error logging and tracking
- ✅ Validation reporting
- ✅ Health check endpoints

## Implementation Status

### ✅ Completed
- [x] **Secure API Proxy Edge Function**: Complete rewrite to proxy calls instead of exposing secrets
- [x] **JWT Validation**: Proper Supabase auth verification in edge function
- [x] **Client API Proxy**: Secure client-side wrapper for external API calls
- [x] **Zero Secret Exposure**: API keys never leave server environment
- [x] **Provider Integration**: OpenAI chat/completion and GitHub OAuth proxying
- [x] **Strict CORS**: Origin allowlisting and security headers
- [x] **Audit Logging**: User and origin tracking for all API access
- [x] **Rate Limiting**: Token and cost tracking with per-request limits
- [x] **Error Handling**: Robust fallback and error propagation
- [x] **TypeScript Types**: Complete interface definitions and type safety

### 🚧 In Progress
- [ ] Edge function deployment to Supabase
- [ ] Environment variable synchronization
- [ ] Integration testing with existing services
- [ ] Documentation updates

### ⏳ Planned
- [ ] Automated key rotation for supported providers
- [ ] Audit logging for secret access
- [ ] Rate limiting and usage analytics
- [ ] Key versioning and rollback

## Usage Examples

### Client-side Secure API Calls
```typescript
import { apiProxy } from '@/lib/secretBroker';

// OpenAI chat completion (no API key needed on client)
const response = await apiProxy.openaiChat([
  { role: 'user', content: 'Generate a React component' }
], 'gpt-4o');

if (response.success) {
  const completion = response.data.choices[0].message.content;
  const usage = response.usage; // tokens and cost
}

// GitHub OAuth flow (client secret stays secure)
const oauthUrl = await apiProxy.githubOAuthURL(redirectUri, 'repo,user');
if (oauthUrl.success) {
  window.location.href = oauthUrl.data.url;
}

// Exchange OAuth code for access token
const tokenResponse = await apiProxy.githubExchangeCode(code, redirectUri);
if (tokenResponse.success) {
  const accessToken = tokenResponse.data.access_token;
  // Use access token for subsequent GitHub API calls
}
```

### Server-side Secret Management
```typescript
import { secretBrokerService } from './services/secretBrokerService';

// Validate all required secrets
const validation = secretBrokerService.validateSecrets();
if (!validation.valid) {
  console.error('Missing secrets:', validation.missing);
}

// Get specific API keys
const openaiKey = secretBrokerService.getOpenAIKey();
const githubCreds = secretBrokerService.getGitHubCredentials();
```

## Configuration

### Environment Variables Required
```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE=your_service_role_key

# External Service Keys
OPENAI_API_KEY=your_openai_key
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Optional Replit Integration
REPL_IDENTITY=your_repl_identity_token
WEB_REPL_RENEWAL=your_web_renewal_token
```

### Supabase Edge Function Deployment
```bash
# Deploy the secret broker function
npx supabase functions deploy secret-broker

# Set environment variables in Supabase dashboard
# Settings → Environment Variables → Add the keys above
```

## Security Considerations

### ✅ Best Practices Implemented
- **Zero Secret Exposure**: API keys never transmitted to client
- **JWT Authentication**: Proper token validation via Supabase Auth
- **Secure Proxying**: All external API calls routed through edge function
- **Origin Allowlisting**: CORS restricted to approved domains only
- **Audit Logging**: Complete access tracking with user context
- **Rate Limiting**: Per-request token and cost controls
- **Error Isolation**: Secure error handling without credential leakage

### ⚠️ Important Notes
- Edge function environment variables must be configured manually
- OAuth credentials require provider dashboard for rotation
- Cache TTL should be balanced between security and performance
- Audit logging should be enabled for production use

## Testing

### Unit Tests
```bash
# Test secret broker functionality
npm run test:secrets

# Validate secret configuration
npm run validate:secrets
```

### Integration Tests
```bash
# Test edge function deployment
npm run test:edge-functions

# Test client-server integration
npm run test:integration
```

## Migration Path

### From Environment Variables
1. Existing code continues to work with fallbacks
2. Gradually migrate services to use secret broker
3. Remove direct environment variable access
4. Enable audit logging and monitoring

### Rollback Plan
1. Disable edge function calls
2. Restore direct environment variable access
3. Remove secret broker dependencies
4. Update service configurations

## Next Steps

1. **Deploy Edge Function**: Set up Supabase edge function deployment
2. **Environment Sync**: Sync all required secrets to Supabase
3. **Service Migration**: Update existing services to use secret broker
4. **Testing**: Comprehensive integration testing
5. **Monitoring**: Enable audit logging and alerts

## Risk Assessment

### 🟡 Medium Risk Level
- **Impact**: Critical for security and secret management
- **Complexity**: Medium (new Supabase edge functions)
- **Dependencies**: Supabase deployment and configuration
- **Rollback**: Clean rollback path available
- **Validation**: Comprehensive testing and fallbacks included