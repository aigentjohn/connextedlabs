/**
 * useFixEngagementConstraints
 *
 * Calls the server once per browser session to idempotently:
 *   1. Expand the content_favorites / content_likes CHECK constraints
 *   2. Add the Kit Commerce columns to market_offerings (fixes the
 *      "record "new" has no field "purchase_type"" trigger error)
 *
 * Uses sessionStorage so it only fires once per tab, not on every render.
 */
import { useEffect } from 'react';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

// Bump the version suffix whenever the migration script is updated so all
// existing sessions re-run the patched version (trigger function fix v2).
const SESSION_KEY = 'connexted:constraints_fixed_v2';
const OFFERINGS_KEY = 'connexted:offerings_columns_fixed_v1';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f`;
const HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
};

export function useFixEngagementConstraints() {
  useEffect(() => {
    // ── 1. Engagement constraints ─────────────────────────────────────────────
    if (!sessionStorage.getItem(SESSION_KEY)) {
      fetch(`${BASE}/admin/fix-engagement-constraints`, { method: 'POST', headers: HEADERS })
        .then(r => r.json())
        .then(data => {
          console.log('[fix-engagement-constraints]', data.message ?? data);
          if (data.ok) sessionStorage.setItem(SESSION_KEY, '1');
        })
        .catch(err => {
          console.warn('[fix-engagement-constraints] fetch failed:', err);
        });
    }

    // ── 2. market_offerings Kit Commerce columns ───────────────────────────────
    // Fixes: "record "new" has no field "purchase_type"" trigger error on INSERT.
    if (!sessionStorage.getItem(OFFERINGS_KEY)) {
      fetch(`${BASE}/admin/fix-offerings-columns`, { method: 'POST', headers: HEADERS })
        .then(r => r.json())
        .then(data => {
          console.log('[fix-offerings-columns]', data.message ?? data);
          if (data.ok !== false) sessionStorage.setItem(OFFERINGS_KEY, '1');
        })
        .catch(err => {
          console.warn('[fix-offerings-columns] fetch failed:', err);
        });
    }
  }, []);
}