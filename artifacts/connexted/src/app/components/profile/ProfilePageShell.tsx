/**
 * ProfilePageShell - Shared wrapper for the 4 profile sub-pages.
 *
 * Provides the common header card (avatar, name, badges, connections)
 * and breadcrumb, without ProfileStatsCards or ProfileCompletionScore.
 *
 * Each profile page (My Basics, My Professional, My Engagement, My Account)
 * uses useAuth() directly for profile data and renders its own tabs as children.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { useUserBadges } from '@/hooks/useBadges';
import { ProfileHeaderCard } from '@/app/components/profile/ProfileHeaderCard';

interface ProfilePageShellProps {
  /** Breadcrumb label for this section */
  sectionLabel: string;
  /** Page-specific content (tabs etc.) */
  children: React.ReactNode;
}

export function ProfilePageShell({ sectionLabel, children }: ProfilePageShellProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Badges
  const { badges: userBadges } = useUserBadges(profile?.id || null);

  // Connection counts (lightweight, needed for header)
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const fetchHeaderData = async () => {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('followers_count, following_count')
          .eq('id', profile.id)
          .single();

        if (userData) {
          setFollowersCount(userData.followers_count || 0);
          setFollowingCount(userData.following_count || 0);
        }
      } catch (error) {
        console.error('Error fetching header data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHeaderData();
  }, [profile]);

  if (!profile) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'My Basics', href: '/my-basics' },
          { label: sectionLabel },
        ]}
      />

      {/* Profile Header */}
      <ProfileHeaderCard
        profile={profile}
        bio={profile.bio || ''}
        followersCount={followersCount}
        followingCount={followingCount}
        userBadges={userBadges}
        onNavigateHome={() => navigate('/home')}
        onScrollToMembership={() => navigate('/my-account')}
      />

      {/* Page-specific content */}
      {children}
    </div>
  );
}
