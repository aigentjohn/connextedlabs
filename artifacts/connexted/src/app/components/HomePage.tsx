import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import {
  Users, Award, ArrowRight, Zap, Briefcase,
  FolderKanban, GraduationCap, FileText, Compass, Ticket,
  Link2, ClipboardList, AlertTriangle,
} from 'lucide-react';
import RecommendedCirclesWidget from '@/app/components/RecommendedCirclesWidget';
import MyApplicationsWidget from '@/app/components/MyApplicationsWidget';
import ActivePathwaysWidget from '@/app/components/ActivePathwaysWidget';
import { useUserBadges } from '@/hooks/useBadges';
import { accessTicketService } from '@/services/accessTicketService';

interface Circle {
  id: string;
  name: string;
  member_ids: string[];
}

interface Post {
  id: string;
  content: string;
  author_id: string;
  circle_ids: string[];
  created_at: string;
  likes: string[];
  author?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export default function HomePage() {
  const { profile } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Platform-wide counts
  const [coursesCount, setCoursesCount] = useState(0);
  const [programsCount, setProgramsCount] = useState(0);
  const [portfolioItemsCount, setPortfolioItemsCount] = useState(0);
  const [momentsPostsCount, setMomentsPostsCount] = useState(0);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [linksCount, setLinksCount] = useState(0);
  const [ticketsCount, setTicketsCount] = useState(0);

  // Real badges count via the badge service
  const { badges: userBadges, loading: badgesLoading } = useUserBadges(profile?.id || null);

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      try {
        // Fetch circles where user is a member
        const { data: circlesData } = await supabase
          .from('circles')
          .select('id, name, member_ids')
          .contains('member_ids', [profile.id]);

        setCircles(circlesData || []);

        // Get circle IDs for filtering posts
        const circleIds = circlesData?.map(c => c.id) || [];

        // Fetch recent posts from user's circles
        if (circleIds.length > 0) {
          const { data: postsData } = await supabase
            .from('posts')
            .select(`
              id,
              content,
              author_id,
              circle_ids,
              created_at,
              likes,
              author:users!posts_author_id_fkey(id, name, avatar)
            `)
            .overlaps('circle_ids', circleIds)
            .order('created_at', { ascending: false })
            .limit(5);

          setPosts(postsData || []);
        }

        // Fetch platform-wide stats in parallel
        const [
          coursesResult,
          programsResult,
          portfolioResult,
          momentsResult,
          documentsResult,
          linksResult,
        ] = await Promise.all([
          // Courses the user is enrolled in (via enrollments or circle overlap)
          supabase.from('courses').select('id', { count: 'exact', head: true })
            .overlaps('circle_ids', circleIds.length > 0 ? circleIds : ['__none__']),
          // Programs the user has applied to
          supabase.from('program_applications').select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id),
          // Portfolio items
          supabase.from('portfolio_items').select('id, portfolio_id', { count: 'exact', head: true })
            .eq('portfolio_id', profile.id),
          // Moments posts by this user
          supabase.from('posts').select('id', { count: 'exact', head: true })
            .eq('author_id', profile.id)
            .not('moments_id', 'is', null),
          // Documents authored
          supabase.from('documents').select('id', { count: 'exact', head: true })
            .eq('author_id', profile.id)
            .is('deleted_at', null),
          // Saved links
          supabase.from('my_contents').select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id),
        ]);

        setCoursesCount(coursesResult.count || 0);
        setProgramsCount(programsResult.count || 0);
        setPortfolioItemsCount(portfolioResult.count || 0);
        setMomentsPostsCount(momentsResult.count || 0);
        setDocumentsCount(documentsResult.count || 0);
        setLinksCount(linksResult.count || 0);

