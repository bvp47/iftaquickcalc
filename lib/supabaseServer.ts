import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabaseServer = () => {
  return createServerComponentClient({ cookies })
}

// Add this export to match the import in create-checkout.ts
export const createServerSupabaseClient = () => {
  return createServerComponentClient({ cookies })
}
