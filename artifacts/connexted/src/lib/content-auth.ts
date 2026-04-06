/**
 * content-auth.ts
 *
 * Single source of truth for content creation auth across the platform.
 *
 * Usage in any Create/Add page:
 *
 *   const { userId, ownerFields, canCreate } = useContentAuth();
 *   const payload = { title, ...ownerFields('playlists') };
 */

import { useAuth } from './auth-context';

/**
 * Maps each Supabase table to the column name(s) that identify the creator.
 * This is the single place to update if a table's ownership column changes.
 *
 * Rule: if a table uses `author_id` for its INSERT RLS policy, list it here.
 * Everything else defaults to `created_by`.
 */
const AUTHOR_ID_TABLES = new Set([
  'documents',
  'endorsements', // "reviews" in UI terminology
]);

const DUAL_OWNER_TABLES: Record<string, string[]> = {
  libraries: ['created_by', 'owner_id'],
};

/**
 * Returns the ownership fields to spread into an INSERT payload for the given
 * Supabase table, using the provided user ID.
 *
 * Examples:
 *   ownerFieldsFor('playlists', uid)   → { created_by: uid }
 *   ownerFieldsFor('documents', uid)   → { author_id: uid }
 *   ownerFieldsFor('libraries', uid)   → { created_by: uid, owner_id: uid }
 */
export function ownerFieldsFor(
  table: string,
  userId: string
): Record<string, string> {
  if (AUTHOR_ID_TABLES.has(table)) {
    return { author_id: userId };
  }
  if (DUAL_OWNER_TABLES[table]) {
    return Object.fromEntries(
      DUAL_OWNER_TABLES[table].map((col) => [col, userId])
    );
  }
  return { created_by: userId };
}

/**
 * Hook — call inside any Create/Add component.
 *
 * Returns:
 *  - userId        The authenticated user's UUID (auth.uid() equivalent).
 *  - ownerFields   Function(tableName) → ownership field object to spread into INSERT.
 *  - canCreate     Function(typeCode) → whether the user's class/role allows creation.
 *  - role          The user's role string (e.g. 'super', 'admin', 'member').
 *  - ready         True once auth has resolved (avoids acting before profile loads).
 */
export function useContentAuth() {
  const { user, profile, userPermissions } = useAuth();

  const userId = user?.id ?? profile?.id ?? '';
  const role = profile?.role ?? 'member';

  function ownerFields(table: string): Record<string, string> {
    if (!userId) {
      console.error('[content-auth] ownerFields called with no authenticated user');
    }
    return ownerFieldsFor(table, userId);
  }

  /**
   * Returns true if the user's class permissions include the given container
   * type_code, or if the user is a super/admin (who can create anything).
   *
   * typeCode matches the `type_code` values in `user_class_permissions`, e.g.:
   *   'playlists', 'documents', 'reviews', 'circles', 'libraries', 'checklists', 'sprints'
   */
  function canCreate(typeCode: string): boolean {
    if (role === 'super' || role === 'admin') return true;
    return (
      userPermissions?.visible_containers?.some(
        (c) => c.type_code === typeCode
      ) ?? false
    );
  }

  return {
    userId,
    ownerFields,
    canCreate,
    role,
    ready: !!userId,
  };
}