        // Fetch user's active tickets
        try {
          const tickets = await accessTicketService.getUserActiveTickets(profile.id);
          setTicketsCount(tickets.length);
        } catch (error) {
          console.error('Error fetching tickets:', error);
        }
      } catch (error) {
        console.error('Error fetching home page data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  if (!profile) return null;
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const badgesCount = badgesLoading ? 0 : userBadges.length;

  const stats = [
    {
      name: 'My Circles',
      value: circles.length,
      icon: Users,
      color: 'text-blue-600 bg-blue-50',
      href: '/circles',
    },
    {
      name: 'Badges Earned',
      value: badgesCount,
      icon: Award,
      color: 'text-purple-600 bg-purple-50',
      href: '/profile/badges',
    },
    {
      name: 'Active Tickets',
      value: ticketsCount,
      icon: Ticket,
      color: 'text-emerald-600 bg-emerald-50',
      href: '/my-tickets',
    },
    {
      name: 'Portfolio Items',
      value: portfolioItemsCount,
      icon: Briefcase,
      color: 'text-amber-600 bg-amber-50',
      href: `/portfolio/${profile.id}`,
    },
    {
      name: 'Moments Shared',
      value: momentsPostsCount,
      icon: Zap,
      color: 'text-rose-600 bg-rose-50',
      href: `/moments/${profile.id}`,
    },
  ];

  // Quick-access links to platform features
  const quickLinks = [
    { label: 'My Tickets', icon: Ticket, href: '/my-tickets', color: 'text-emerald-600', bg: 'bg-emerald-50', desc: `${ticketsCount} active` },
    { label: 'My Moments', icon: Zap, href: `/moments/${profile.id}`, color: 'text-rose-600', bg: 'bg-rose-50', desc: 'Share updates & progress' },
    { label: 'My Portfolio', icon: Briefcase, href: `/portfolio/${profile.id}`, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Showcase your work' },
    { label: 'My Badges', icon: Award, href: '/profile/badges', color: 'text-purple-600', bg: 'bg-purple-50', desc: `${badgesCount} earned` },
    { label: 'My Courses', icon: GraduationCap, href: '/my-courses', color: 'text-green-600', bg: 'bg-green-50', desc: `${coursesCount} enrolled` },
    { label: 'My Programs', icon: FolderKanban, href: '/my-programs', color: 'text-indigo-600', bg: 'bg-indigo-50', desc: `${programsCount} applied` },
    { label: 'My Documents', icon: FileText, href: '/my-documents', color: 'text-sky-600', bg: 'bg-sky-50', desc: `${documentsCount} created` },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {profile.name}! 👋</h1>
        <p className="text-indigo-100 mb-6">
          {circles.length > 0
            ? `You're part of ${circles.length} ${circles.length === 1 ? 'circle' : 'circles'}, have ${ticketsCount} active ${ticketsCount === 1 ? 'ticket' : 'tickets'}, ${badgesCount} ${badgesCount === 1 ? 'badge' : 'badges'}, and ${momentsPostsCount} ${momentsPostsCount === 1 ? 'moment' : 'moments'} shared.`
            : 'Get started by exploring circles, sharing moments, or building your portfolio.'}
        </p>
        <div className="flex flex-wrap gap-3">
          {circles.length === 0 && (
            <Button asChild variant="secondary">
              <Link to="/circles">
                Browse Circles <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          )}
          <Button asChild variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
            <Link to={`/moments/${profile.id}`}>
              <Zap className="mr-2 w-4 h-4" /> Share a Moment
            </Link>
          </Button>
          <Button asChild variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
            <Link to="/explore">
              <Compass className="mr-2 w-4 h-4" /> Explore
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.name} to={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                      <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.label} to={link.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="pt-5 pb-4 text-center">
                    <div className={`w-10 h-10 rounded-lg ${link.bg} flex items-center justify-center mx-auto mb-2`}>
                      <Icon className={`w-5 h-5 ${link.color}`} />
                    </div>
                    <p className="text-sm font-medium text-gray-900">{link.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* My Content Summary */}
      <Card className="border-indigo-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-base">My Content</CardTitle>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
              <Link to="/my-content/audit">View Audit <ArrowRight className="ml-1 w-3 h-3" /></Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link to="/my-documents" className="group">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors">
                <FileText className="w-5 h-5 text-sky-600 shrink-0" />
                <div>
                  <p className="text-xl font-bold text-sky-900">{documentsCount}</p>
                  <p className="text-xs text-sky-700">Documents</p>
                </div>
              </div>
            </Link>
            <Link to="/my-contents" className="group">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-50 hover:bg-violet-100 transition-colors">
                <Link2 className="w-5 h-5 text-violet-600 shrink-0" />
                <div>
                  <p className="text-xl font-bold text-violet-900">{linksCount}</p>
                  <p className="text-xs text-violet-700">Saved Links</p>
                </div>
              </div>
            </Link>
            <Link to={`/moments/${profile.id}`} className="group">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors">
                <Zap className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <p className="text-xl font-bold text-rose-900">{momentsPostsCount}</p>
                  <p className="text-xs text-rose-700">Moments</p>
                </div>
              </div>
            </Link>
            <Link to="/my-content/trash" className="group">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <AlertTriangle className="w-5 h-5 text-gray-500 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-700">Trash &amp; Audit</p>
                  <p className="text-xs text-gray-500">Manage content</p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Active Pathways — only renders if user has active enrollments */}
      <ActivePathwaysWidget />



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest posts from your circles</CardDescription>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                  <p>No recent activity</p>
                  <p className="text-sm mt-2">Join circles to see posts from the community</p>
                  <Button asChild size="sm" className="mt-4">
                    <Link to="/circles">Browse Circles</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => {
                    const circle = circles.find(c => post.circle_ids?.includes(c.id));
                    if (!post.author || !circle) return null;

                    return (
                      <div key={post.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                        <div className="flex items-start space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={post.author.avatar || undefined} />
                            <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="text-sm font-medium text-gray-900">{post.author.name}</p>
                              <span className="text-sm text-gray-500">in</span>
                              <Link
                                to={`/circles/${circle.id}`}
                                className="text-sm text-indigo-600 hover:underline"
                              >
                                {circle.name}
                              </Link>
                              {post.circle_ids && post.circle_ids.length > 1 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{post.circle_ids.length - 1} more
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>{post.likes?.length || 0} likes</span>
                              <span>{new Date(post.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recommended Circles */}
          <RecommendedCirclesWidget userId={profile.id} maxResults={5} />

          {/* My Circles */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>My Circles</CardTitle>
                  <CardDescription>Circles you've joined</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/circles">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {circles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">You haven't joined any circles yet</p>
                  <Button asChild size="sm">
                    <Link to="/circles">Explore Circles</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {circles.slice(0, 5).map((circle) => (
                    <Link
                      key={circle.id}
                      to={`/circles/${circle.id}`}
                      className="block p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    >
                      <CardTitle className="text-lg">{circle.name}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{circle.member_ids.length} members</p>
                    </Link>
                  ))}
                  {circles.length > 5 && (
                    <Link to="/circles" className="block text-sm text-indigo-600 hover:underline text-center pt-2">
                      View all {circles.length} circles
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Applications */}
          <MyApplicationsWidget userId={profile.id} />
        </div>
      </div>
    </div>
  );
}