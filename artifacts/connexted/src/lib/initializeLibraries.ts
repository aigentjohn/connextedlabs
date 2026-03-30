import { supabase } from './supabase';

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
      console.error('Error calling initialize_libraries_system function:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error initializing libraries system:', error);
    return { success: false, error };
  }
}
