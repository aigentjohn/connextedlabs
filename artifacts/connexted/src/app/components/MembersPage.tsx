import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Shield, Crown, Users, Search, Mail, MessageCircle, UserPlus, UserCheck, Zap, Briefcase } from 'lucide-react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { toast } from 'sonner';
import { notifyNewFollower } from '@/lib/notificationHelpers';

type ViewMode = 'cards' | 'table';
type SortOption = 'name' | 'company' | 'location';

export default function MembersPage() {
  const { type } = useParams<{ type?: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allCircles, setAllCircles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followLoadingIds, setFollowLoadingIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortOption, setSortOption] = useState<SortOption>('name');

  useEffect(() => {
    if (profile) {
      fetchData();
      fetchFollowingStatus();
    }
  }, [profile]);



  const fetchData = async () => {
    try {
      const [usersData, circlesData] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('circles').select('*'),
      ]);

      setAllUsers(usersData.data || []);
      setAllCircles(circlesData.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching members:', error);
      setLoading(false);
    }
  };

  const fetchFollowingStatus = async () => {
    if (!profile) return;

    try {
      const { data } = await supabase
        .from('user_connections')
        .select('following_id')
        .eq('follower_id', profile.id);

      const followingSet = new Set(data?.map((item: any) => item.following_id) || []);
      setFollowingIds(followingSet);
    } catch (error) {
      console.error('Error fetching following status:', error);
    }
  };

  const toggleFollow = async (userId: string) => {
    if (!profile) return;

    setFollowLoadingIds(prev => new Set([...prev, userId]));

    try {
      const isFollowing = followingIds.has(userId);

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_connections')
          .delete()
          .eq('follower_id', profile.id)
          .eq('following_id', userId);

        if (error) throw error;

        setFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });

        // Find the user name for toast
        const user = allUsers.find(u => u.id === userId);
        toast.success(`Unfollowed ${user?.name || 'user'}`);
      } else {
        // Follow
        const { error } = await supabase
          .from('user_connections')
          .insert({
            follower_id: profile.id,
            following_id: userId,
          });

        if (error) throw error;

        setFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.add(userId);
          return newSet;
        });

        // Find the user name for toast
        const user = allUsers.find(u => u.id === userId);
        toast.success(`Now following ${user?.name || 'user'}`);
        // Notify the user being followed
        await notifyNewFollower(
          userId,
          profile.id,
          profile.name || 'Someone'
        );
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      toast.error(error.message || 'Failed to update follow status');
    } finally {
      setFollowLoadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };


  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading members...</p>
      </div>
    );
  }

  // Categorize users
  const adminUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'super');
  const hostUsers = allUsers.filter(u => 
    allCircles.some(c => c.host_ids?.includes(u.id))
  );
  const regularUsers = allUsers.filter(u => u.role === 'member');

  // Filter based on search
  const filterUsers = (users: typeof allUsers) => {
    return users.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredAdmins = filterUsers(adminUsers);
  const filteredHosts = filterUsers(hostUsers);
  const filteredRegular = filterUsers(regularUsers);
  const filteredAll = filterUsers(allUsers);

  const getUserCircles = (userId: string) => {
    return allCircles.filter(c => c.member_ids?.includes(userId));
  };

  const getUserRole = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return null;
    if (user.role === 'super') return 'admin';
    if (allCircles.some(c => c.host_ids?.includes(userId))) return 'host';
    if (allCircles.some(c => c.moderator_ids?.includes(userId))) return 'moderator';
    return 'member';
  };

  const renderUserCard = (user: typeof allUsers[0]) => {
    const userCircles = getUserCircles(user.id);
    const role = getUserRole(user.id);
    const isCurrentUser = profile?.id === user.id;

    return (
      <Card key={user.id} className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6 relative">
          {/* WhatsApp Icon in Top Right Corner */}
          {!isCurrentUser && user.whatsapp_number && (
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 h-8 w-8 p-0"
              onClick={() => window.open(`https://wa.me/${user.whatsapp_number.replace(/[^0-9+]/g, '')}`, '_blank')}
            >
              <MessageCircle className="w-4 h-4 text-green-600" />
            </Button>
          )}
          
          <div className="flex items-start space-x-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <Link to={`/users/${user.id}`}>
                  <h3 className="font-medium hover:text-indigo-600 transition-colors">
                    {user.name}
                  </h3>
                </Link>
                {role && role !== 'member' && (
                  <Badge variant="secondary" className="capitalize">
                    {role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                    {role === 'host' && <Crown className="w-3 h-3 mr-1" />}
                    {role}
                  </Badge>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-2">
                {user.bio || 'No bio yet'}
              </p>

              <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                <div className="flex items-center">
                  <Mail className="w-3 h-3 mr-1" />
                  {user.email}
                </div>
                <span>•</span>
                <div className="flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  {userCircles.length} circles
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {user.membership_tier}
                </Badge>
                {!isCurrentUser && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/moments/${user.id}`)}
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Moments
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/portfolio/${user.id}`)}
                    >
                      <Briefcase className="w-3 h-3 mr-1" />
                      Portfolio
                    </Button>
                    <Button
                      size="sm"
                      variant={followingIds.has(user.id) ? 'outline' : 'default'}
                      onClick={() => toggleFollow(user.id)}
                      disabled={followLoadingIds.has(user.id)}
                    >
                      {followingIds.has(user.id) ? (
                        <>
                          <UserCheck className="w-3 h-3 mr-1" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3 mr-1" />
                          Follow
                        </>
                      )}
                    </Button>
                  </>
                )}
                {isCurrentUser && (
                  <Badge variant="secondary">You</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };



  const defaultTab = type === 'admins' ? 'admins' : type === 'hosts' ? 'hosts' : 'all';

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Members', href: '/members/all' },
          ...(type ? [{ label: type.charAt(0).toUpperCase() + type.slice(1) }] : []),
        ]}
        icon={Users}
        iconBg="bg-violet-100"
        iconColor="text-violet-600"
        title="Community Members"
        description={`${allUsers.length} members in the community`}
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            <Users className="w-4 h-4 mr-1" />
            All Members
            <Badge variant="secondary" className="ml-2">{filteredAll.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="admins">
            <Shield className="w-4 h-4 mr-1" />
            Admins
            <Badge variant="secondary" className="ml-2">{filteredAdmins.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="hosts">
            <Crown className="w-4 h-4 mr-1" />
            Circle Hosts
            <Badge variant="secondary" className="ml-2">{filteredHosts.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* All Members Tab */}
        <TabsContent value="all" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAll.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center text-gray-500">
                  No members found
                </CardContent>
              </Card>
            ) : (
              filteredAll.map(renderUserCard)
            )}
          </div>
        </TabsContent>

        {/* Admins Tab */}
        <TabsContent value="admins" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAdmins.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center text-gray-500">
                  No admins found
                </CardContent>
              </Card>
            ) : (
              filteredAdmins.map(renderUserCard)
            )}
          </div>
        </TabsContent>

        {/* Hosts Tab */}
        <TabsContent value="hosts" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredHosts.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center text-gray-500">
                  No circle hosts found
                </CardContent>
              </Card>
            ) : (
              filteredHosts.map(renderUserCard)
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}