/**
 * Supabase Client Wrapper
 *
 * Re-exports the singleton Supabase client from /src/lib/supabase.ts
 * to maintain backward compatibility with imports from @/utils/supabase/client.
 *
 * supabaseAdmin is intentionally NOT re-exported here. All privileged
 * operations must go through the server-side Hono routes in
 * /supabase/functions/server/admin-users-routes.ts.
 */

export { supabase } from '@/lib/supabase';

// Default export for compatibility
import { supabase } from '@/lib/supabase';
export default supabase;
