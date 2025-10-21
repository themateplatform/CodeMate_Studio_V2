import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../supabase/types.gen';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

function createDisabledProxy<T extends object>(label: string, reason: string): T {
  const handler: ProxyHandler<any> = {
    get: (_t, prop) => {
      if (prop === 'then') return undefined;
      return createDisabledProxy(`${label}.${String(prop)}`, reason);
    },
    apply: () => {
      throw new Error(`[supabase] Not configured: ${reason}`);
    },
    construct: () => {
      throw new Error(`[supabase] Not configured: ${reason}`);
    },
  };
  return new Proxy(() => { throw new Error(`[supabase] Not configured: ${reason}`); }, handler) as T;
}

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : createDisabledProxy<SupabaseClient<Database>>(
      'SupabaseClient',
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in the client environment.'
    );
