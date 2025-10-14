import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "../../../src/integrations/supabase/client";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// CSRF token cache
let csrfToken: string | null = null;

async function getCSRFToken(): Promise<string> {
  if (csrfToken) {
    console.log('Using cached CSRF token');
    return csrfToken;
  }
  
  try {
    console.log('Fetching new CSRF token...');
    const response = await fetch('/api/csrf-token', {
      credentials: 'include'
    });
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrfToken; // Fixed: was data.token, should be data.csrfToken
      console.log('CSRF token fetched successfully, token:', csrfToken ? csrfToken.substring(0, 10) + '...' : 'null');
      return csrfToken || '';
    } else {
      console.error('Failed to fetch CSRF token:', response.status, response.statusText);
    }
  } catch (error) {
    console.warn('Failed to fetch CSRF token:', error);
  }
  
  return '';
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  // Attach Supabase access token if present
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  } catch {}

  // Add CSRF token for non-GET requests
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    const token = await getCSRFToken();
    if (token && token.length > 0) {
      headers['X-CSRF-Token'] = token;
      if (process.env.NODE_ENV === 'development') {
        console.debug('Attached CSRF token to headers:', token ? token.substring(0, 10) + '...' : 'null');
      }
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Clear CSRF token cache on 403 errors (token might be expired)
  if (res.status === 403) {
    console.warn(`403 error for ${method} ${url}, clearing CSRF token cache`);
    csrfToken = null;
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    } catch {}

    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
