/**
 * Supabase Server Client for API Routes
 *
 * This client should be used in API routes (route handlers) to properly
 * handle authentication via cookies in a server-side context.
 *
 * DO NOT use the browser client (createClient from supabase.ts) in API routes!
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

/**
 * Creates a Supabase server client for API routes
 * This properly handles cookies and sessions in Next.js API routes
 *
 * @returns Supabase server client with cookie support
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
