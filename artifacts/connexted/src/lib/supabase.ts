import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

// Supabase configuration
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publicAnonKey;

// ─── Universal request timeout ────────────────────────────────────────────────
// Every Supabase request (reads AND writes) goes through this fetch wrapper.
// If the server hasn't responded within REQUEST_TIMEOUT_MS the request is
// aborted and an AbortError is thrown into the caller's catch/finally chain —
// so buttons never stay stuck on "Saving…" and spinners never run forever.
const REQUEST_TIMEOUT_MS = 30_000;

const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

  // Combine caller's signal (if any) with our timeout signal so both work.
  let signal: AbortSignal;
  if (init?.signal) {
    if (typeof AbortSignal.any === 'function') {
      signal = AbortSignal.any([init.signal as AbortSignal, timeoutSignal]);
    } else {
      // Fallback: manual composition for browsers without AbortSignal.any
      const controller = new AbortController();
      const abort = () => controller.abort();
      (init.signal as AbortSignal).addEventListener('abort', abort, { once: true });
      timeoutSignal.addEventListener('abort', abort, { once: true });
      signal = controller.signal;
    }
  } else {
    signal = timeoutSignal;
  }

  return fetch(input, { ...init, signal });
};

// ─── Friendly error message helper ───────────────────────────────────────────
// Import this wherever you want a readable message instead of raw error text.
export function getSupabaseErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'The request took too long and was cancelled. Please check your connection and try again.';
  }
  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return 'Network error — please check your connection and try again.';
    }
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}

// ─── Singleton Supabase client ────────────────────────────────────────────────
// Single instance prevents the "Lock broken by another request with the
// 'steal' option" Web Lock race condition on concurrent auth refreshes.
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: `sb-${projectId}-auth-token`,
      },
      global: {
        fetch: fetchWithTimeout,
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
