import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { UserMinus, Users } from 'lucide-react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { toast } from 'sonner';

interface FollowingUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  role: string;
  membership_tier: string;
  followed_at: string;
}

export default function FollowingPage() {
  const { userId } = useParams();
  const { profile: currentUser } = useAuth();
  const [followingList, setFollowingList] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetUser, setTargetUser] = useState<any>(null);

  // Use currentUser.id if no userId in params (viewing own following)
  const effectiveUserId = userId || currentUser?.id;
  const isOwnProfile = effectiveUserId === currentUser?.id;

  useEffect(() => {
    if (effectiveUserId) {
      fetchFollowing();
      fetchTargetUser();
    }
  }, [effectiveUserId]);

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

  const fetchFollowing = async () => {
    if (!effectiveUserId) return;

    setLoading(true);
    try {
      const { data: connectionsData, error } = await supabase
        .from('user_connections')
        .select(`
          created_at,
          following:following_id (
            id,
            name,
            email,
            avatar,
            bio,
            role,
            membership_tier
          )
        `)
        .eq('follower_id', effectiveUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const followingData = connectionsData
        ?.map((conn: any) => ({
          ...conn.following,
          followed_at: conn.created_at,
        }))
        .filter((user: any) => user.id) || [];

      setFollowingList(followingData);
    } catch (error) {
      console.error('Error fetching following:', error);
      toast.error('Failed to load following list');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetUserId);

      if (error) throw error;

      // Remove from list
      setFollowingList(prev => prev.filter(user => user.id !== targetUserId));
      toast.success('Unfollowed user');
    } catch (error: any) {
      console.error('Error unfollowing user:', error);
      toast.error(error.message || 'Failed to unfollow');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading following...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: isOwnProfile ? 'My Profile' : 'Members', path: isOwnProfile ? '/profile' : '/members' },
          { label: 'Following' }
        ]}
        icon={Users}
        iconBg="bg-indigo-100"
        iconColor="text-indigo-600"
        title={isOwnProfile ? 'Following' : `${targetUser?.name} is Following`}
        description={`${followingList.length} ${followingList.length === 1 ? 'person' : 'people'}`}
      />

      {/* Following List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {followingList.map((user) => {
          const isCurrentUser = user.id === currentUser?.id;

          return (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Link to={`/users/${user.id}`}>
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback className="text-lg">{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link to={`/users/${user.id}`} className="hover:text-indigo-600">
                      <h3 className="font-semibold truncate">{user.name}</h3>
                    </Link>
                    <p className="text-sm text-gray-600 truncate">{user.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {user.membership_tier}
                      </Badge>
                    </div>
                    {user.bio && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{user.bio}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Following since {new Date(user.followed_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {isOwnProfile && !isCurrentUser && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleUnfollow(user.id)}
                    >
                      <UserMinus className="w-4 h-4 mr-2" />
                      Unfollow
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {followingList.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Not following anyone yet</h3>
            <p className="text-gray-500">
              {isOwnProfile 
                ? 'Discover members and start following them to see their activity in your feed!' 
                : 'This user isn\'t following anyone yet.'}
            </p>
            {isOwnProfile && (
              <Link to="/members">
                <Button className="mt-4">
                  Browse Members
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}