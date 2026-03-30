import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Activity,
  MessageSquare,
  MessageCircle,
  Calendar,
  FileText,
  Users,
  Clock,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';

type ActivityItem = {
  id: string;
  type: 'post' | 'thread' | 'event' | 'document' | 'member';
  title: string;
  description: string;
  authorId?: string;
  timestamp: Date;
  circleIds?: string[];
  link: string;
};

export default function RecentActivitiesPage() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [allCircles, setAllCircles] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      // Fetch all needed data
      const [circlesData, postsData, threadsData, eventsData, documentsData, usersData] = await Promise.all([
        supabase.from('circles').select('*'),
        supabase.from('posts').select('*'),
        supabase.from('forum_threads').select('*'),
        supabase.from('events').select('*'),
        supabase.from('documents').select('*'),
        supabase.from('users').select('*').order('created_at', { ascending: false }).limit(5),
      ]);

      const circles = circlesData.data || [];
      setAllCircles(circles);
      setAllUsers(usersData.data || []);

      // Get user's circle IDs
      const userCircleIds = circles
        .filter((c: any) => c.member_ids?.includes(profile?.id))
        .map((c: any) => c.id);

      // Build activities array
      const newActivities: ActivityItem[] = [];

      // Posts
      (postsData.data || []).forEach((post: any) => {
        if (post.circle_ids?.some((id: string) => userCircleIds.includes(id))) {
          newActivities.push({
            id: `post-${post.id}`,
            type: 'post',
            title: post.content.substring(0, 100),
            description: `Posted in ${post.circle_ids?.length || 0} circles`,
            authorId: post.author_id,
            timestamp: new Date(post.created_at),
            circleIds: post.circle_ids,
            link: `/feed`,
          });
        }
      });

      // Forum Threads
      (threadsData.data || []).forEach((thread: any) => {
        if (thread.circle_ids?.some((id: string) => userCircleIds.includes(id))) {
          newActivities.push({
            id: `thread-${thread.id}`,
            type: 'thread',
            title: thread.title,
            description: `${thread.replies?.length || 0} replies`,
            authorId: thread.author_id,
            timestamp: new Date(thread.created_at),
            circleIds: thread.circle_ids,
            link: `/forums`,
          });
        }
      });

      // Events
      (eventsData.data || []).forEach((event: any) => {
        if (event.circle_ids?.some((id: string) => userCircleIds.includes(id))) {
          newActivities.push({
            id: `event-${event.id}`,
            type: 'event',
            title: event.title,
            description: new Date(event.start_time).toLocaleDateString(),
            authorId: event.host_id,
            timestamp: new Date(event.created_at),
            circleIds: event.circle_ids,
            link: `/events`,
          });
        }
      });

      // Documents
      (documentsData.data || []).forEach((doc: any) => {
        if (doc.circle_ids?.some((id: string) => userCircleIds.includes(id))) {
          newActivities.push({
            id: `document-${doc.id}`,
            type: 'document',
            title: doc.title,
            description: doc.category,
            authorId: doc.author_id,
            timestamp: new Date(doc.created_at),
            circleIds: doc.circle_ids,
            link: `/documents/${doc.id}`,
          });
        }
      });

      // New Members
      (usersData.data || []).forEach((user: any) => {
        newActivities.push({
          id: `member-${user.id}`,
          type: 'member',
          title: `${user.name} joined the community`,
          description: user.role,
          authorId: user.id,
          timestamp: new Date(user.created_at),
          link: `/members/${user.id}`,
        });
      });

      // Sort by timestamp
      newActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(newActivities);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setLoading(false);
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading activities...</p>
      </div>
    );
  }

  // Filter by type
  const postActivities = activities.filter(a => a.type === 'post');
  const threadActivities = activities.filter(a => a.type === 'thread');
  const eventActivities = activities.filter(a => a.type === 'event');
  const documentActivities = activities.filter(a => a.type === 'document');
  const memberActivities = activities.filter(a => a.type === 'member');

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'post':
        return MessageSquare;
      case 'thread':
        return MessageCircle;
      case 'event':
        return Calendar;
      case 'document':
        return FileText;
      case 'member':
        return Users;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'post':
        return 'text-indigo-600 bg-indigo-50';
      case 'thread':
        return 'text-purple-600 bg-purple-50';
      case 'event':
        return 'text-green-600 bg-green-50';
      case 'document':
        return 'text-orange-600 bg-orange-50';
      case 'member':
        return 'text-blue-600 bg-blue-50';
    }
  };

  const renderActivityCard = (activity: ActivityItem) => {
    const Icon = getActivityIcon(activity.type);
    const colorClass = getActivityColor(activity.type);
    const author = activity.authorId ? allUsers.find((u: any) => u.id === activity.authorId) : null;
    const circles = activity.circleIds
      ?.map(id => allCircles.find((c: any) => c.id === id))
      .filter(Boolean) || [];

    return (
      <Link to={activity.link}>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium mb-1 line-clamp-1">{activity.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{activity.description}</p>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {author && (
                    <div className="flex items-center">
                      <Avatar className="w-4 h-4 mr-1">
                        <AvatarImage src={author.avatar} />
                        <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {author.name}
                    </div>
                  )}
                  {author && circles.length > 0 && <span>•</span>}
                  {circles.map((circle, idx) => (
                    <span key={circle.id}>
                      {circle.name}
                      {idx < circles.length - 1 && ', '}
                    </span>
                  ))}
                  {(author || circles.length > 0) && <span>•</span>}
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {getTimeAgo(activity.timestamp)}
                  </div>
                </div>
              </div>

              <Badge variant="outline" className="capitalize flex-shrink-0">
                {activity.type}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Recent Activities' }]} />

      {/* Header */}
      <div>
        <h1 className="text-3xl mb-2">Recent Activities</h1>
        <p className="text-gray-600">
          Latest activity from your circles
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            <Activity className="w-4 h-4 mr-1" />
            All Activity
            <Badge variant="secondary" className="ml-2">{activities.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="posts">
            <MessageSquare className="w-4 h-4 mr-1" />
            Posts
            <Badge variant="secondary" className="ml-2">{postActivities.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="threads">
            <MessageCircle className="w-4 h-4 mr-1" />
            Threads
            <Badge variant="secondary" className="ml-2">{threadActivities.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="events">
            <Calendar className="w-4 h-4 mr-1" />
            Events
            <Badge variant="secondary" className="ml-2">{eventActivities.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="w-4 h-4 mr-1" />
            Documents
            <Badge variant="secondary" className="ml-2">{documentActivities.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-1" />
            Members
            <Badge variant="secondary" className="ml-2">{memberActivities.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-6">
          {activities.map(activity => (
            <div key={activity.id}>{renderActivityCard(activity)}</div>
          ))}
        </TabsContent>

        <TabsContent value="posts" className="space-y-3 mt-6">
          {postActivities.map(activity => (
            <div key={activity.id}>{renderActivityCard(activity)}</div>
          ))}
        </TabsContent>

        <TabsContent value="threads" className="space-y-3 mt-6">
          {threadActivities.map(activity => (
            <div key={activity.id}>{renderActivityCard(activity)}</div>
          ))}
        </TabsContent>

        <TabsContent value="events" className="space-y-3 mt-6">
          {eventActivities.map(activity => (
            <div key={activity.id}>{renderActivityCard(activity)}</div>
          ))}
        </TabsContent>

        <TabsContent value="documents" className="space-y-3 mt-6">
          {documentActivities.map(activity => (
            <div key={activity.id}>{renderActivityCard(activity)}</div>
          ))}
        </TabsContent>

        <TabsContent value="members" className="space-y-3 mt-6">
          {memberActivities.map(activity => (
            <div key={activity.id}>{renderActivityCard(activity)}</div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}