import { supabase } from './supabase';
import { logError } from '@/lib/error-handler';

/**
 * Initialize the libraries system
 * This creates all necessary tables, indexes, and RLS policies
 * This function is idempotent - safe to call multiple times
 */
export async function initializeLibrariesSystem() {
  try {
    // Call the database function that creates the libraries system
    const { data, error } = await supabase.rpc('initialize_libraries_system');

    if (error) {
      logError('Error calling initialize_libraries_system function:', error, { component: 'initializeLibraries' });
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    logError('Error initializing libraries system:', error, { component: 'initializeLibraries' });
    return { success: false, error };
  }
}
