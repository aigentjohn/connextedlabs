import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

// Supabase configuration
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publicAnonKey;

// Singleton instance — prevents multiple clients and avoids
// "Lock broken by another request with the 'steal' option" errors.
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: `sb-${projectId}-auth-token`,
      },
    });
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();

// NOTE: supabaseAdmin has been intentionally removed.
// All privileged operations that previously used the service role key
// in the browser must go through the Hono server routes in
// /supabase/functions/server/admin-users-routes.ts, which read
// SUPABASE_SERVICE_ROLE_KEY exclusively from Deno.env.
// The key must never appear in any file processed by Vite.
