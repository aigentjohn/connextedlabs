// Split candidate: ~527 lines — consider extracting AuthProvider, useAuth hook, and profile-fetch logic into separate files under /lib/auth/.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { Role, MembershipTier } from './constants/roles';
import { handleSupabaseError, logError } from './error-handler';
import { publicAnonKey, projectId } from '@/utils/supabase/info';
import { getNavItemsForUser, NAV_ITEMS_CONFIG } from '@/lib/nav-config';

// User profile type from our database
interface UserProfile {
  id: string;
  community_id: string;
  name: string;
  email: string;
  role: Role;
  membership_tier: MembershipTier;
  avatar: string | null;
  tagline: string | null;
  bio: string | null;
  location: string | null;
  interests: string[];
  badges: string[];
  has_new_notifications?: boolean;
  created_at?: string;
}

// User class permissions type
interface ContainerPermission {
  type_code: string;
  display_name: string;
  icon_name: string;
  route_path: string;
  sort_order: number;
}

interface UserClassPermissions {
  class_number: number;
  visible_containers: ContainerPermission[];
}

interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  userPermissions: UserClassPermissions | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInPasswordless: (email: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  isImpersonating: boolean;
  originalAdminProfile: UserProfile | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserClassPermissions | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalAdminProfile, setOriginalAdminProfile] = useState<UserProfile | null>(null);

  // Fetch user profile from database
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

      if (error) {
        if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
          // Network error — surface it so the UI doesn't hang silently on profile = null
          console.warn('Network error fetching profile:', error.message);
          setError('Connection issue — please refresh to try again.');
          setProfile(null);
          return;
        }
        console.error('Error fetching profile:', error);
        throw error;
      }
      
      // If no profile exists, create one
      if (!data) {
        // Get user email from auth
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          const { data: newProfile, error: insertError } = await supabase
            .from('users')
            .insert({
              id: userId,
              community_id: '550e8400-e29b-41d4-a716-446655440000', // Default community UUID
              name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
              full_name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
              email: authUser.email || '',
              role: 'member',
              membership_tier: 'free',
              avatar: null,
              tagline: null,
              bio: null,
              location: null,
              interests: [],
              badges: [],
            })
            .select()
            .single();
            
          if (insertError) {
            // If duplicate key error (profile was created by trigger), fetch it again
            if (insertError.code === '23505') {
              const { data: existingProfile, error: refetchError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
              
              if (refetchError) {
                console.error('Error refetching profile:', refetchError);
                setProfile(null);
                setError('Failed to load user profile');
              } else {
                setProfile(existingProfile);
                await fetchUserPermissions(existingProfile);
                setError(null);
              }
            } else {
              console.error('Error creating profile:', insertError);
              setProfile(null);
              setError('Failed to create user profile');
            }
          } else {
            setProfile(newProfile);
            await fetchUserPermissions(newProfile);
            setError(null);
          }
        }
      } else {
        setProfile(data);
        await fetchUserPermissions(data);
        setError(null);
      }
    } catch (error: any) {
      // Check if it's a network error
      if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
        console.warn('Network error in profile fetch:', error.message);
        setError('Connection issue - please check your internet connection');
        setProfile(null);
      } else {
        console.error('Error fetching profile:', {
          message: error.message || 'Unknown error',
          details: error.toString(),
          hint: error.hint || '',
          code: error.code || ''
        });
        setProfile(null);
        
        // Set user-friendly error message
        if (error.message?.includes('Failed to fetch')) {
          setError('Unable to connect to database. Please check your internet connection and try again.');
        } else {
          setError('Failed to load user profile. Please try refreshing the page.');
        }
      }
    }
  };

  // Fetch user class permissions
  const fetchUserPermissions = async (userProfile: UserProfile) => {
    try {
      const userClass = (userProfile as any).user_class || 1; // Default to class 1 if not set

      // Step 1: get the container_type codes this class can see.
      // Two separate queries avoids relying on a PostgREST FK join between
      // user_class_permissions.container_type and container_types.type_code.
      const { data: permsData, error: permsError } = await supabase
        .from('user_class_permissions')
        .select('container_type, sort_order')
        .eq('class_number', userClass)
        .eq('visible', true)
        .order('sort_order', { ascending: true });

      if (permsError) {
        console.warn('Could not read user_class_permissions - using default navigation.', permsError.message);
        const defaultContainers = getDefaultContainers(userClass, userProfile.role);
        setUserPermissions({ class_number: userClass, visible_containers: defaultContainers });
        return;
      }

      // If the table exists but has no rows for this class, fall back gracefully.
      if (!permsData || permsData.length === 0) {
        console.warn(`No permissions configured for class ${userClass} - using default navigation.`);
        const defaultContainers = getDefaultContainers(userClass, userProfile.role);
        setUserPermissions({ class_number: userClass, visible_containers: defaultContainers });
        return;
      }

      // Step 2: fetch display metadata for those container types.
      const typeCodes = permsData.map((p: any) => p.container_type);
      const { data: typesData, error: typesError } = await supabase
        .from('container_types')
        .select('type_code, display_name, icon_name, route_path, sort_order')
        .in('type_code', typeCodes);

      if (typesError) {
        console.warn('Could not read container_types - using default navigation.', typesError.message);
        const defaultContainers = getDefaultContainers(userClass, userProfile.role);
        setUserPermissions({ class_number: userClass, visible_containers: defaultContainers });
        return;
      }

      // Step 3: merge — preserve the sort_order from user_class_permissions.
      // If container_types DB doesn't have a row for a given permission, fall back to
      // NAV_ITEMS_CONFIG so items like 'meetings' aren't silently dropped when the
      // container_types table is partially seeded.
      const typeMap = Object.fromEntries((typesData || []).map((t: any) => [t.type_code, t]));
      const navConfigMap = Object.fromEntries(
        NAV_ITEMS_CONFIG.map(item => [item.type_code, {
          type_code:    item.type_code,
          display_name: item.display_name,
          icon_name:    item.icon_name,
          route_path:   item.route_path,
          sort_order:   item.sort_order,
        }])
      );
      const containers = permsData
        .map((p: any) => {
          const meta = typeMap[p.container_type] ?? navConfigMap[p.container_type];
          if (!meta) return null;
          return { ...meta, sort_order: p.sort_order };
        })
        .filter(Boolean);

      setUserPermissions({ class_number: userClass, visible_containers: containers });
    } catch (error) {
      console.warn('Error fetching user permissions - using defaults:', error);
      const userClass = (userProfile as any).user_class || 1;
      const defaultContainers = getDefaultContainers(userClass, userProfile.role);
      setUserPermissions({ class_number: userClass, visible_containers: defaultContainers });
    }
  };

  // Default container configurations (fallback when DB tables don't exist)
  const getDefaultContainers = (userClass: number, role: string): ContainerPermission[] =>
    getNavItemsForUser(userClass, role).map(item => ({
      type_code:    item.type_code,
      display_name: item.display_name,
      icon_name:    item.icon_name,
      route_path:   item.route_path,
      sort_order:   item.sort_order,
    }));

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    // Safety timeout: if onAuthStateChange never fires (stale/corrupted token
    // causing an infinite refresh loop in localStorage), force loading to false
    // and sign out to clear the bad token rather than hanging forever.
    const loadingTimeout = setTimeout(() => {
      if (!mounted) return;
      setLoading((prev) => {
        if (prev) {
          // Still loading after 10s — clear bad token and unblock the UI
          console.warn('Auth loading timed out after 10s — clearing session');
          supabase.auth.signOut().catch(() => {});
        }
        return false;
      });
    }, 10_000);

    // Use onAuthStateChange as the SOLE source of session truth.
    //
    // Why: calling getSession() *and* onAuthStateChange() concurrently causes
    // both to compete for the same IndexedDB lock ("lock:sb-...-auth-token").
    // In React Strict Mode the effect fires twice (mount → unmount → remount),
    // so the first getSession() still holds the lock when the second mount
    // tries to acquire it — triggering the 5 s timeout + forced steal warning.
    //
    // onAuthStateChange fires immediately with event "INITIAL_SESSION" on the
    // first call, providing the current session without a separate getSession()
    // call.  This keeps exactly one lock holder at a time.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }

      // Mark loading done after the first event (INITIAL_SESSION or otherwise)
      clearTimeout(loadingTimeout);
      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        if (error.message?.includes('Failed to fetch')) {
          setError('Unable to connect to authentication service. Please check your internet connection.');
        }
      }
      
      return { error };
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError('Unable to sign in. Please try again.');
      return { error: error as Error };
    }
  };

  // Sign in with passwordless magic link
  const signInPasswordless = async (email: string) => {
    try {
      setError(null);
      
      // Get the current origin to ensure proper redirect
      const redirectUrl = window.location.origin + '/home';
      
      console.log('Sending magic link with redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      
      if (error) {
        if (error.message?.includes('Failed to fetch')) {
          setError('Unable to connect to authentication service. Please check your internet connection.');
        }
        console.error('Passwordless sign in error:', error);
        return { error };
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Passwordless sign in error:', error);
      setError('Unable to send magic link. Please try again.');
      return { error: error as Error };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, name: string) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name, // Pass name in metadata for the trigger
          },
        },
      });

      if (error) {
        if (error.message?.includes('Failed to fetch')) {
          setError('Unable to connect to authentication service. Please check your internet connection.');
        }
        return { error };
      }

      // If signup was successful, manually create the profile as a fallback
      // in case the database trigger doesn't exist
      if (data.user) {
        try {
          // Check if profile already exists (created by trigger)
          const { data: existingProfile } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.user.id)
            .maybeSingle(); // Use maybeSingle to avoid errors

          // If no profile exists, create one
          if (!existingProfile) {
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                community_id: '550e8400-e29b-41d4-a716-446655440000', // Default community UUID
                name: name,
                full_name: name,
                email: email,
                role: 'member',
                membership_tier: 'free',
                avatar: null,
                tagline: null,
                bio: null,
                location: null,
                interests: [],
                badges: [],
              });

            // Ignore duplicate key errors (profile was created by trigger)
            if (insertError && insertError.code !== '23505') {
              console.error('Error creating user profile:', insertError);
            }
          }

          // ALWAYS create moments and portfolio via server endpoint
          // This bypasses RLS using the service role key
          // We call this regardless of whether profile existed or not
          try {
            const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/users/${data.user.id}/create-moments`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${publicAnonKey}`,
                },
              }
            );

            const result = await response.json();
            if (!result.success) {
              console.warn('Failed to create user containers:', result);
              // Don't fail signup if container creation fails
            } else {
              console.log('User containers created successfully:', {
                moments: result.moments,
                portfolio: result.portfolio
              });
            }
          } catch (containersError) {
            console.warn('Error calling create-moments endpoint:', containersError);
            // Don't fail signup if container creation fails
          }
        } catch (profileError) {
          console.error('Error checking/creating profile:', profileError);
        }
      }

      return { error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      setError('Unable to sign up. Please try again.');
      return { error: error as Error };
    }
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setError(null);
    setIsImpersonating(false);
    setOriginalAdminProfile(null);
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // Impersonate user
  const impersonateUser = async (userId: string) => {
    // Only super admins can impersonate
    if (!profile || profile.role !== 'super') {
      setError('Only super admins can impersonate users');
      return;
    }

    try {
      // Save original admin profile
      setOriginalAdminProfile(profile);

      // Fetch the user to impersonate
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        await fetchUserPermissions(data);
        setIsImpersonating(true);
      }
    } catch (error: any) {
      console.error('Error impersonating user:', error);
      setError('Failed to impersonate user');
    }
  };

  // Stop impersonation
  const stopImpersonation = async () => {
    if (!originalAdminProfile) {
      setError('No impersonation to stop');
      return;
    }

    // Restore original admin profile
    setProfile(originalAdminProfile);
    await fetchUserPermissions(originalAdminProfile);
    setIsImpersonating(false);
    setOriginalAdminProfile(null);
  };

  const value = {
    user,
    profile,
    session,
    loading,
    error,
    userPermissions,
    signIn,
    signInPasswordless,
    signUp,
    signOut,
    refreshProfile,
    impersonateUser,
    stopImpersonation,
    isImpersonating,
    originalAdminProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}