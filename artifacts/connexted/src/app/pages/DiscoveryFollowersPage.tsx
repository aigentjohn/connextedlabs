import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Input } from '@/app/components/ui/input';
import {
  Search, FileText, MessageSquare, Calendar, BookOpen, ThumbsUp,
  Hammer, Lightbulb, Headphones, Presentation, Users, RefreshCw,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { format } from 'date-fns';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  created_at: string;
  author: { id: string; name: string; avatar?: string };
}

function contentIcon(type: string) {
  switch (type) {
    case 'post':     return <FileText className="w-4 h-4" />;
    case 'thread':   return <MessageSquare className="w-4 h-4" />;
    case 'event':    return <Calendar className="w-4 h-4" />;
    case 'course':   return <BookOpen className="w-4 h-4" />;
    case 'document': return <FileText className="w-4 h-4" />;
    case 'review':   return <ThumbsUp className="w-4 h-4" />;
    case 'build':    return <Hammer className="w-4 h-4" />;
    case 'pitch':    return <Lightbulb className="w-4 h-4" />;
    case 'book':     return <BookOpen className="w-4 h-4" />;
    case 'deck':     return <Presentation className="w-4 h-4" />;
    case 'episode':  return <Headphones className="w-4 h-4" />;
    case 'program':  return <BookOpen className="w-4 h-4" />;
    default:         return <FileText className="w-4 h-4" />;
  }
}

function contentLink(type: string, id: string) {
  switch (type) {
    case 'post':     return `/posts/${id}`;
    case 'thread':   return `/forums/thread/${id}`;
    case 'event':    return `/events/${id}`;
    case 'course':   return `/courses/${id}`;
    case 'document': return `/documents/${id}`;
    case 'review':   return `/reviews/${id}`;
    case 'build':    return `/builds/${id}`;
    case 'pitch':    return `/pitches/${id}`;
    case 'book':     return `/books/${id}`;
    case 'deck':     return `/decks/${id}`;
    case 'episode':  return `/episodes/${id}`;
    case 'program':  return `/programs/${id}`;
    default:         return '#';
  }
}

export default function DiscoveryFollowersPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (profile) fetchActivity();
  }, [profile?.id]);

  const fetchActivity = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      const { data: connectionsData } = await supabase
        .from('user_connections')
        .select('follower_id')
        .eq('following_id', profile.id);

      const followerIds = connectionsData?.map(c => c.follower_id) || [];
      setFollowerCount(followerIds.length);

      if (followerIds.length === 0) {
        setActivity([]);
        return;
      }

      const [postsR, threadsR, docsR, reviewsR, buildsR, pitchesR, eventsR, authorsR] =
        await Promise.all([
          supabase.from('posts').select('id, title, content, created_at, author_id').in('author_id', followerIds).order('created_at', { ascending: false }).limit(20),
          supabase.from('forum_threads').select('id, title, body, created_at, author_id').in('author_id', followerIds).order('created_at', { ascending: false }).limit(20),
          supabase.from('documents').select('id, title, description, created_at, author_id').in('author_id', followerIds).order('created_at', { ascending: false }).limit(20),
          supabase.from('endorsements').select('id, title, body, created_at, author_id').in('author_id', followerIds).order('created_at', { ascending: false }).limit(20),
          supabase.from('builds').select('id, name, description, created_at, created_by').in('created_by', followerIds).order('created_at', { ascending: false }).limit(20),
          supabase.from('pitches').select('id, title, description, created_at, created_by').in('created_by', followerIds).order('created_at', { ascending: false }).limit(20),
          supabase.from('events').select('id, title, description, created_at, host_id').in('host_id', followerIds).order('created_at', { ascending: false }).limit(20),
          supabase.from('users').select('id, name, avatar').in('id', followerIds),
        ]);

      const authorMap = new Map(authorsR.data?.map(a => [a.id, a]) || []);
      const allActivity: ActivityItem[] = [];

      const push = (items: any[], type: string, titleF: string, descF: string, authorF: string) => {
        items?.forEach(row => {
          const author = authorMap.get(row[authorF]);
          if (author) {
            allActivity.push({ id: row.id, type, title: row[titleF] || 'Untitled', description: row[descF], created_at: row.created_at, author });
          }
        });
      };

      push(postsR.data || [],    'post',     'title', 'content',     'author_id');
      push(threadsR.data || [],  'thread',   'title', 'body',        'author_id');
      push(docsR.data || [],     'document', 'title', 'description', 'author_id');
      push(reviewsR.data || [],  'review',   'title', 'body',        'author_id');
      push(buildsR.data || [],   'build',    'name',  'description', 'created_by');
      push(pitchesR.data || [],  'pitch',    'title', 'description', 'created_by');
      push(eventsR.data || [],   'event',    'title', 'description', 'host_id');

      allActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setActivity(allActivity.slice(0, 60));
    } catch (err) {
      console.error('Error fetching followers activity:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = activity.filter(item =>
    !searchQuery ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.author.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumbs items={[{ label: 'Discover', path: '/discovery' }, { label: 'Followers Feed' }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Followers Feed</h1>
          <p className="text-gray-600 mt-1">Recent content from the {followerCount} {followerCount === 1 ? 'person' : 'people'} following you</p>
        </div>
        <button
          onClick={fetchActivity}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search followers' content..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            Loading activity...
          </CardContent>
        </Card>
      ) : followerCount === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Users className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="font-semibold text-gray-700">No one is following you yet</p>
            <p className="text-sm text-gray-500">
              Engage with the community — share content, join circles, and connect with members to grow your following.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="font-semibold text-gray-700">
              {searchQuery ? 'No results match your search' : 'No recent activity from your followers'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.map(item => (
              <div
                key={`${item.type}-${item.id}`}
                className="hover:shadow-md transition-shadow cursor-pointer border border-gray-100 rounded-lg p-4"
                onClick={() => navigate(contentLink(item.type, item.id))}
              >
                <div className="flex items-start gap-3">
                  <Link to={`/users/${item.author.id}`} onClick={e => e.stopPropagation()} className="flex-shrink-0">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={item.author.avatar || undefined} />
                      <AvatarFallback>{item.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link to={`/users/${item.author.id}`} onClick={e => e.stopPropagation()} className="font-semibold text-sm hover:text-indigo-600">
                        {item.author.name}
                      </Link>
                      <span className="text-gray-400">•</span>
                      <Badge variant="secondary" className="gap-1 text-xs">
                        {contentIcon(item.type)}
                        {item.type}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1 truncate">{item.title}</h3>

                    {item.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-1">{item.description}</p>
                    )}

                    <p className="text-xs text-gray-400">{format(new Date(item.created_at), 'PPp')}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
