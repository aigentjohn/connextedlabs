import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { UserPlus, UserCheck, Users } from 'lucide-react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { toast } from 'sonner';
import { notifyNewFollower } from '@/lib/notificationHelpers';

interface FollowerUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  role: string;
  membership_tier: string;
  followed_at: string;
}

export default function FollowersPage() {
  const { userId } = useParams();
  const { profile: currentUser } = useAuth();
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [targetUser, setTargetUser] = useState<any>(null);

  // Use currentUser.id if no userId in params (viewing own followers)
  const effectiveUserId = userId || currentUser?.id;
  const isOwnProfile = effectiveUserId === currentUser?.id;

  useEffect(() => {
    if (effectiveUserId) {
      fetchFollowers();
      fetchTargetUser();
    }
  }, [effectiveUserId]);

  useEffect(() => {
    if (currentUser) {
      fetchCurrentUserFollowing();
    }
  }, [currentUser]);

  const fetchTargetUser = async () => {
    if (!effectiveUserId) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', effectiveUserId)
        .single();

      if (error) throw error;
      setTargetUser(data);
    } catch (error) {
      console.error('Error fetching target user:', error);
    }
  };

  const fetchFollowers = async () => {
    if (!effectiveUserId) return;

    setLoading(true);
    try {
      const { data: connectionsData, error } = await supabase
        .from('user_connections')
        .select(`
          created_at,
          follower:follower_id (
            id,
            name,
            email,
            avatar,
            bio,
            role,
            membership_tier
          )
        `)
        .eq('following_id', effectiveUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const followersList = connectionsData
        ?.map((conn: any) => ({
          ...conn.follower,
          followed_at: conn.created_at,
        }))
        .filter((user: any) => user.id) || [];

      setFollowers(followersList);
    } catch (error) {
      console.error('Error fetching followers:', error);
      toast.error('Failed to load followers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserFollowing = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('user_connections')
        .select('following_id')
        .eq('follower_id', currentUser.id);

      if (error) throw error;

      const followingSet = new Set(data?.map(conn => conn.following_id) || []);
      setFollowing(followingSet);
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  const handleToggleFollow = async (targetUserId: string) => {
    if (!currentUser) return;

    const isCurrentlyFollowing = following.has(targetUserId);

    try {
      if (isCurrentlyFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_connections')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetUserId);

        if (error) throw error;

        setFollowing(prev => {
          const newSet = new Set(prev);
          newSet.delete(targetUserId);
          return newSet;
        });
        toast.success('Unfollowed user');
      } else {
        // Follow
        const { error } = await supabase
          .from('user_connections')
          .insert({
            follower_id: currentUser.id,
            following_id: targetUserId,
          });

        if (error) throw error;

        setFollowing(prev => new Set([...prev, targetUserId]));
        toast.success('Now following user');
        // Notify the target user
        await notifyNewFollower(
          targetUserId,
          currentUser.id,
          currentUser.name || 'Someone'
        );
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      toast.error(error.message || 'Failed to update follow status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading followers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: isOwnProfile ? 'My Profile' : 'Members', path: isOwnProfile ? '/profile' : '/members' },
          { label: 'Followers' }
        ]}
        icon={Users}
        iconBg="bg-indigo-100"
        iconColor="text-indigo-600"
        title={isOwnProfile ? 'My Followers' : `${targetUser?.name}'s Followers`}
        description={`${followers.length} ${followers.length === 1 ? 'follower' : 'followers'}`}
      />

      {/* Followers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {followers.map((follower) => {
          const isFollowing = following.has(follower.id);
          const isCurrentUser = follower.id === currentUser?.id;

          return (
            <Card key={follower.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Link to={`/users/${follower.id}`}>
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={follower.avatar || undefined} />
                      <AvatarFallback className="text-lg">{follower.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link to={`/users/${follower.id}`} className="hover:text-indigo-600">
                      <h3 className="font-semibold truncate">{follower.name}</h3>
                    </Link>
                    <p className="text-sm text-gray-600 truncate">{follower.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {follower.membership_tier}
                      </Badge>
                    </div>
                    {follower.bio && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{follower.bio}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Followed {new Date(follower.followed_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {!isCurrentUser && currentUser && (
                  <div className="mt-4">
                    <Button
                      variant={isFollowing ? 'outline' : 'default'}
                      size="sm"
                      className="w-full"
                      onClick={() => handleToggleFollow(follower.id)}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-4 h-4 mr-2" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Follow Back
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {followers.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No followers yet</h3>
            <p className="text-gray-500">
              {isOwnProfile 
                ? 'Share great content and engage with the community to gain followers!' 
                : 'This user doesn\'t have any followers yet.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}