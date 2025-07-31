// lib/supabaseClient.ts
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '../types/supabase'; // adjust path as needed

const supabase = createBrowserSupabaseClient<Database>();

export default supabase;
