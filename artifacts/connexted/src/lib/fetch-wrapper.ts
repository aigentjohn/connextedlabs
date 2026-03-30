/**
 * Fetch Wrapper with Better Error Handling
 * 
 * Wraps native fetch to handle common errors gracefully:
 * - Network errors (Failed to fetch)
 * - CORS errors
 * - Timeout errors
 * - Server errors
 */

export interface FetchOptions extends RequestInit {
  timeout?: number;
  silent?: boolean; // If true, don't throw on network errors
}

export class FetchError extends Error {
  constructor(
    message: string,
    public status?: number,
    public isNetworkError: boolean = false
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

/**
 * Enhanced fetch with better error handling
 */
export async function safeFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 30000, silent = false, ...fetchOptions } = options;

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return response;
  } catch (error: any) {
    // Handle different error types
    if (error.name === 'AbortError') {
      const timeoutError = new FetchError(
        'Request timeout - server took too long to respond',
        408,
        true
      );
      if (!silent) throw timeoutError;
      console.warn('Request timeout:', url);
      throw timeoutError;
    }

    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      const networkError = new FetchError(
        'Network error - server may be unavailable',
        0,
        true
      );
      if (!silent) {
        console.warn('Network error accessing:', url);
      }
      throw networkError;
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Fetch JSON with automatic error handling
 */
export async function fetchJSON<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await safeFetch(url, options);

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // If can't parse error as JSON, use status text
    }

    throw new FetchError(errorMessage, response.status, false);
  }

  return response.json();
}

/**
 * Check if error is a network/connectivity issue
 */
export function isNetworkError(error: any): boolean {
  return (
    error instanceof FetchError && error.isNetworkError ||
    error?.message === 'Failed to fetch' ||
    error?.name === 'TypeError' ||
    error?.name === 'NetworkError' ||
    error?.message?.includes('Network request failed')
  );
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: any): string {
  if (isNetworkError(error)) {
    return 'Unable to connect to server. Please check your internet connection.';
  }

  if (error instanceof FetchError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}
