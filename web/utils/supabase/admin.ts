// utils/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Super Admin Supabase Client
 * Bypasses Row Level Security (RLS) policies using the Supabase Service Role Key.
 * MUST ONLY be invoked server-side inside secure Server Actions or privileged Route Handlers.
 * NEVER expose this client to the browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable.');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable for RLS bypass client.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
