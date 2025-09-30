import { createClient } from '@supabase/supabase-js'

// Client-side Supabase configuration
// Note: These should be set at build time or runtime via env vars
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zzzmfdmpehcopfqcvohq.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6em1mZG1wZWhjb3BmcWN2b2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjczODQzNzksImV4cCI6MjA0Mjk2MDM3OX0.JXtVPa4tqkVLqKBJsxAyOQ-J-JEJ0KdRr7P3_y3ZKb0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error fetching user:', error)
    return null
  }
  return user
}

// Helper function to sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Error signing out:', error)
    throw error
  }
}