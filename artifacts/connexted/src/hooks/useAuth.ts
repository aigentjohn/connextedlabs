/**
 * Re-export useAuth from auth-context
 * 
 * This exists so hooks can import from '@/hooks/useAuth'
 * while the actual implementation lives in '@/lib/auth-context'.
 */
export { useAuth } from '@/lib/auth-context';
