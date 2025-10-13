import { createClient } from '@supabase/supabase-js'
import { env } from './config/env'

const supabaseUrl = env.supabaseUrl
const supabaseServiceRole = env.supabaseServiceRole

// Server-side client with service role for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Standard client for user operations
const supabaseAnonKey = env.supabaseAnonKey

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
