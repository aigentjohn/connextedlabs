import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import ContainerCard from '@/app/components/shared/ContainerCard';
import { CONTAINER_TYPES } from '@/lib/container-types';
import { fetchAndEnrichLifecycle, type LifecycleState } from '@/lib/lifecycle-helpers';
import LifecycleFilter from '@/app/components/shared/LifecycleFilter';
import { PageHeader } from '@/app/components/shared/PageHeader';

interface Circle {
  id: string;
  name: string;
  description: string;
  category?: string;
  image: string | null;
  access_type: 'open' | 'request' | 'invite';
  member_ids: string[];
  admin_ids: string[];
  tags?: string[];
  is_favorited?: boolean;
  guest_access?: {
    feed?: boolean;
    members?: boolean;
    documents?: boolean;
    forum?: boolean;
    checklists?: boolean;
    reviews?: boolean;
    calendar?: boolean;
  } | null;
  // Lifecycle data
  lifecycle_state?: 'idea' | 'created' | 'released' | 'active' | 'engaged' | 'stale';
  member_count?: number;
  content_count?: number;
  posts_last_30_days?: number;
  unique_contributors_last_30_days?: number;
  last_activity_at?: string;
}

interface CircleMembershipStatus {
  circle_id: string;
  status: 'invited' | 'applied' | 'approved' | 'enrolled' | 'completed' | 'not_completed';
}

