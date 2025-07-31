import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Client-side Supabase client
export const createClient = () => createClientComponentClient()

// Server-side Supabase client
export const createServerClient = () => createRouteHandlerClient({ cookies })

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}

// Helper function to create or update user profile
export const upsertUserProfile = async (userData: any) => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .upsert(userData, { onConflict: 'id' })
    .select()
    .single()
  
  return { data, error }
}

// Helper function to save IFTA report
export const saveIFTAReport = async (reportData: any) => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ifta_reports')
    .insert(reportData)
    .select()
    .single()
  
  return { data, error }
}

// Helper function to get user's IFTA reports
export const getUserReports = async (userId: string) => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ifta_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  return { data, error }
}