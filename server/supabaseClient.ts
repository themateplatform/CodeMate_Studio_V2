import { createClient } from '@supabase/supabase-js'

// Server-side Supabase configuration with service role
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceRole) {
  throw new Error(
    'Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE'
  )
}

// Server-side client with service role for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Standard client for user operations
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseAnonKey) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable')
}

export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper to verify JWT tokens
export const verifySupabaseJWT = async (token: string) => {
  try {
    const { data: { user }, error } = await supabaseServer.auth.getUser(token)
    if (error) throw error
    return user
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}