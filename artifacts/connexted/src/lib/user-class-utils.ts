import { supabase } from '@/lib/supabase';

// Cache for user class labels
let userClassLabelsCache: Record<number, string> = {};
let cacheInitialized = false;

/**
 * Fetch all user class labels from the database
 */
export async function fetchUserClassLabels(): Promise<Record<number, string>> {
  try {
    const { data, error } = await supabase
      .from('user_classes')
      .select('class_number, display_name')
      .order('class_number');

    if (error || !data) {
      console.warn('Could not fetch user class labels, using defaults');
      return getDefaultUserClassLabels();
    }

    const labels: Record<number, string> = {};
    data.forEach((row: any) => {
      labels[row.class_number] = row.display_name;
    });

    return labels;
  } catch (err) {
    console.warn('Error fetching user class labels:', err);
    return getDefaultUserClassLabels();
  }
}

/**
 * Initialize the cache
 */
export async function initializeUserClassCache(): Promise<void> {
  if (!cacheInitialized) {
    userClassLabelsCache = await fetchUserClassLabels();
    cacheInitialized = true;
  }
}

/**
 * Get user class label for a given class number
 */
export function getUserClassLabel(classNumber: number): string {
  // If cache is initialized, use it
  if (cacheInitialized && userClassLabelsCache[classNumber]) {
    return userClassLabelsCache[classNumber];
  }

  // Otherwise fall back to defaults
  const defaults = getDefaultUserClassLabels();
  return defaults[classNumber] || `Class ${classNumber}`;
}

/**
 * Default user class labels (fallback)
 */
function getDefaultUserClassLabels(): Record<number, string> {
  return {
    1: 'Visitor',
    2: 'Guest',
    3: 'Basic User',
    4: 'Attender',
    5: 'Regular User',
    6: 'Regular User Plus',
    7: 'Power User',
    8: 'Circle Leader',
    9: 'Circle Leader Plus',
    10: 'Platform Admin',
  };
}

/**
 * Format membership tier for display
 */
export function formatMembershipTier(tier: string): string {
  const tierMap: Record<string, string> = {
    'free': 'Free',
    'member': 'Member',
    'premium': 'Premium',
  };
  return tierMap[tier.toLowerCase()] || tier;
}

/**
 * Format role for display
 */
export function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    'member': 'Member',
    'host': 'Host',
    'moderator': 'Moderator',
    'admin': 'Admin',
    'coordinator': 'Coordinator',
    'manager': 'Manager',
    'super': 'Super Admin',
  };
  return roleMap[role.toLowerCase()] || role;
}