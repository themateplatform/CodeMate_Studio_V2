// Secure CORS configuration with proper origin validation
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const isDev = Deno.env.get('ENVIRONMENT') !== 'production';
  
  // Define allowed origins
  const allowedOrigins = isDev 
    ? [
        /^https:\/\/.*\.replit\.dev$/,
        /^https:\/\/.*\.replit\.co$/,
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
      ]
    : [
        // Add production domains here
        /^https:\/\/yourdomain\.com$/,
        /^https:\/\/.*\.yourdomain\.com$/,
      ];

  // Check if origin is allowed
  const isAllowed = origin && allowedOrigins.some(pattern => pattern.test(origin));
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

// Legacy export for simple CORS (used for OPTIONS)
export const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
}