/**
 * Supabase Admin Client
 *
 * This client uses the service role key and should ONLY be used server-side
 * (API routes, server components, server actions).
 *
 * DO NOT import this in client components!
 */

import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Creates a Supabase client with admin privileges
 * This bypasses Row Level Security (RLS) and has full database access
 *
 * @returns Supabase admin client
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
