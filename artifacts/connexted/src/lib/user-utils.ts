/**
 * User Utility Functions
 * 
 * Helper functions to safely access user name fields with proper fallbacks.
 * This handles the migration from legacy 'name' field to 'full_name' + 'display_name'.
 */

export interface UserProfile {
  id: string;
  name?: string;         // Legacy field (will be deprecated)
  full_name?: string;    // Preferred field - user's legal/real name
  display_name?: string; // Optional nickname/handle shown to others
  email: string;
  avatar_url?: string | null;
  avatar?: string;       // Some components use 'avatar' instead
  [key: string]: any;
}

/**
 * Get user's display name with proper fallback chain.
 * Priority: display_name → full_name → name → 'Unknown User'
 * 
 * @param user - User profile object
 * @returns The best available display name
 * 
 * @example
 * getUserDisplayName({ full_name: "John Doe", display_name: "Johnny" })
 * // Returns: "Johnny"
 * 
 * getUserDisplayName({ full_name: "Jane Smith" })
 * // Returns: "Jane Smith"
 * 
 * getUserDisplayName({ name: "Bob" })
 * // Returns: "Bob" (legacy fallback)
 */
export function getUserDisplayName(user: UserProfile | null | undefined): string {
  if (!user) return 'Unknown User';
  return user.display_name || user.full_name || user.name || 'Unknown User';
}

/**
 * Get user's full legal name with fallback.
 * Priority: full_name → name → 'Unknown User'
 * 
 * @param user - User profile object
 * @returns The user's full legal name
 * 
 * @example
 * getUserFullName({ full_name: "John Doe", display_name: "Johnny" })
 * // Returns: "John Doe"
 */
export function getUserFullName(user: UserProfile | null | undefined): string {
  if (!user) return 'Unknown User';
  return user.full_name || user.name || 'Unknown User';
}

/**
 * Get initials for avatar display with fallback.
 * Takes first character of display name or full name.
 * 
 * @param user - User profile object
 * @returns Single uppercase letter for avatar
 * 
 * @example
 * getUserInitials({ full_name: "John Doe" })
 * // Returns: "J"
 */
export function getUserInitials(user: UserProfile | null | undefined): string {
  if (!user) return '?';
  const name = getUserDisplayName(user);
  return name.charAt(0).toUpperCase();
}

/**
 * Get full initials (first letter of each word) for avatar.
 * Useful for two-letter avatar displays.
 * 
 * @param user - User profile object
 * @param maxLength - Maximum number of initials (default: 2)
 * @returns Uppercase initials
 * 
 * @example
 * getUserFullInitials({ full_name: "John Michael Doe" })
 * // Returns: "JM"
 * 
 * getUserFullInitials({ full_name: "Alice" })
 * // Returns: "A"
 */
export function getUserFullInitials(
  user: UserProfile | null | undefined,
  maxLength: number = 2
): string {
  if (!user) return '?';
  
  const name = getUserFullName(user);
  const words = name.trim().split(/\s+/);
  
  return words
    .slice(0, maxLength)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
}

/**
 * Check if user has a custom display name different from their full name.
 * Useful for determining whether to show both names.
 * 
 * @param user - User profile object
 * @returns True if display_name exists and differs from full_name
 * 
 * @example
 * hasCustomDisplayName({ full_name: "John", display_name: "Johnny" })
 * // Returns: true
 * 
 * hasCustomDisplayName({ full_name: "John" })
 * // Returns: false
 */
export function hasCustomDisplayName(user: UserProfile | null | undefined): boolean {
  if (!user || !user.display_name) return false;
  return user.display_name !== user.full_name && user.display_name !== user.name;
}

/**
 * Get avatar URL with fallback handling.
 * Handles both 'avatar_url' and 'avatar' field names.
 * 
 * @param user - User profile object
 * @returns Avatar URL or undefined
 */
export function getUserAvatar(user: UserProfile | null | undefined): string | undefined {
  if (!user) return undefined;
  return user.avatar_url || user.avatar || undefined;
}

/**
 * Format user name for search indexing.
 * Returns all possible name variations for searching.
 * 
 * @param user - User profile object
 * @returns Array of searchable name strings
 * 
 * @example
 * getSearchableNames({ full_name: "John Doe", display_name: "Johnny" })
 * // Returns: ["john doe", "johnny"]
 */
export function getSearchableNames(user: UserProfile | null | undefined): string[] {
  if (!user) return [];
  
  const names: string[] = [];
  
  if (user.full_name) names.push(user.full_name.toLowerCase());
  if (user.display_name) names.push(user.display_name.toLowerCase());
  if (user.name) names.push(user.name.toLowerCase());
  
  // Remove duplicates
  return [...new Set(names)];
}

/**
 * Check if search query matches user's name.
 * Searches across all name fields.
 * 
 * @param user - User profile object
 * @param query - Search query string
 * @returns True if query matches any name field
 * 
 * @example
 * matchesNameSearch({ full_name: "John Doe" }, "john")
 * // Returns: true
 */
export function matchesNameSearch(
  user: UserProfile | null | undefined,
  query: string
): boolean {
  if (!user || !query) return false;
  
  const lowerQuery = query.toLowerCase().trim();
  const searchableNames = getSearchableNames(user);
  
  return searchableNames.some(name => name.includes(lowerQuery));
}

/**
 * Get user's name for display with optional formatting.
 * 
 * @param user - User profile object
 * @param options - Formatting options
 * @returns Formatted name string
 * 
 * @example
 * formatUserName(user, { showBothNames: true })
 * // Returns: "Johnny (John Doe)" if display_name exists
 */
export function formatUserName(
  user: UserProfile | null | undefined,
  options: {
    showBothNames?: boolean;
    showFullNameFirst?: boolean;
  } = {}
): string {
  if (!user) return 'Unknown User';
  
  const displayName = getUserDisplayName(user);
  const fullName = getUserFullName(user);
  const hasCustom = hasCustomDisplayName(user);
  
  if (!options.showBothNames || !hasCustom) {
    return displayName;
  }
  
  if (options.showFullNameFirst) {
    return `${fullName} (${displayName})`;
  } else {
    return `${displayName} (${fullName})`;
  }
}

/**
 * Validate user has required name fields.
 * Useful for form validation.
 * 
 * @param user - User profile object
 * @returns Object with validation result and message
 */
export function validateUserName(user: Partial<UserProfile>): {
  valid: boolean;
  message?: string;
} {
  if (!user.full_name && !user.name) {
    return {
      valid: false,
      message: 'Full name is required'
    };
  }
  
  const name = user.full_name || user.name || '';
  if (name.trim().length < 2) {
    return {
      valid: false,
      message: 'Name must be at least 2 characters'
    };
  }
  
  return { valid: true };
}
