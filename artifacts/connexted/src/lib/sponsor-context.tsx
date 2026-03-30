import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

// =====================================================
// TYPES
// =====================================================

/**
 * SPONSOR ROLE HIERARCHY & PERMISSIONS
 * 
 * Roles (from highest to lowest):
 * 1. Owner - Full control, original creator of sponsor
 * 2. Director - Financial sponsor + Full admin capabilities
 * 3. Admin - Full operational control
 * 4. Member - Regular participation, no management
 * 5. Viewer - Read-only access
 * 
 * KEY PERMISSIONS:
 * - Container Management (create/delete/moderate): Owner, Director, Admin
 * - Member Management: Owner, Director, Admin
 * - Financial Responsibility: Director (special designation)
 * - Participation: All roles
 * - View-only: Viewer
 * 
 * IMPORTANT: Due to database UNIQUE(sponsor_id, user_id) constraint,
 * users can only have ONE role per sponsor. Directors have been given
 * all admin capabilities so they can manage operations while maintaining
 * their financial sponsor designation.
 */

export interface SponsorTier {
  id: string;
  tier_name: string;
  tier_level: number;
  description: string;
}

export interface SponsorTierPermission {
  id: string;
  tier_id: string;
  container_type: string;
  can_view: boolean;
  can_create: boolean;
  max_count: number;
}

export interface SponsorMembership {
  id: string;
  sponsor_id: string;
  user_id: string;
  role: 'owner' | 'director' | 'admin' | 'member' | 'viewer';
  invited_by: string | null;
  joined_at: string;
  sponsor: {
    id: string;
    name: string;
    slug: string;
    tier_id: string | null;
    tier?: SponsorTier;
  };
}

export interface SponsorPermissions {
  sponsor_id: string;
  sponsor_name: string;
  tier_name: string;
  permissions: SponsorTierPermission[];
  current_counts: {
    container_type: string;
    count: number;
  }[];
}

interface SponsorContextType {
  memberships: SponsorMembership[];
  permissions: SponsorPermissions[];
  loading: boolean;
  isSponsorMember: boolean;
  canCreateContainer: (sponsorId: string, containerType: string) => boolean;
  canManageSponsor: (sponsorId: string) => boolean;
  isDirector: (sponsorId: string) => boolean;
  getPermissionsForSponsor: (sponsorId: string) => SponsorPermissions | null;
  refreshMemberships: () => Promise<void>;
}

// =====================================================
// CONTEXT
// =====================================================

const SponsorContext = createContext<SponsorContextType | undefined>(undefined);

// =====================================================
// PROVIDER
// =====================================================