export default function CirclesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [circles, setCircles] = useState<Circle[]>([]);
  const [admins, setAdmins] = useState<Record<string, any[]>>({});
  const [membershipStatuses, setMembershipStatuses] = useState<Record<string, CircleMembershipStatus['status']>>({});
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleState | 'all'>('all');

  useEffect(() => {
    fetchCircles();
  }, []);

  const fetchCircles = async () => {
    try {
      // Fetch circles data
      const { data, error } = await supabase
        .from('circles')
        .select('id, name, description, image, access_type, member_ids, admin_ids, guest_access')
        .order('name');

      if (error) throw error;
      
      const circlesData = data || [];
      
      // Fetch lifecycle states for all circles
      const enrichedCircles = await fetchAndEnrichLifecycle('circles', circlesData);
      
      // Fetch favorites for current user
      if (profile?.id) {
        const { data: favoritesData } = await supabase
          .from('content_favorites')
          .select('content_id')
          .eq('user_id', profile.id)
          .eq('content_type', 'circle');
        
        const favoritedIds = new Set(favoritesData?.map(f => f.content_id) || []);
        
        // Add is_favorited flag to each circle
        enrichedCircles.forEach(circle => {
          circle.is_favorited = favoritedIds.has(circle.id);
        });
      }
      
      setCircles(enrichedCircles);
      
      // Fetch membership statuses for current user
      if (profile?.id) {
        const { data: membershipData } = await supabase
          .from('circle_members')
          .select('circle_id, status')
          .eq('user_id', profile.id);
        
        if (membershipData) {
          const statusMap: Record<string, CircleMembershipStatus['status']> = {};
          membershipData.forEach(m => {
            // Map database status to membership state
            let mappedStatus: CircleMembershipStatus['status'];
            switch (m.status) {
              case 'active':
                mappedStatus = 'enrolled';
                break;
              case 'pending':
                mappedStatus = 'applied';
                break;
              case 'invited':
                mappedStatus = 'invited';
                break;
              default:
                mappedStatus = m.status as CircleMembershipStatus['status'];
            }
            statusMap[m.circle_id] = mappedStatus;
          });
          setMembershipStatuses(statusMap);
        }
      }
      
      // Fetch admin profiles for all circles
      const allAdminIds = new Set<string>();
      circlesData.forEach(circle => {
        if (circle.admin_ids) {
          circle.admin_ids.forEach(id => allAdminIds.add(id));
        }
      });
      
      if (allAdminIds.size > 0) {
        const { data: profiles } = await supabase
          .from('users')
          .select('id, name')
          .in('id', Array.from(allAdminIds));
        
        if (profiles) {
          // Map profiles to circles
          const adminsMap: Record<string, any[]> = {};
          circlesData.forEach(circle => {
            if (circle.admin_ids && circle.admin_ids.length > 0) {
              adminsMap[circle.id] = profiles.filter(p => circle.admin_ids.includes(p.id));
            }
          });
          setAdmins(adminsMap);
        }
      }
    } catch (error) {
      console.error('Error fetching circles:', error);
      toast.error('Failed to load circles');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading circles...</div>
      </div>
    );
  }

  const filteredCircles = circles.filter((circle) => {
    // Apply search filter
    const query = searchQuery.toLowerCase();
    const matchesSearch = circle.name.toLowerCase().includes(query) ||
      circle.description.toLowerCase().includes(query) ||
      circle.tags?.some((tag) => tag.toLowerCase().includes(query));
    
    if (!matchesSearch) return false;
    
    // Apply lifecycle filter
    if (lifecycleFilter !== 'all' && circle.lifecycle_state !== lifecycleFilter) {
      return false;
    }
    
    return true;
  });

  const handleJoinCircle = async (circleId: string) => {
    const circle = circles.find(c => c.id === circleId);
    if (!circle) return;

    if (circle.access_type === 'invite') {
      toast.error('This is an invite-only circle');
      return;
    }

    if (circle.access_type === 'request') {
      // Create a pending request in circle_members table
      try {
        const { error } = await supabase
          .from('circle_members')
          .insert({
            circle_id: circleId,
            user_id: profile.id,
            status: 'pending'
          });

        if (error) throw error;

        // Update local membership status
        setMembershipStatuses({
          ...membershipStatuses,
          [circleId]: 'applied'
        });

        toast.success('Join request sent! Waiting for admin approval');
      } catch (error) {
        console.error('Error submitting join request:', error);
        toast.error('Failed to submit join request');
      }
      return;
    }

    // Handle open circles
    try {
      // Add user to circle via circle_members table
      const { error: memberError } = await supabase
        .from('circle_members')
        .insert({
          circle_id: circleId,
          user_id: profile.id,
          status: 'active'
        });

      if (memberError) throw memberError;

      // Also update the member_ids array for backward compatibility
      const updatedMemberIds = [...circle.member_ids, profile.id];
      const { error: circleError } = await supabase
        .from('circles')
        .update({ member_ids: updatedMemberIds })
        .eq('id', circleId);

      if (circleError) throw circleError;

      // Update local state
      setCircles(circles.map(c => 
        c.id === circleId ? { ...c, member_ids: updatedMemberIds } : c
      ));
      
      setMembershipStatuses({
        ...membershipStatuses,
        [circleId]: 'enrolled'
      });

      toast.success(`You've joined ${circle.name}!`);
    } catch (error) {
      console.error('Error joining circle:', error);
      toast.error('Failed to join circle');
    }
  };

  const handleRequestToJoin = async (circleId: string) => {
    await handleJoinCircle(circleId); // Reuse the same logic
  };

  const handleWithdrawApplication = async (circleId: string) => {
    try {
      const { error } = await supabase
        .from('circle_members')
        .delete()
        .eq('circle_id', circleId)
        .eq('user_id', profile.id)
        .eq('status', 'pending');

      if (error) throw error;

      // Remove from local state
      const newStatuses = { ...membershipStatuses };
      delete newStatuses[circleId];
      setMembershipStatuses(newStatuses);

      toast.success('Application withdrawn');
    } catch (error) {
      console.error('Error withdrawing application:', error);
      toast.error('Failed to withdraw application');
    }
  };

  const handleAcceptInvite = async (circleId: string) => {
    const circle = circles.find(c => c.id === circleId);
    if (!circle) return;

    try {
      // Update status to active
      const { error: updateError } = await supabase
        .from('circle_members')
        .update({ status: 'active' })
        .eq('circle_id', circleId)
        .eq('user_id', profile.id);

      if (updateError) throw updateError;

      // Also update the member_ids array for backward compatibility
      const updatedMemberIds = [...circle.member_ids, profile.id];
      const { error: circleError } = await supabase
        .from('circles')
        .update({ member_ids: updatedMemberIds })
        .eq('id', circleId);

      if (circleError) throw circleError;

      // Update local state
      setCircles(circles.map(c => 
        c.id === circleId ? { ...c, member_ids: updatedMemberIds } : c
      ));
      
      setMembershipStatuses({
        ...membershipStatuses,
        [circleId]: 'enrolled'
      });

      toast.success(`Welcome to ${circle.name}!`);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
    }
  };

  const handleDeclineInvite = async (circleId: string) => {
    try {
      const { error } = await supabase
        .from('circle_members')
        .delete()
        .eq('circle_id', circleId)
        .eq('user_id', profile.id)
        .eq('status', 'invited');

      if (error) throw error;

      // Remove from local state
      const newStatuses = { ...membershipStatuses };
      delete newStatuses[circleId];
      setMembershipStatuses(newStatuses);

      toast.success('Invitation declined');
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error('Failed to decline invitation');
    }
  };

  const handleLeaveCircle = async (circleId: string) => {
    const circle = circles.find(c => c.id === circleId);
    if (!circle) return;

    try {
      // Remove from circle_members table
      const { error: memberError } = await supabase
        .from('circle_members')
        .delete()
        .eq('circle_id', circleId)
        .eq('user_id', profile.id);

      if (memberError) throw memberError;

      // Update member_ids array for backward compatibility
      const updatedMemberIds = circle.member_ids.filter((id) => id !== profile.id);
      const { error: circleError } = await supabase
        .from('circles')
        .update({ member_ids: updatedMemberIds })
        .eq('id', circleId);

      if (circleError) throw circleError;

      // Update local state
      setCircles(circles.map(c => 
        c.id === circleId ? { ...c, member_ids: updatedMemberIds } : c
      ));
      
      // Remove membership status
      const newStatuses = { ...membershipStatuses };
      delete newStatuses[circleId];
      setMembershipStatuses(newStatuses);

      toast.success(`You've left ${circle.name}`);
    } catch (error) {
      console.error('Error leaving circle:', error);
      toast.error('Failed to leave circle');
    }
  };

  const isMember = (circleId: string) => {
    const circle = circles.find(c => c.id === circleId);
    return circle?.member_ids.includes(profile.id);
  };

  const handleFavoriteUpdate = (circleId: string, isFavorited: boolean) => {
    setCircles(circles.map(c => 
      c.id === circleId ? { ...c, is_favorited: isFavorited } : c
    ));
  };

  const config = CONTAINER_TYPES.circles;
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Circles' }]}
        icon={config.icon}
        iconBg={config.color}
        iconColor={config.iconColor}
        title="Discover Circles"
        description="Find and join communities that match your interests"
      />

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search circles by name, topic, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lifecycle Filter */}
      <LifecycleFilter
        value={lifecycleFilter}
        onChange={setLifecycleFilter}
      />

      {/* Circles Grid */}
      {filteredCircles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No circles found matching your search</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCircles.map((circle) => {
            const isUserMember = isMember(circle.id);
            const circleAdmins = admins[circle.id] || [];
            const adminNames = circleAdmins.map(a => a.name);
            const membershipState = membershipStatuses[circle.id];
            
            return (
              <ContainerCard
                key={circle.id}
                id={circle.id}
                type="circles"
                name={circle.name}
                description={circle.description}
                category={circle.category}
                link={`/circles/${circle.id}`}
                memberCount={circle.member_ids.length}
                adminNames={adminNames}
                tags={circle.tags}
                isFavorited={circle.is_favorited}
                lifecycleState={circle.lifecycle_state}
                accessType={circle.access_type}
                membershipState={membershipState}
                currentUserId={profile?.id}
                isMember={isUserMember}
                onJoin={() => handleJoinCircle(circle.id)}
                onLeave={() => handleLeaveCircle(circle.id)}
                onRequestToJoin={() => handleRequestToJoin(circle.id)}
                onFavoriteUpdate={handleFavoriteUpdate}
                joinDisabled={circle.access_type === 'invite'}
                joinLabel={circle.access_type === 'request' ? 'Request' : 'Join'}
                onWithdrawApplication={() => handleWithdrawApplication(circle.id)}
                onAcceptInvite={() => handleAcceptInvite(circle.id)}
                onDeclineInvite={() => handleDeclineInvite(circle.id)}
                customBadge={
                  circle.guest_access && Object.values(circle.guest_access).some(Boolean)
                    ? { label: 'Public', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
                    : undefined
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}