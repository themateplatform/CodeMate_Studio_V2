# T002: Edge Function Secret Broker

**Phase**: 3  
**Priority**: High  
**Estimated Effort**: 1-2 days  
**Risk Level**: 🟡 Medium  

## Objective
Implement Supabase Edge Function to securely broker API keys without exposing them to client-side code.

## Security Requirements
- **Never ship provider keys to client**: All API keys stay server-side
- **Short-lived tokens**: Generate temporary access tokens
- **Rate limiting**: Prevent abuse of secret broker
- **Audit logging**: Track all secret access

## Technical Implementation

### **Edge Function Structure**
```typescript
// supabase/functions/secret-broker/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface SecretRequest {
  provider: 'openai' | 'github' | 'stripe'
  action: 'generate_code' | 'sync_repo' | 'process_payment'
  context?: Record<string, any>
}

serve(async (req) => {
  // Verify user authentication
  // Check rate limits
  // Validate request context
  // Return short-lived token or proxy call
})
```

### **Client Integration**
```typescript
// client/src/lib/secretBroker.ts
export async function getProviderToken(provider: string, action: string) {
  const { data } = await supabase.functions.invoke('secret-broker', {
    body: { provider, action }
  })
  return data.token
}

// Usage in OpenAI service
const token = await getProviderToken('openai', 'generate_code')
const response = await fetch('/api/ai/generate', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### **Secret Management**
```bash
# Store in Supabase Secrets (server-side only)
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set GITHUB_CLIENT_SECRET=ghcs_...
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
```

## Scope

### **Edge Function Development**
- [ ] Create `/supabase/functions/secret-broker/` directory
- [ ] Implement authentication verification
- [ ] Add rate limiting (per user, per provider)
- [ ] Create provider-specific token generation
- [ ] Add CORS headers for client requests
- [ ] Implement error handling and logging

### **Client Utilities**
- [ ] Create secret broker client wrapper
- [ ] Update OpenAI service to use broker
- [ ] Update GitHub integration to use broker
- [ ] Add retry logic for token failures
- [ ] Create provider type definitions

### **Security Measures**
- [ ] JWT token validation
- [ ] Request context validation
- [ ] Rate limiting by user/IP
- [ ] Audit trail for secret access
- [ ] Token expiration handling

### **Replit Integration**
- [ ] Create sync script: Replit Secrets → Supabase Secrets
- [ ] Environment variable mapping
- [ ] Automated secret rotation support
- [ ] Documentation for adding new providers

## Provider Support

### **OpenAI Integration**
```typescript
// Edge function handler
case 'openai':
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  return generateShortLivedToken(openaiKey, userId, 'openai')
```

### **GitHub Integration**
```typescript
// Proxy GitHub API calls
case 'github':
  const githubToken = await getGitHubUserToken(userId)
  return proxyGitHubRequest(request, githubToken)
```

### **Future Provider Support**
- Stripe for payments
- Twilio for SMS
- SendGrid for email
- Additional AI providers

## Testing & Validation

### **Security Testing**
- [ ] Token cannot be intercepted client-side
- [ ] Rate limits prevent abuse
- [ ] Invalid tokens rejected properly
- [ ] Cross-user access prevented

### **Functional Testing**
- [ ] OpenAI API calls work through broker
- [ ] GitHub operations maintain functionality
- [ ] Error handling works correctly
- [ ] Performance acceptable (< 100ms overhead)

## Documentation

### **Developer Guide**
```markdown
# Adding New API Provider

1. Add secret to Supabase: `supabase secrets set PROVIDER_KEY=...`
2. Update edge function with provider case
3. Create client wrapper function
4. Add TypeScript types
5. Test integration
```

### **Usage Examples**
```typescript
// Generate AI code
const aiResponse = await generateCode(prompt)

// Sync with GitHub  
const syncResult = await syncToGitHub(repoUrl, files)

// All API keys managed securely server-side
```

## Acceptance Criteria
- [ ] No API keys exposed in client bundle
- [ ] All current integrations work through broker
- [ ] Rate limiting prevents abuse
- [ ] Audit logs track secret usage
- [ ] Documentation complete
- [ ] Security review passed

## Risk Mitigation
- **Token Leakage**: Short expiration times (5 minutes)
- **Rate Limiting**: Per-user quotas enforced
- **Monitoring**: Alert on unusual access patterns
- **Fallback**: Direct API calls for emergencies

## Dependencies
- Phase 2 (Supabase Migration) completed
- Supabase Edge Functions enabled
- Provider API keys available in Replit Secrets