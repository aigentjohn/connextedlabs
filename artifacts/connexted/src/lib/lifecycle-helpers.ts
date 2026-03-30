/**
 * Lifecycle State Helpers
 * Utility functions for fetching and merging lifecycle data
 */

import { supabase } from './supabase';

export type LifecycleState = 'idea' | 'created' | 'released' | 'active' | 'engaged' | 'stale';

export interface LifecycleData {
  entity_id: string;
  lifecycle_state: LifecycleState;
  member_count: number;
  content_count: number;
  posts_last_30_days: number;
  unique_contributors_last_30_days: number;
  last_activity_at: string | null;
}

/**
 * Fetches lifecycle states for a list of entities
 * @param entityType - The container type (circles, tables, elevators, etc.)
 * @param entityIds - Array of entity IDs to fetch lifecycle data for
 * @returns Record mapping entity_id to lifecycle data
 */
export async function fetchLifecycleStates(
  entityType: string,
  entityIds: string[]
): Promise<Record<string, LifecycleData>> {
  if (entityIds.length === 0) {
    return {};
  }

  const { data: lifecycleData } = await supabase
    .from('entity_lifecycle_states')
    .select('entity_id, lifecycle_state, member_count, content_count, posts_last_30_days, unique_contributors_last_30_days, last_activity_at')
    .eq('entity_type', entityType)
    .in('entity_id', entityIds);

  if (!lifecycleData) {
    return {};
  }

  return lifecycleData.reduce((acc, state) => {
    acc[state.entity_id] = state;
    return acc;
  }, {} as Record<string, LifecycleData>);
}

/**
 * Enriches an array of items with lifecycle data
 * @param items - Array of items (circles, tables, etc.)
 * @param lifecycleStates - Record of lifecycle states by entity_id
 * @returns Array of items with lifecycle fields added
 */
export function enrichWithLifecycleData<T extends { id: string }>(
  items: T[],
  lifecycleStates: Record<string, LifecycleData>
): (T & Partial<LifecycleData>)[] {
  return items.map(item => ({
    ...item,
    lifecycle_state: lifecycleStates[item.id]?.lifecycle_state,
    lifecycle_member_count: lifecycleStates[item.id]?.member_count,
    lifecycle_content_count: lifecycleStates[item.id]?.content_count,
    lifecycle_posts_last_30_days: lifecycleStates[item.id]?.posts_last_30_days,
    lifecycle_unique_contributors: lifecycleStates[item.id]?.unique_contributors_last_30_days,
    lifecycle_last_activity_at: lifecycleStates[item.id]?.last_activity_at,
  }));
}

/**
 * Convenience function that fetches and enriches in one call
 * @param entityType - The container type
 * @param items - Array of items to enrich
 * @returns Enriched items with lifecycle data
 */
export async function fetchAndEnrichLifecycle<T extends { id: string }>(
  entityType: string,
  items: T[]
): Promise<(T & Partial<LifecycleData>)[]> {
  const entityIds = items.map(item => item.id);
  const lifecycleStates = await fetchLifecycleStates(entityType, entityIds);
  return enrichWithLifecycleData(items, lifecycleStates);
}
