import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Calendar, Users, TrendingUp, ArrowRight, Pin, Sparkles, MessageSquare, UserPlus, Clock } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    name: string;
  };
}

interface Event {
  id: string;
  title: string;
  start_time: string;
}

interface User {
  id: string;
  name: string;
  avatar: string | null;
  created_at: string;
}

interface Post {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  author?: {
    name: string;
    avatar: string | null;
  };
}

interface ForumThread {
  id: string;
  title: string;
  author_id: string;
  created_at: string;
  author?: {
    name: string;
  };
}

export default function NewsPage() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [recentMembers, setRecentMembers] = useState<User[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [recentThreads, setRecentThreads] = useState<ForumThread[]>([]);
  const [stats, setStats] = useState({ totalMembers: 0, totalCircles: 0, upcomingEvents: 0 });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch announcements
        const { data: announcementsData } = await supabase
          .from('announcements')
          .select('*, author:users!announcements_author_id_fkey(name)')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);

        setAnnouncements(announcementsData || []);

        // Fetch upcoming events (next 30 days)
        const now = new Date().toISOString();
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title, start_time')
          .gte('start_time', now)
          .lte('start_time', thirtyDaysFromNow)
          .order('start_time', { ascending: true })
          .limit(5);

        setEvents(eventsData || []);

        // Fetch recent members
        const { data: membersData } = await supabase
          .from('users')
          .select('id, name, avatar, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentMembers(membersData || []);

        // Fetch recent posts
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, content, author_id, created_at, author:users!posts_author_id_fkey(name, avatar)')
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentPosts(postsData || []);

        // Fetch recent forum threads
        const { data: threadsData } = await supabase
          .from('forum_threads')
          .select('id, title, author_id, created_at, author:users!forum_threads_author_id_fkey(name)')
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentThreads(threadsData || []);

        // Fetch stats
        const [membersCount, circlesCount] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact', head: true }),
          supabase.from('circles').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          totalMembers: membersCount.count || 0,
          totalCircles: circlesCount.count || 0,
          upcomingEvents: eventsData?.length || 0,
        });
      } catch (error) {
        console.error('Error fetching news page data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  if (!profile) return null;
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Helper function for time ago
  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const statsData = [
    {
      name: 'Total Members',
      value: stats.totalMembers,
      icon: Users,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      name: 'Active Circles',
      value: stats.totalCircles,
      icon: TrendingUp,
      color: 'text-green-600 bg-green-50',
    },
    {
      name: 'Upcoming Events',
      value: stats.upcomingEvents,
      icon: Calendar,
      color: 'text-purple-600 bg-purple-50',
    },
  ];

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: 'Community News' }]} />
      
      {/* Welcome Hero */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-8 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Community News</h1>
        </div>
        <p className="text-indigo-100 text-lg">
          Stay up to date with the latest announcements and highlights from our community.
        </p>
      </div>

      {/* Community Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
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
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Announcements */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
              <CardDescription>Latest updates from platform administrators</CardDescription>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No announcements yet</p>
                  <p className="text-sm mt-2">Check back soon for community updates</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="border-b border-gray-100 last:border-0 pb-4 last:pb-0"
                    >
                      <div className="flex items-start gap-3">
                        {announcement.is_pinned && (
                          <Pin className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-1" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                            {announcement.is_pinned && (
                              <Badge variant="default" className="text-xs">Pinned</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
                            {announcement.content}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>by {announcement.author?.name || 'Admin'}</span>
                            <span>•</span>
                            <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                            {announcement.updated_at && announcement.updated_at !== announcement.created_at && (
                              <>
                                <span>•</span>
                                <span>Updated {new Date(announcement.updated_at).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Upcoming Events */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No upcoming events</p>
                  <Button asChild size="sm">
                    <Link to="/calendar">View Calendar</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <Link
                      key={event.id}
                      to="/calendar"
                      className="block p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 text-center">
                          <div className="text-xs font-medium text-gray-600">
                            {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          <div className="text-2xl font-bold text-indigo-600">
                            {new Date(event.start_time).getDate()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {event.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(event.start_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  <Button asChild variant="outline" size="sm" className="w-full mt-4">
                    <Link to="/calendar">
                      View All Events <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Recent Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                New Members
              </CardTitle>
              <CardDescription>Recently joined</CardDescription>
            </CardHeader>
            <CardContent>
              {recentMembers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent members</p>
              ) : (
                <div className="space-y-3">
                  {recentMembers.map((member) => (
                    <Link
                      key={member.id}
                      to={`/members/${member.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.avatar || undefined} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{member.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(member.created_at)}
                        </p>
                      </div>
                    </Link>
                  ))}
                  <Button asChild variant="outline" size="sm" className="w-full mt-2">
                    <Link to="/members">
                      View All Members <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                Recent Posts
              </CardTitle>
              <CardDescription>Latest discussions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentPosts.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent posts</p>
              ) : (
                <div className="space-y-3">
                  {recentPosts.map((post) => (
                    <Link
                      key={post.id}
                      to="/feed"
                      className="block p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={post.author?.avatar || undefined} />
                          <AvatarFallback>{post.author?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 line-clamp-2 mb-1">
                            {post.content}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getTimeAgo(post.created_at)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  <Button asChild variant="outline" size="sm" className="w-full mt-2">
                    <Link to="/feed">
                      View All Posts <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Forum Threads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                Recent Threads
              </CardTitle>
              <CardDescription>Latest forum activity</CardDescription>
            </CardHeader>
            <CardContent>
              {recentThreads.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent threads</p>
              ) : (
                <div className="space-y-3">
                  {recentThreads.map((thread) => (
                    <Link
                      key={thread.id}
                      to="/forums"
                      className="block p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <p className="font-medium text-sm truncate mb-1">{thread.title}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{thread.author?.name}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(thread.created_at)}
                        </span>
                      </div>
                    </Link>
                  ))}
                  <Button asChild variant="outline" size="sm" className="w-full mt-2">
                    <Link to="/forums">
                      View All Threads <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}