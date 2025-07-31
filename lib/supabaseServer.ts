// lib/supabaseServer.ts
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { GetServerSidePropsContext } from 'next';
import { Database } from '../types/supabase'; // adjust path if needed

export const createSupabaseServerClient = (ctx: GetServerSidePropsContext) => {
  return createServerSupabaseClient<Database>({
    req: ctx.req,
    res: ctx.res,
  });
};
