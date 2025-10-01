import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
      const receivedToken =
        typeof data?.csrfToken === 'string' && data.csrfToken.length > 0
          ? data.csrfToken
          : typeof data?.token === 'string'
            ? data.token
            : '';

      if (!receivedToken) {
        console.warn('CSRF token response missing token payload:', data);
        return '';
      }

      csrfToken = receivedToken;
      console.log('CSRF token fetched successfully, token:', csrfToken.substring(0, 10) + '...');
      return csrfToken;
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
  
  // Add CSRF token for non-GET requests
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    const token = await getCSRFToken();
    console.log(`Token received for ${method} ${url}:`, token ? token.substring(0, 10) + '...' : 'null/empty');
    if (token && token.length > 0) {
      headers['X-CSRF-Token'] = token;
      console.log(`Adding CSRF token to ${method} ${url}:`, token.substring(0, 10) + '...');
    } else {
      console.warn(`No CSRF token available for ${method} ${url}, token:`, token);
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
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
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
