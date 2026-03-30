import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { notifyNewFollower } from '@/lib/notificationHelpers';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { 
  User, 
  Users, 
  Calendar, 
  MapPin, 
  Mail, 
  Phone, 
  Briefcase, 
  Award, 
  ExternalLink,
  UserPlus,
  UserMinus,
  MessageSquare,
  FileText,
  Zap,
  Sparkles,
  MessageCircle,
  GraduationCap,
  Building2,
  UserCheck
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { BadgeDisplay, BadgeList } from '@/app/components/badges';
import { useUserBadges } from '@/hooks/useBadges';

export default function UserProfilePage() {
  const { userId } = useParams();
  const { profile: currentUser } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    posts: 0,
    threads: 0,
    documents: 0,
    events: 0,
  });

  // Connections
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Circles
  const [memberCircles, setMemberCircles] = useState<any[]>([]);

  // Activity data
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userThreads, setUserThreads] = useState<any[]>([]);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);

  // Professional data
  const [skills, setSkills] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [affiliations, setAffiliations] = useState<any[]>([]);

  // Badges
  const { badges } = useUserBadges(userId);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && currentUser) {
      checkFollowStatus();
    }
  }, [userId, currentUser]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      if (!userData) {
        toast.error('User not found');
        return;
      }

      setUser(userData);
      setFollowersCount(userData.followers_count || 0);
      setFollowingCount(userData.following_count || 0);

      // Fetch user's circles
      const { data: circlesData } = await supabase
        .from('circles')
        .select('id, name, member_ids')
        .contains('member_ids', [userId]);

      setMemberCircles(circlesData || []);

      // Fetch activity stats
      const [postsCount, threadsCount, documentsCount, eventsCount] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', userId),
        supabase.from('forum_threads').select('id', { count: 'exact', head: true }).eq('author_id', userId),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('author_id', userId),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('host_id', userId),
      ]);

      setStats({
        posts: postsCount.count || 0,
        threads: threadsCount.count || 0,
        documents: documentsCount.count || 0,
        events: eventsCount.count || 0,
      });

      // Fetch user posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, content, created_at')
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      setUserPosts(postsData || []);

      // Fetch user threads
      const { data: threadsData } = await supabase
        .from('forum_threads')
        .select('id, title, created_at')
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      setUserThreads(threadsData || []);

      // Fetch user documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select('id, title, created_at')
        .eq('author_id', userId)
        .order('created_at', { ascending: false})
        .limit(10);

      setUserDocuments(documentsData || []);

      // Fetch user skills
      const { data: skillsData } = await supabase
        .from('user_skills')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true);

      setSkills(skillsData || []);

      // Fetch user credentials
      const { data: credentialsData } = await supabase
        .from('user_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true);

      setCredentials(credentialsData || []);

      // Fetch user affiliations
      const { data: affiliationsData } = await supabase
        .from('user_affiliations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true);

      setAffiliations(affiliationsData || []);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!currentUser || !userId) return;

    try {
      const { data, error } = await supabase
        .from('user_connections')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId)
        .maybeSingle();

      if (error) throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser || !userId) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_connections')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId);

        if (error) throw error;
        
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        toast.success(`Unfollowed ${user.name}`);
      } else {
        // Follow
        const { error } = await supabase
          .from('user_connections')
          .insert({
            follower_id: currentUser.id,
            following_id: userId,
          });

        if (error) throw error;
        
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        toast.success(`Now following ${user.name}`);
        
        // Send notification to the user being followed
        await notifyNewFollower(
          userId,
          currentUser.id,
          currentUser.name || 'Someone'
        );
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      toast.error(error.message || 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">User not found</div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;
  const isAdmin = currentUser?.role === 'admin';

  // Privacy enforcement — respect the flags set in ContactTab / PrivacyTab.
  // Admins bypass all privacy checks so they can always see member info.
  const ps = user.privacy_settings || {};
  const canSeeEmail = isAdmin || isOwnProfile || !ps.email_private;
  const canSeeWhatsApp = isAdmin || isOwnProfile || !ps.whatsapp_private;
  const canSeeConnections = isAdmin || isOwnProfile || ps.show_connections !== false;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Members', path: '/members' },
        { label: user.name }
      ]} />

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-6">
            {/* Avatar */}
            <Avatar className="w-24 h-24">
              <AvatarImage src={user.avatar || undefined} />
              <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold">{user.name}</h1>
                <div className="flex gap-2">
                  {isOwnProfile ? (
                    <Link to="/my-basics">
                      <Button variant="outline">
                        View My Profile
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant={isFollowing ? 'outline' : 'default'}
                      onClick={handleToggleFollow}
                      disabled={followLoading}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-4 h-4 mr-2" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-4">
                {canSeeEmail && (
                  <>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-1" />
                      {user.email}
                    </div>
                    <span>•</span>
                  </>
                )}
                <Badge variant="outline" className="capitalize">
                  {user.role}
                </Badge>
                <Badge className="capitalize bg-indigo-600">
                  {user.membership_tier} Member
                </Badge>
                <span>•</span>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>

              {/* Earned Badges Inline */}
              {badges.length > 0 && (
                <div className="mb-3">
                  <BadgeDisplay badges={badges} maxDisplay={6} size="sm" showIssuer={false} />
                  <span className="text-xs text-gray-500 mt-1 inline-block">
                    {badges.length} badge{badges.length !== 1 ? 's' : ''} earned
                  </span>
                </div>
              )}

              {/* Connection Stats */}
              {canSeeConnections && (
                <div className="flex items-center gap-4 mb-4">
                  <Link 
                    to={`/users/${userId}/followers`}
                    className="flex items-center gap-2 text-sm hover:text-indigo-600 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <span>
                      <strong className="font-semibold">{followersCount}</strong> Followers
                    </span>
                  </Link>
                  <Link 
                    to={`/users/${userId}/following`}
                    className="flex items-center gap-2 text-sm hover:text-indigo-600 transition-colors"
                  >
                    <strong className="font-semibold">{followingCount}</strong> Following
                  </Link>
                </div>
              )}

              {/* Bio */}
              {user.bio && (
                <div className="space-y-2">
                  <p className="text-gray-700">{user.bio}</p>
                </div>
              )}
              
              {/* Quick Links to Personal Containers */}
              <div className="flex gap-2 mt-4">
                {!isOwnProfile && canSeeWhatsApp && user.whatsapp_number && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://wa.me/${user.whatsapp_number.replace(/[^0-9+]/g, '')}`, '_blank')}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
                <Link to={`/moments/${userId}`}>
                  <Button variant="outline" size="sm">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Moments
                  </Button>
                </Link>
                <Link to={`/portfolio/${userId}`}>
                  <Button variant="outline" size="sm">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Portfolio
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
            <div className="text-2xl font-bold">{stats.posts + stats.threads}</div>
            <div className="text-sm text-gray-600">Posts & Threads</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{stats.documents}</div>
            <div className="text-sm text-gray-600">Documents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{stats.events}</div>
            <div className="text-sm text-gray-600">Events Created</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <User className="w-8 h-8 mx-auto mb-2 text-orange-600" />
            <div className="text-2xl font-bold">{memberCircles.length}</div>
            <div className="text-sm text-gray-600">Circles Joined</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="professional">Professional</TabsTrigger>
          <TabsTrigger value="circles">Circles</TabsTrigger>
          <TabsTrigger value="contributions">Contributions</TabsTrigger>
        </TabsList>

        {/* Recent Activity Tab */}
        <TabsContent value="activity" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Posts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {userPosts.slice(0, 5).map((post) => (
                <div key={post.id} className="border-l-2 border-indigo-500 pl-3">
                  <p className="text-sm line-clamp-2">{post.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
              {userPosts.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No posts yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Professional Tab */}
        <TabsContent value="professional" className="space-y-4 mt-6">
          {/* Professional Info Overview */}
          {(user.professional_status || user.job_title || user.company_name || user.years_experience) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  Professional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.professional_status && (
                  <div>
                    <span className="text-sm text-gray-500">Status:</span>
                    <Badge className="ml-2 capitalize">{user.professional_status.replace('_', ' ')}</Badge>
                  </div>
                )}
                {user.job_title && (
                  <div>
                    <span className="text-sm text-gray-500">Current Role:</span>
                    <span className="ml-2 font-medium">{user.job_title}</span>
                  </div>
                )}
                {user.company_name && (
                  <div>
                    <span className="text-sm text-gray-500">Company:</span>
                    <span className="ml-2 font-medium">{user.company_name}</span>
                  </div>
                )}
                {user.years_experience && (
                  <div>
                    <span className="text-sm text-gray-500">Years of Experience:</span>
                    <span className="ml-2 font-medium">{user.years_experience}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  Skills ({skills.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill.id} variant="secondary" className="py-1.5">
                      <span>
                        {skill.skill_name}
                        <span className="text-xs text-gray-500 ml-1">
                          ({skill.proficiency_level}{skill.years_experience ? `, ${skill.years_experience}y` : ''})
                        </span>
                      </span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Credentials */}
          {credentials.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  Certifications & Credentials ({credentials.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {credentials.map((credential) => (
                  <div key={credential.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{credential.name}</div>
                        <div className="text-sm text-gray-600">
                          {credential.issuing_organization}
                        </div>
                        {credential.issue_date && (
                          <div className="text-xs text-gray-500 mt-1">
                            Issued {new Date(credential.issue_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {credential.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Affiliations */}
          {affiliations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-green-600" />
                  Affiliations ({affiliations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {affiliations.map((affiliation) => (
                  <div key={affiliation.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{affiliation.organization_name}</div>
                        <div className="text-sm text-gray-600">
                          {affiliation.relationship}
                          {affiliation.organization_type && ` • ${affiliation.organization_type}`}
                        </div>
                      </div>
                      {affiliation.is_current && (
                        <Badge className="bg-green-600">Current</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-600" />
                  Badges & Achievements ({badges.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BadgeList badges={badges} groupByCategory={true} />
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {skills.length === 0 && credentials.length === 0 && affiliations.length === 0 && badges.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">
                  {isOwnProfile 
                    ? "You haven't added any professional information yet. Visit your Edit Profile page to get started!"
                    : "This member hasn't added professional information yet."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Circles Tab */}
        <TabsContent value="circles" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memberCircles.map((circle) => (
              <Link key={circle.id} to={`/circles/${circle.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{circle.name}</h3>
                        <p className="text-sm text-gray-600">
                          {circle.member_ids?.length || 0} members
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {memberCircles.length === 0 && (
              <p className="text-sm text-gray-500 col-span-2 text-center py-8">
                Not a member of any circles yet
              </p>
            )}
          </div>
        </TabsContent>

        {/* Contributions Tab */}
        <TabsContent value="contributions" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Forum Threads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-600 mb-2">
                  {userThreads.length}
                </div>
                <p className="text-sm text-gray-600">Threads started</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Documents Shared</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {userDocuments.length}
                </div>
                <p className="text-sm text-gray-600">Resources contributed</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}