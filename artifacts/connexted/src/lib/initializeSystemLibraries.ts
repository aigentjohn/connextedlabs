import { supabase } from './supabase';
import { logError } from '@/lib/error-handler';

/**
 * Initialize system libraries that should exist for all users
 * This function is idempotent - safe to call multiple times
 * 
 * Calls a database function with elevated privileges to create system libraries.
 * The migration should have already created these, but this is a safety fallback.
 */
export async function initializeSystemLibraries() {
  try {
    // Call the database function that creates system libraries with elevated privileges
    const { data, error } = await supabase.rpc('initialize_system_libraries');

    if (error) {
      logError('Error calling initialize_system_libraries function:', error, { component: 'initializeSystemLibraries' });
      return { success: false, error };
    }

    const createdCount = data?.[0]?.created_count || 0;
    
    if (createdCount > 0) {
      console.log(`Created ${createdCount} system libraries`);
    } else {
      console.log('All system libraries already exist');
    }

    return { success: true, createdCount };
  } catch (error) {
    logError('Error initializing system libraries:', error, { component: 'initializeSystemLibraries' });
    return { success: false, error };
  }
}
