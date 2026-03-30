/**
 * Centralized Error Handling Utility
 * 
 * Provides consistent error handling across the application
 * with user-friendly messages and detailed logging.
 */

import { toast } from 'sonner';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: any;
}

export class AppError extends Error {
  context: ErrorContext;
  isUserFacing: boolean;
  
  constructor(message: string, context: ErrorContext = {}, isUserFacing = true) {
    super(message);
    this.name = 'AppError';
    this.context = context;
    this.isUserFacing = isUserFacing;
  }
}

/**
 * Handle network/fetch errors
 */
export function handleFetchError(error: any, context: ErrorContext = {}): void {
  console.error(`[Fetch Error] ${context.component || 'Unknown'}.${context.action || 'Unknown'}:`, error);
  
  // Check if it's a network error
  if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
    // Network unavailable - likely offline or CORS issue
    toast.error('Network Error', {
      description: 'Unable to connect to the server. Please check your internet connection.',
    });
    return;
  }
  
  // Check for specific HTTP errors
  if (error.status) {
    switch (error.status) {
      case 401:
        toast.error('Authentication Error', {
          description: 'Your session has expired. Please log in again.',
        });
        break;
      case 403:
        toast.error('Access Denied', {
          description: 'You do not have permission to perform this action.',
        });
        break;
      case 404:
        toast.error('Not Found', {
          description: 'The requested resource was not found.',
        });
        break;
      case 500:
        toast.error('Server Error', {
          description: 'An unexpected server error occurred. Please try again later.',
        });
        break;
      default:
        toast.error('Error', {
          description: error.message || 'An unexpected error occurred.',
        });
    }
    return;
  }
  
  // Generic error
  toast.error('Error', {
    description: error.message || 'An unexpected error occurred. Please try again.',
  });
}

/**
 * Handle Supabase errors
 */
export function handleSupabaseError(error: any, context: ErrorContext = {}): void {
  console.error(`[Supabase Error] ${context.component || 'Unknown'}.${context.action || 'Unknown'}:`, error);
  
  // Check for network errors
  if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
    // Don't show toast for network errors during auth - they auto-retry
    if (context.action !== 'fetchProfile' && context.action !== 'fetchPermissions') {
      toast.error('Network Error', {
        description: 'Unable to connect. Please check your internet connection.',
      });
    }
    return;
  }
  
  // Check for specific Postgres errors
  if (error.code) {
    switch (error.code) {
      case 'PGRST204':
      case 'PGRST205':
        // No rows returned - this might be expected
        console.log('No data found (this may be expected)');
        break;
      case '42P01':
        // Table doesn't exist
        toast.error('Configuration Error', {
          description: 'Some features are not yet configured. Please contact support.',
        });
        break;
      case '23505':
        // Unique constraint violation
        toast.error('Duplicate Entry', {
          description: 'This item already exists.',
        });
        break;
      case '23503':
        // Foreign key violation
        toast.error('Reference Error', {
          description: 'Cannot complete this action due to related data.',
        });
        break;
      default:
        toast.error('Database Error', {
          description: error.message || 'A database error occurred.',
        });
    }
    return;
  }
  
  // Generic Supabase error
  toast.error('Error', {
    description: error.message || 'An unexpected error occurred.',
  });
}

/**
 * Safe fetch wrapper with automatic error handling
 */
export async function safeFetch(
  url: string,
  options: RequestInit = {},
  context: ErrorContext = {}
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        ...errorData,
      };
    }
    
    return response;
  } catch (error: any) {
    handleFetchError(error, context);
    throw error;
  }
}

/**
 * Log error for debugging (console only, no user notification)
 */
export function logError(message: string, error: any, context: ErrorContext = {}): void {
  console.error(`[Error] ${message}`, {
    error,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle async errors in event handlers
 */
export function handleAsyncError(error: any, context: ErrorContext = {}): void {
  // Silently ignore clipboard permission errors - they're expected in some browsers
  if (error.name === 'NotAllowedError' && error.message?.includes('Clipboard')) {
    console.log('[Clipboard] Permission denied - this is expected and handled by fallback methods');
    return;
  }
  
  if (error instanceof AppError) {
    if (error.isUserFacing) {
      toast.error('Error', {
        description: error.message,
      });
    }
    console.error(`[AppError] ${context.component || 'Unknown'}:`, error.message, error.context);
  } else if (error.message?.includes('fetch')) {
    handleFetchError(error, context);
  } else {
    console.error(`[Async Error] ${context.component || 'Unknown'}:`, error);
    toast.error('Error', {
      description: error.message || 'An unexpected error occurred.',
    });
  }
}