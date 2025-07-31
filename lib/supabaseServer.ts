// lib/supabaseServer.ts

import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '../types/supabase' // adjust the path if you have DB types

export const createServerClient = () =>
  createRouteHandlerClient<Database>({ cookies })