export function SponsorProvider({ children }: { children: ReactNode }) {
  // Guard against missing auth context during hot reload
  let profile = null;
  try {
    const auth = useAuth();
    profile = auth.profile;
  } catch (error) {
    // Auth context not yet available during initial render/hot reload
    // This is expected and will resolve on next render
  }
  
  const [memberships, setMemberships] = useState<SponsorMembership[]>([]);
  const [permissions, setPermissions] = useState<SponsorPermissions[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchSponsorData();
    } else {
      setMemberships([]);
      setPermissions([]);
      setLoading(false);
    }
  }, [profile?.id]);

  const fetchSponsorData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Fetch user's sponsor memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from('sponsor_members')
        .select(`
          id,
          sponsor_id,
          user_id,
          role,
          invited_by,
          joined_at,
          sponsor:sponsors (
            id,
            name,
            slug,
            tier_id,
            tier:sponsor_tiers (
              id,
              tier_name,
              tier_level,
              description
            )
          )
        `)
        .eq('user_id', profile.id);

      if (membershipError) throw membershipError;

      // Transform the data to match our interface
      const transformedMemberships: SponsorMembership[] = (membershipData || []).map((m: any) => ({
        id: m.id,
        sponsor_id: m.sponsor_id,
        user_id: m.user_id,
        role: m.role,
        invited_by: m.invited_by,
        joined_at: m.joined_at,
        sponsor: {
          id: m.sponsor.id,
          name: m.sponsor.name,
          slug: m.sponsor.slug,
          tier_id: m.sponsor.tier_id,
          tier: m.sponsor.tier,
        },
      }));

      setMemberships(transformedMemberships);

      // Fetch permissions for each sponsor the user belongs to
      const permissionsPromises = transformedMemberships.map(async (membership) => {
        if (!membership.sponsor.tier_id) return null;

        // Get tier permissions
        const { data: tierPerms, error: permsError } = await supabase
          .from('sponsor_tier_permissions')
          .select('*')
          .eq('tier_id', membership.sponsor.tier_id);

        if (permsError) throw permsError;

        // Get current container counts for this sponsor
        // Note: Only count container types that support sponsor_id
        // standups uses community_id, checklists/sprints are platform-wide, libraries uses owner_type/owner_id
        const containerTypes = ['tables', 'elevators', 'meetings', 'pitches', 'builds', 'meetups'];
        
        const countPromises = containerTypes.map(async (type) => {
          try {
            const { count, error } = await supabase
              .from(type)
              .select('*', { count: 'exact', head: true })
              .eq('sponsor_id', membership.sponsor_id);

            if (error) {
              console.error(`Error counting ${type}:`, error);
              return { container_type: type, count: 0 };
            }

            return { container_type: type, count: count || 0 };
          } catch (error) {
            // Silently handle errors for tables that might not exist
            console.error(`Error counting ${type}:`, error);
            return { container_type: type, count: 0 };
          }
        });

        const counts = await Promise.all(countPromises);

        return {
          sponsor_id: membership.sponsor_id,
          sponsor_name: membership.sponsor.name,
          tier_name: membership.sponsor.tier?.tier_name || 'Unknown',
          permissions: tierPerms || [],
          current_counts: counts,
        };
      });

      const permissionsData = await Promise.all(permissionsPromises);
      setPermissions(permissionsData.filter((p): p is SponsorPermissions => p !== null));
    } catch (error) {
      console.error('Error fetching sponsor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshMemberships = async () => {
    await fetchSponsorData();
  };

  const isSponsorMember = memberships.length > 0;

  const canCreateContainer = (sponsorId: string, containerType: string): boolean => {
    const sponsorPerms = permissions.find((p) => p.sponsor_id === sponsorId);
    if (!sponsorPerms) return false;

    const perm = sponsorPerms.permissions.find((p) => p.container_type === containerType);
    if (!perm || !perm.can_create) return false;

    const currentCount = sponsorPerms.current_counts.find((c) => c.container_type === containerType)?.count || 0;
    return currentCount < perm.max_count;
  };

  const canManageSponsor = (sponsorId: string): boolean => {
    const membership = memberships.find((m) => m.sponsor_id === sponsorId);
    if (!membership) return false;

    // Director has all admin capabilities (financial sponsor should have operational control)
    return membership.role === 'owner' || membership.role === 'admin' || membership.role === 'director';
  };

  const isDirector = (sponsorId: string): boolean => {
    const membership = memberships.find((m) => m.sponsor_id === sponsorId);
    if (!membership) return false;

    return membership.role === 'director';
  };

  const getPermissionsForSponsor = (sponsorId: string): SponsorPermissions | null => {
    return permissions.find((p) => p.sponsor_id === sponsorId) || null;
  };

  const value: SponsorContextType = {
    memberships,
    permissions,
    loading,
    isSponsorMember,
    canCreateContainer,
    canManageSponsor,
    isDirector,
    getPermissionsForSponsor,
    refreshMemberships,
  };

  return <SponsorContext.Provider value={value}>{children}</SponsorContext.Provider>;
}

// =====================================================
// HOOK
// =====================================================

export function useSponsor() {
  const context = useContext(SponsorContext);
  if (context === undefined) {
    throw new Error('useSponsor must be used within a SponsorProvider');
  }
  return context;
}