import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Search, Hash, Star, Users, FileText, MessageSquare, Calendar, BookOpen, ThumbsUp, Building2, Lightbulb, Hammer, Headphones, Presentation, Heart } from 'lucide-react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { format } from 'date-fns';

interface TagData {
  tag: string;
  totalCount: number;
  posts: number;
  threads: number;
  events: number;
  courses: number;
  documents: number;
  reviews: number;
}

interface FavoriteContent {
  id: string;
  type: 'post' | 'thread' | 'event' | 'course' | 'document' | 'review' | 'build' | 'pitch' | 'book' | 'deck' | 'episode';
  title: string;
  description?: string;
  created_at: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  circle_ids?: string[];
}

interface FollowingActivity {
  id: string;
  type: 'post' | 'thread' | 'event' | 'document' | 'review' | 'build' | 'pitch' | 'book' | 'deck' | 'episode' | 'course' | 'program';
  title: string;
  description?: string;
  created_at: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  circle_ids?: string[];
  source?: 'person' | 'topic' | 'tag';
  sourceName?: string;
}

// ─── Module-level helpers (no hooks, safe for Fast Refresh) ─────────────────
function getContentIcon(type: string) {
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

function getContentLink(item: FavoriteContent | FollowingActivity) {
  switch (item.type) {
    case 'post':     return `/posts/${item.id}`;
    case 'thread':   return `/forums/thread/${item.id}`;
    case 'event':    return `/events/${item.id}`;
    case 'course':   return `/courses/${item.id}`;
    case 'document': return `/documents/${item.id}`;
    case 'review':   return `/reviews/${item.id}`;
    case 'build':    return `/builds/${item.id}`;
    case 'pitch':    return `/pitches/${item.id}`;
    case 'book':     return `/books/${item.id}`;
    case 'deck':     return `/decks/${item.id}`;
    case 'episode':  return `/episodes/${item.id}`;
    case 'program':  return `/programs/${item.id}`;
    default:         return '#';
  }
}

const VALID_TABS = ['favorites', 'liked', 'following', 'followers', 'tags'] as const;

export default function DiscoveryPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get('tab') as any) ? searchParams.get('tab')! : 'favorites';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<TagData[]>([]);
  const [favorites, setFavorites] = useState<FavoriteContent[]>([]);
  const [likedContent, setLikedContent] = useState<FavoriteContent[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [followingActivity, setFollowingActivity] = useState<FollowingActivity[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [followers, setFollowers] = useState<any[]>([]);
  const [followersActivity, setFollowersActivity] = useState<FollowingActivity[]>([]);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam as any) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (profile) {
      if (activeTab === 'tags') {
        fetchTags();
      } else if (activeTab === 'favorites') {
        fetchFavorites();
      } else if (activeTab === 'liked') {
        fetchLikedContent();
      } else if (activeTab === 'following') {
        fetchFollowing();
      } else if (activeTab === 'followers') {
        fetchFollowers();
      }
    }
  }, [profile, activeTab]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      
      const [
        { data: postsData },
        { data: threadsData },
        { data: eventsData },
        { data: coursesData },
        { data: documentsData },
        { data: reviewsData },
      ] = await Promise.all([
        supabase.from('posts').select('id, tags').not('tags', 'is', null),
        supabase.from('forum_threads').select('id, tags').not('tags', 'is', null),
        supabase.from('events').select('id, tags').not('tags', 'is', null),
        supabase.from('courses').select('id, tags').not('tags', 'is', null),
        supabase.from('documents').select('id, tags').not('tags', 'is', null),
        supabase.from('endorsements').select('id, tags').not('tags', 'is', null),
      ]);

      // Aggregate tags
      const tagMap = new Map<string, TagData>();

      const processContent = (data: any[], type: keyof Omit<TagData, 'tag' | 'totalCount'>) => {
        data?.forEach(item => {
          item.tags?.forEach((tag: string) => {
            if (!tagMap.has(tag)) {
              tagMap.set(tag, {
                tag,
                totalCount: 0,
                posts: 0,
                threads: 0,
                events: 0,
                courses: 0,
                documents: 0,
                reviews: 0,
              });
            }
            const tagData = tagMap.get(tag)!;
            tagData[type]++;
            tagData.totalCount++;
          });
        });
      };

      processContent(postsData || [], 'posts');
      processContent(threadsData || [], 'threads');
      processContent(eventsData || [], 'events');
      processContent(coursesData || [], 'courses');
      processContent(documentsData || [], 'documents');
      processContent(reviewsData || [], 'reviews');

      setTags(Array.from(tagMap.values()).sort((a, b) => b.totalCount - a.totalCount));
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);
      const allFavorites: FavoriteContent[] = [];

      // Fetch all favorites from content_favorites table
      const { data: userFavorites } = await supabase
        .from('content_favorites')
        .select('content_type, content_id')
        .eq('user_id', profile.id);

      if (!userFavorites || userFavorites.length === 0) {
        setFavorites([]);
        return;
      }

      // Group favorites by content type
      const favoritesByType: Record<string, string[]> = {};
      userFavorites.forEach(fav => {
        if (!favoritesByType[fav.content_type]) {
          favoritesByType[fav.content_type] = [];
        }
        favoritesByType[fav.content_type].push(fav.content_id);
      });

      const fetchPromises = [];

      // Fetch each content type's favorites
      if (favoritesByType['post']?.length > 0) {
        fetchPromises.push(
          supabase.from('posts')
            .select('id, title, body, created_at, author_id, circle_ids')
            .in('id', favoritesByType['post'])
            .then(({ data }) => data?.map(post => ({
              id: post.id,
              type: 'post',
              title: post.title,
              description: post.body,
              createdAt: post.created_at,
              authorId: post.author_id,
              circleIds: post.circle_ids,
            })) || [])
        );
      }

      if (favoritesByType['forum_thread']?.length > 0) {
        fetchPromises.push(
          supabase.from('forum_threads')
            .select('id, title, body, created_at, author_id, circle_ids')
            .in('id', favoritesByType['forum_thread'])
            .then(({ data }) => data?.map(thread => ({
              id: thread.id,
              type: 'thread',
              title: thread.title,
              description: thread.body,
              createdAt: thread.created_at,
              authorId: thread.author_id,
              circleIds: thread.circle_ids,
            })) || [])
        );
      }

      if (favoritesByType['event']?.length > 0) {
        fetchPromises.push(
          supabase.from('events')
            .select('id, title, description, created_at, host_id, circle_ids')
            .in('id', favoritesByType['event'])
            .then(({ data }) => data?.map(event => ({
              id: event.id,
              type: 'event',
              title: event.title,
              description: event.description,
              createdAt: event.created_at,
              authorId: event.host_id,
              circleIds: event.circle_ids,
            })) || [])
        );
      }

      if (favoritesByType['course']?.length > 0) {
        fetchPromises.push(
          supabase.from('courses')
            .select('id, title, description, created_at, created_by, circle_ids')
            .in('id', favoritesByType['course'])
            .then(({ data }) => data?.map(course => ({
              id: course.id,
              type: 'course',
              title: course.title,
              description: course.description,
              createdAt: course.created_at,
              authorId: course.created_by,
              circleIds: course.circle_ids,
            })) || [])
        );
      }

      if (favoritesByType['document']?.length > 0) {
        fetchPromises.push(
          supabase.from('documents')
            .select('id, title, description, created_at, author_id, circle_ids')
            .in('id', favoritesByType['document'])
            .then(({ data }) => data?.map(doc => ({
              id: doc.id,
              type: 'document',
              title: doc.title,
              description: doc.description,
              createdAt: doc.created_at,
              authorId: doc.author_id,
              circleIds: doc.circle_ids,
            })) || [])
        );
      }

      if (favoritesByType['endorsement']?.length > 0) {
        fetchPromises.push(
          supabase.from('endorsements')
            .select('id, title, body, created_at, author_id, circle_ids')
            .in('id', favoritesByType['endorsement'])
            .then(({ data }) => data?.map(review => ({
              id: review.id,
              type: 'review',
              title: review.title,
              description: review.body,
              createdAt: review.created_at,
              authorId: review.author_id,
              circleIds: review.circle_ids,
            })) || [])
        );
      }

      if (favoritesByType['build']?.length > 0) {
        fetchPromises.push(
          supabase.from('builds')
            .select('id, name, description, created_at, created_by, circle_ids')
            .in('id', favoritesByType['build'])
            .then(({ data }) => data?.map(build => ({
              id: build.id,
              type: 'build',
              title: build.name,
              description: build.description,
              createdAt: build.created_at,
              authorId: build.created_by,
              circleIds: build.circle_ids,
            })) || [])
        );
      }

      if (favoritesByType['pitch']?.length > 0) {
        fetchPromises.push(
          supabase.from('pitches')
            .select('id, title, description, created_at, created_by, circle_ids')
            .in('id', favoritesByType['pitch'])
            .then(({ data }) => data?.map(pitch => ({
              id: pitch.id,
              type: 'pitch',
              title: pitch.title,
              description: pitch.description,
              createdAt: pitch.created_at,
              authorId: pitch.created_by,
              circleIds: pitch.circle_ids,
            })) || [])
        );
      }

      if (favoritesByType['book']?.length > 0) {
        fetchPromises.push(
          supabase.from('books')
            .select('id, title, author, description, created_at, created_by')
            .in('id', favoritesByType['book'])
            .then(({ data }) => data?.map(book => ({
              id: book.id,
              type: 'book',
              title: book.title,
              description: book.author ? `by ${book.author}${book.description ? ' — ' + book.description : ''}` : book.description,
              createdAt: book.created_at,
              authorId: book.created_by,
            })) || [])
        );
      }

      if (favoritesByType['deck']?.length > 0) {
        fetchPromises.push(
          supabase.from('decks')
            .select('id, title, description, created_at, created_by')
            .in('id', favoritesByType['deck'])
            .then(({ data }) => data?.map(deck => ({
              id: deck.id,
              type: 'deck',
              title: deck.title,
              description: deck.description,
              createdAt: deck.created_at,
              authorId: deck.created_by,
            })) || [])
        );
      }

      if (favoritesByType['episode']?.length > 0) {
        fetchPromises.push(
          supabase.from('episodes')
            .select('id, title, description, created_at, created_by')
            .in('id', favoritesByType['episode'])
            .then(({ data }) => data?.map(episode => ({
              id: episode.id,
              type: 'episode',
              title: episode.title,
              description: episode.description,
              createdAt: episode.created_at,
              authorId: episode.created_by,
            })) || [])
        );
      }

      // Execute all fetches in parallel
      const results = await Promise.all(fetchPromises);
      
      // Flatten and combine all results
      results.forEach(items => {
        allFavorites.push(...items);
      });

      // Sort by most recent
      allFavorites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setFavorites(allFavorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikedContent = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);
      const allLikedContent: FavoriteContent[] = [];

      // Fetch all liked content from content_likes table
      const { data: userLikes } = await supabase
        .from('content_likes')
        .select('content_type, content_id')
        .eq('user_id', profile.id);

      if (!userLikes || userLikes.length === 0) {
        setLikedContent([]);
        return;
      }

      // Group likes by content type
      const likesByType: Record<string, string[]> = {};
      userLikes.forEach(like => {
        if (!likesByType[like.content_type]) {
          likesByType[like.content_type] = [];
        }
        likesByType[like.content_type].push(like.content_id);
      });

      const fetchPromises = [];

      // Fetch each content type's likes
      if (likesByType['post']?.length > 0) {
        fetchPromises.push(
          supabase.from('posts')
            .select('id, title, body, created_at, author_id, circle_ids')
            .in('id', likesByType['post'])
            .then(({ data }) => data?.map(post => ({
              id: post.id,
              type: 'post',
              title: post.title,
              description: post.body,
              createdAt: post.created_at,
              authorId: post.author_id,
              circleIds: post.circle_ids,
            })) || [])
        );
      }

      if (likesByType['forum_thread']?.length > 0) {
        fetchPromises.push(
          supabase.from('forum_threads')
            .select('id, title, body, created_at, author_id, circle_ids')
            .in('id', likesByType['forum_thread'])
            .then(({ data }) => data?.map(thread => ({
              id: thread.id,
              type: 'thread',
              title: thread.title,
              description: thread.body,
              createdAt: thread.created_at,
              authorId: thread.author_id,
              circleIds: thread.circle_ids,
            })) || [])
        );
      }

      if (likesByType['event']?.length > 0) {
        fetchPromises.push(
          supabase.from('events')
            .select('id, title, description, created_at, host_id, circle_ids')
            .in('id', likesByType['event'])
            .then(({ data }) => data?.map(event => ({
              id: event.id,
              type: 'event',
              title: event.title,
              description: event.description,
              createdAt: event.created_at,
              authorId: event.host_id,
              circleIds: event.circle_ids,
            })) || [])
        );
      }

      if (likesByType['course']?.length > 0) {
        fetchPromises.push(
          supabase.from('courses')
            .select('id, title, description, created_at, created_by, circle_ids')
            .in('id', likesByType['course'])
            .then(({ data }) => data?.map(course => ({
              id: course.id,
              type: 'course',
              title: course.title,
              description: course.description,
              createdAt: course.created_at,
              authorId: course.created_by,
              circleIds: course.circle_ids,
            })) || [])
        );
      }

      if (likesByType['document']?.length > 0) {
        fetchPromises.push(
          supabase.from('documents')
            .select('id, title, description, created_at, author_id, circle_ids')
            .in('id', likesByType['document'])
            .then(({ data }) => data?.map(doc => ({
              id: doc.id,
              type: 'document',
              title: doc.title,
              description: doc.description,
              createdAt: doc.created_at,
              authorId: doc.author_id,
              circleIds: doc.circle_ids,
            })) || [])
        );
      }

      if (likesByType['endorsement']?.length > 0) {
        fetchPromises.push(
          supabase.from('endorsements')
            .select('id, title, body, created_at, author_id, circle_ids')
            .in('id', likesByType['endorsement'])
            .then(({ data }) => data?.map(review => ({
              id: review.id,
              type: 'review',
              title: review.title,
              description: review.body,
              createdAt: review.created_at,
              authorId: review.author_id,
              circleIds: review.circle_ids,
            })) || [])
        );
      }

      if (likesByType['build']?.length > 0) {
        fetchPromises.push(
          supabase.from('builds')
            .select('id, name, description, created_at, created_by, circle_ids')
            .in('id', likesByType['build'])
            .then(({ data }) => data?.map(build => ({
              id: build.id,
              type: 'build',
              title: build.name,
              description: build.description,
              createdAt: build.created_at,
              authorId: build.created_by,
              circleIds: build.circle_ids,
            })) || [])
        );
      }

      if (likesByType['pitch']?.length > 0) {
        fetchPromises.push(
          supabase.from('pitches')
            .select('id, title, description, created_at, created_by, circle_ids')
            .in('id', likesByType['pitch'])
            .then(({ data }) => data?.map(pitch => ({
              id: pitch.id,
              type: 'pitch',
              title: pitch.title,
              description: pitch.description,
              createdAt: pitch.created_at,
              authorId: pitch.created_by,
              circleIds: pitch.circle_ids,
            })) || [])
        );
      }

      if (likesByType['book']?.length > 0) {
        fetchPromises.push(
          supabase.from('books')
            .select('id, title, author, description, created_at, created_by')
            .in('id', likesByType['book'])
            .then(({ data }) => data?.map(book => ({
              id: book.id,
              type: 'book',
              title: book.title,
              description: book.author ? `by ${book.author}${book.description ? ' — ' + book.description : ''}` : book.description,
              createdAt: book.created_at,
              authorId: book.created_by,
            })) || [])
        );
      }

      if (likesByType['deck']?.length > 0) {
        fetchPromises.push(
          supabase.from('decks')
            .select('id, title, description, created_at, created_by')
            .in('id', likesByType['deck'])
            .then(({ data }) => data?.map(deck => ({
              id: deck.id,
              type: 'deck',
              title: deck.title,
              description: deck.description,
              createdAt: deck.created_at,
              authorId: deck.created_by,
            })) || [])
        );
      }

      if (likesByType['episode']?.length > 0) {
        fetchPromises.push(
          supabase.from('episodes')
            .select('id, title, description, created_at, created_by')
            .in('id', likesByType['episode'])
            .then(({ data }) => data?.map(episode => ({
              id: episode.id,
              type: 'episode',
              title: episode.title,
              description: episode.description,
              createdAt: episode.created_at,
              authorId: episode.created_by,
            })) || [])
        );
      }

      // Execute all fetches in parallel
      const results = await Promise.all(fetchPromises);
      
      // Flatten and combine all results
      results.forEach(items => {
        allLikedContent.push(...items);
      });

      // Sort by most recent
      allLikedContent.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setLikedContent(allLikedContent);
    } catch (error) {
      console.error('Error fetching liked content:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      
      // Get list of users the current user is following
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('user_connections')
        .select('following_id')
        .eq('follower_id', profile.id);

      if (connectionsError) throw connectionsError;

      const followingIds = connectionsData?.map(conn => conn.following_id) || [];
      setFollowingCount(followingIds.length);

      const allActivity: FollowingActivity[] = [];
      let authorsMap = new Map<string, { id: string; name: string; avatar?: string }>();

      if (followingIds.length === 0) {
        // Skip people-activity queries but continue to topic/tag queries below
      } else {

      // Fetch posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, title, content, created_at, author_id, circle_ids')
        .in('author_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch threads
      const { data: threadsData } = await supabase
        .from('forum_threads')
        .select('id, title, body, created_at, author_id, circle_ids')
        .in('author_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select('id, title, description, created_at, author_id, circle_ids')
        .in('author_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from('endorsements')
        .select('id, title, body, created_at, author_id, circle_ids')
        .in('author_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch builds
      const { data: buildsData } = await supabase
        .from('builds')
        .select('id, name, description, created_at, created_by, circle_ids')
        .in('created_by', followingIds)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch pitches
      const { data: pitchesData } = await supabase
        .from('pitches')
        .select('id, title, description, created_at, created_by, circle_ids')
        .in('created_by', followingIds)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch events
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, description, created_at, host_id, circle_ids')
        .in('host_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch all author info
      const { data: authorsData } = await supabase
        .from('users')
        .select('id, name, avatar')
        .in('id', followingIds);

      authorsMap = new Map(authorsData?.map(author => [author.id, author]) || []);

      // Process posts
      postsData?.forEach(post => {
        const author = authorsMap.get(post.author_id);
        if (author) {
          allActivity.push({
            id: post.id,
            type: 'post',
            title: post.title || 'Untitled Post',
            description: post.content,
            created_at: post.created_at,
            author,
            circle_ids: post.circle_ids,
          });
        }
      });

      // Process threads
      threadsData?.forEach(thread => {
        const author = authorsMap.get(thread.author_id);
        if (author) {
          allActivity.push({
            id: thread.id,
            type: 'thread',
            title: thread.title,
            description: thread.body,
            created_at: thread.created_at,
            author,
            circle_ids: thread.circle_ids,
          });
        }
      });

      // Process documents
      documentsData?.forEach(doc => {
        const author = authorsMap.get(doc.author_id);
        if (author) {
          allActivity.push({
            id: doc.id,
            type: 'document',
            title: doc.title,
            description: doc.description,
            created_at: doc.created_at,
            author,
            circle_ids: doc.circle_ids,
          });
        }
      });

      // Process reviews
      reviewsData?.forEach(review => {
        const author = authorsMap.get(review.author_id);
        if (author) {
          allActivity.push({
            id: review.id,
            type: 'review',
            title: review.title,
            description: review.body,
            created_at: review.created_at,
            author,
            circle_ids: review.circle_ids,
          });
        }
      });

      // Process builds
      buildsData?.forEach(build => {
        const author = authorsMap.get(build.created_by);
        if (author) {
          allActivity.push({
            id: build.id,
            type: 'build',
            title: build.name,
            description: build.description,
            created_at: build.created_at,
            author,
            circle_ids: build.circle_ids,
          });
        }
      });

      // Process pitches
      pitchesData?.forEach(pitch => {
        const author = authorsMap.get(pitch.created_by);
        if (author) {
          allActivity.push({
            id: pitch.id,
            type: 'pitch',
            title: pitch.title,
            description: pitch.description,
            created_at: pitch.created_at,
            author,
            circle_ids: pitch.circle_ids,
          });
        }
      });

      // Process events
      eventsData?.forEach(event => {
        const author = authorsMap.get(event.host_id);
        if (author) {
          allActivity.push({
            id: event.id,
            type: 'event',
            title: event.title,
            description: event.description,
            created_at: event.created_at,
            author,
            circle_ids: event.circle_ids,
          });
        }
      });

      } // end of people-activity else block

      // ── Topic subscription content ──────────────────────────────────────
      try {
        const { data: topicFollows } = await supabase
          .from('topic_followers')
          .select('topic_id, topics:topic_id(id, name)')
          .eq('user_id', profile.id);

        if (topicFollows && topicFollows.length > 0) {
          const topicIds = topicFollows.map((tf: any) => tf.topic_id);
          const topicNameMap = new Map(topicFollows.map((tf: any) => [tf.topic_id, (tf.topics as any)?.name || 'Topic']));

          const { data: topicLinks } = await supabase
            .from('topic_links')
            .select('content_id, content_type, topic_id')
            .in('topic_id', topicIds)
            .limit(100);

          if (topicLinks && topicLinks.length > 0) {
            const grouped: Record<string, { ids: string[]; topicName: string }[]> = {};
            topicLinks.forEach((link: any) => {
              if (!grouped[link.content_type]) grouped[link.content_type] = [];
              grouped[link.content_type].push({ ids: [link.content_id], topicName: topicNameMap.get(link.topic_id) || 'Topic' });
            });

            const topicContentMap: Record<string, { table: string; titleField: string; descField: string; authorField: string }> = {
              book:     { table: 'books',         titleField: 'title', descField: 'description', authorField: 'created_by' },
              deck:     { table: 'decks',         titleField: 'title', descField: 'description', authorField: 'created_by' },
              document: { table: 'documents',     titleField: 'title', descField: 'description', authorField: 'author_id' },
              course:   { table: 'courses',       titleField: 'title', descField: 'description', authorField: 'created_by' },
              program:  { table: 'programs',      titleField: 'name',  descField: 'description', authorField: 'created_by' },
              episode:  { table: 'episodes',      titleField: 'title', descField: 'description', authorField: 'created_by' },
              post:     { table: 'posts',         titleField: 'title', descField: 'content',     authorField: 'author_id' },
              thread:   { table: 'forum_threads', titleField: 'title', descField: 'body',        authorField: 'author_id' },
              event:    { table: 'events',        titleField: 'title', descField: 'description', authorField: 'host_id' },
              build:    { table: 'builds',        titleField: 'name',  descField: 'description', authorField: 'created_by' },
              pitch:    { table: 'pitches',       titleField: 'title', descField: 'description', authorField: 'created_by' },
              review:   { table: 'endorsements',  titleField: 'title', descField: 'body',        authorField: 'author_id' },
            };

            const seenKeys = new Set(allActivity.map(a => `${a.type}:${a.id}`));

            for (const [contentType, entries] of Object.entries(grouped)) {
              const config = topicContentMap[contentType];
              if (!config) continue;

              const allIds = [...new Set(entries.flatMap(e => e.ids))];
              const { data: rows } = await supabase
                .from(config.table)
                .select(`id, ${config.titleField}, ${config.descField}, created_at, ${config.authorField}`)
                .in('id', allIds)
                .order('created_at', { ascending: false })
                .limit(10);

              if (rows) {
                const authorIds = [...new Set(rows.map((r: any) => r[config.authorField]).filter(Boolean))] as string[];
                let authorMap = new Map<string, any>();
                if (authorIds.length > 0) {
                  const { data: authors } = await supabase.from('users').select('id, name, avatar').in('id', authorIds);
                  authorMap = new Map(authors?.map(a => [a.id, a]) || []);
                }

                rows.forEach((row: any) => {
                  const key = `${contentType}:${row.id}`;
                  if (seenKeys.has(key)) return;
                  seenKeys.add(key);

                  const topicName = entries.find(e => e.ids.includes(row.id))?.topicName || 'Topic';
                  allActivity.push({
                    id: row.id,
                    type: contentType as FollowingActivity['type'],
                    title: row[config.titleField] || 'Untitled',
                    description: row[config.descField],
                    created_at: row.created_at,
                    author: authorMap.get(row[config.authorField]),
                    source: 'topic',
                    sourceName: topicName,
                  });
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching topic subscription content:', err);
      }

      // ── Tag subscription content ──────────────────────────────────────
      try {
        const { data: tagFollows } = await supabase
          .from('tag_followers')
          .select('tag_name')
          .eq('user_id', profile.id);

        if (tagFollows && tagFollows.length > 0) {
          const tagNames = tagFollows.map((tf: any) => tf.tag_name);
          const seenKeys2 = new Set(allActivity.map(a => `${a.type}:${a.id}`));

          const tagTables = [
            { table: 'posts',         type: 'post' as const,     titleField: 'title', descField: 'body',        authorField: 'author_id' },
            { table: 'documents',     type: 'document' as const, titleField: 'title', descField: 'description', authorField: 'author_id' },
            { table: 'episodes',      type: 'episode' as const,  titleField: 'title', descField: 'description', authorField: 'created_by' },
            { table: 'courses',       type: 'course' as const,   titleField: 'title', descField: 'description', authorField: 'created_by' },
            { table: 'books',         type: 'book' as const,     titleField: 'title', descField: 'description', authorField: 'created_by' },
          ];

          const tagResults = await Promise.allSettled(
            tagTables.map(t =>
              supabase.from(t.table)
                .select(`id, ${t.titleField}, ${t.descField}, created_at, ${t.authorField}, tags`)
                .overlaps('tags', tagNames)
                .order('created_at', { ascending: false })
                .limit(10)
            )
          );

          const allAuthorIds = new Set<string>();
          const tagRows: { config: typeof tagTables[0]; rows: any[] }[] = [];

          tagResults.forEach((result, idx) => {
            if (result.status !== 'fulfilled') return;
            const { data, error } = result.value;
            if (error || !data) return;
            tagRows.push({ config: tagTables[idx], rows: data });
            data.forEach((row: any) => {
              const aid = row[tagTables[idx].authorField];
              if (aid) allAuthorIds.add(aid);
            });
          });

          let tagAuthorMap = new Map<string, any>();
          const authorIdsArr = [...allAuthorIds].filter(id => !authorsMap.has(id));
          if (authorIdsArr.length > 0) {
            const { data: authors } = await supabase.from('users').select('id, name, avatar').in('id', authorIdsArr);
            tagAuthorMap = new Map(authors?.map(a => [a.id, a]) || []);
          }
          const mergedAuthors = new Map([...authorsMap, ...tagAuthorMap]);

          tagRows.forEach(({ config, rows }) => {
            rows.forEach((row: any) => {
              const key2 = `${config.type}:${row.id}`;
              if (seenKeys2.has(key2)) return;
              seenKeys2.add(key2);

              const matchingTags = (row.tags || []).filter((t: string) => tagNames.includes(t));
              allActivity.push({
                id: row.id,
                type: config.type,
                title: row[config.titleField] || 'Untitled',
                description: row[config.descField],
                created_at: row.created_at,
                author: mergedAuthors.get(row[config.authorField]),
                source: 'tag',
                sourceName: matchingTags[0] ? `#${matchingTags[0]}` : '#tag',
              });
            });
          });
        }
      } catch (err) {
        console.warn('Error fetching tag subscription content:', err);
      }

      // Sort by most recent
      allActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setFollowingActivity(allActivity.slice(0, 50));
    } catch (error) {
      console.error('Error fetching following activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowers = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      
      // Get list of users following the current user
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('user_connections')
        .select('follower_id')
        .eq('following_id', profile.id);

      if (connectionsError) throw connectionsError;

      const followerIds = connectionsData?.map(conn => conn.follower_id) || [];
      setFollowersCount(followerIds.length);
      
      if (followerIds.length === 0) {
        setFollowersActivity([]);
        setLoading(false);
        return;
      }

      // Fetch recent activity from followers
      const allActivity: FollowingActivity[] = [];

      // Fetch posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, title, content, created_at, author_id, circle_ids')
        .in('author_id', followerIds)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch threads
      const { data: threadsData } = await supabase
        .from('forum_threads')
        .select('id, title, body, created_at, author_id, circle_ids')
        .in('author_id', followerIds)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select('id, title, description, created_at, author_id, circle_ids')
        .in('author_id', followerIds)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from('endorsements')
        .select('id, title, body, created_at, author_id, circle_ids')
        .in('author_id', followerIds)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch builds
      const { data: buildsData } = await supabase
        .from('builds')
        .select('id, name, description, created_at, created_by, circle_ids')
        .in('created_by', followerIds)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch pitches
      const { data: pitchesData } = await supabase
        .from('pitches')
        .select('id, title, description, created_at, created_by, circle_ids')
        .in('created_by', followerIds)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch events
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, description, created_at, host_id, circle_ids')
        .in('host_id', followerIds)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch all author info
      const { data: authorsData } = await supabase
        .from('users')
        .select('id, name, avatar')
        .in('id', followerIds);

      const authorsMap = new Map(authorsData?.map(author => [author.id, author]) || []);

      // Process posts
      postsData?.forEach(post => {
        const author = authorsMap.get(post.author_id);
        if (author) {
          allActivity.push({
            id: post.id,
            type: 'post',
            title: post.title || 'Untitled Post',
            description: post.content,
            created_at: post.created_at,
            author,
            circle_ids: post.circle_ids,
          });
        }
      });

      // Process threads
      threadsData?.forEach(thread => {
        const author = authorsMap.get(thread.author_id);
        if (author) {
          allActivity.push({
            id: thread.id,
            type: 'thread',
            title: thread.title,
            description: thread.body,
            created_at: thread.created_at,
            author,
            circle_ids: thread.circle_ids,
          });
        }
      });

      // Process documents
      documentsData?.forEach(doc => {
        const author = authorsMap.get(doc.author_id);
        if (author) {
          allActivity.push({
            id: doc.id,
            type: 'document',
            title: doc.title,
            description: doc.description,
            created_at: doc.created_at,
            author,
            circle_ids: doc.circle_ids,
          });
        }
      });

      // Process reviews
      reviewsData?.forEach(review => {
        const author = authorsMap.get(review.author_id);
        if (author) {
          allActivity.push({
            id: review.id,
            type: 'review',
            title: review.title,
            description: review.body,
            created_at: review.created_at,
            author,
            circle_ids: review.circle_ids,
          });
        }
      });

      // Process builds
      buildsData?.forEach(build => {
        const author = authorsMap.get(build.created_by);
        if (author) {
          allActivity.push({
            id: build.id,
            type: 'build',
            title: build.name,
            description: build.description,
            created_at: build.created_at,
            author,
            circle_ids: build.circle_ids,
          });
        }
      });

      // Process pitches
      pitchesData?.forEach(pitch => {
        const author = authorsMap.get(pitch.created_by);
        if (author) {
          allActivity.push({
            id: pitch.id,
            type: 'pitch',
            title: pitch.title,
            description: pitch.description,
            created_at: pitch.created_at,
            author,
            circle_ids: pitch.circle_ids,
          });
        }
      });

      // Process events
      eventsData?.forEach(event => {
        const author = authorsMap.get(event.host_id);
        if (author) {
          allActivity.push({
            id: event.id,
            type: 'event',
            title: event.title,
            description: event.description,
            created_at: event.created_at,
            author,
            circle_ids: event.circle_ids,
          });
        }
      });

      // Sort by most recent
      allActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setFollowersActivity(allActivity.slice(0, 50)); // Limit to 50 most recent items
    } catch (error) {
      console.error('Error fetching followers activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFavorites = favorites.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLikedContent = likedContent.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Discovery' }]}
        icon={Star}
        iconBg="bg-yellow-100"
        iconColor="text-yellow-600"
        title="Discovery"
        description="Explore tags, view your favorites, and discover connections"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="favorites" className="gap-2">
            <Star className="w-4 h-4" />
            Favorites
          </TabsTrigger>
          <TabsTrigger value="liked" className="gap-2">
            <Heart className="w-4 h-4" />
            Liked
          </TabsTrigger>
          <TabsTrigger value="following" className="gap-2">
            <Users className="w-4 h-4" />
            Following
          </TabsTrigger>
          <TabsTrigger value="followers" className="gap-2">
            <Users className="w-4 h-4" />
            Follows Me
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-2">
            <Hash className="w-4 h-4" />
            Tags
          </TabsTrigger>
        </TabsList>

        {/* Search */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder={
                  activeTab === 'tags' 
                    ? 'Search tags...' 
                    : activeTab === 'favorites'
                    ? 'Search favorites...'
                    : activeTab === 'liked'
                    ? 'Search liked content...'
                    : 'Search people...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tags Tab */}
        <TabsContent value="tags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Tags ({filteredTags.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading tags...</div>
              ) : filteredTags.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {searchQuery ? 'No tags found matching your search' : 'No tags yet'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTags.map((tagData) => (
                    <Link
                      key={tagData.tag}
                      to={`/tags/${encodeURIComponent(tagData.tag)}`}
                      className="block"
                    >
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-3">
                            <Badge variant="outline" className="font-mono text-base">
                              #{tagData.tag}
                            </Badge>
                            <span className="text-2xl font-bold text-gray-900">
                              {tagData.totalCount}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 text-xs text-gray-600">
                            {tagData.posts > 0 && <span>{tagData.posts} post{tagData.posts !== 1 ? 's' : ''}</span>}
                            {tagData.threads > 0 && <span>• {tagData.threads} thread{tagData.threads !== 1 ? 's' : ''}</span>}
                            {tagData.events > 0 && <span>• {tagData.events} event{tagData.events !== 1 ? 's' : ''}</span>}
                            {tagData.courses > 0 && <span>• {tagData.courses} course{tagData.courses !== 1 ? 's' : ''}</span>}
                            {tagData.documents > 0 && <span>• {tagData.documents} doc{tagData.documents !== 1 ? 's' : ''}</span>}
                            {tagData.reviews > 0 && <span>• {tagData.reviews} review{tagData.reviews !== 1 ? 's' : ''}</span>}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Favorites Tab */}
        <TabsContent value="favorites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Favorites ({filteredFavorites.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading favorites...</div>
              ) : filteredFavorites.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {searchQuery ? 'No favorites found matching your search' : 'No favorites yet. Start adding favorites by clicking the star icon on content!'}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFavorites.map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      to={getContentLink(item)}
                      className="block"
                    >
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <Badge variant="secondary" className="gap-1">
                                {getContentIcon(item.type)}
                                {item.type}
                              </Badge>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 mb-1 truncate">
                                {item.title}
                              </h3>
                              {item.description && (
                                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                  {item.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                Saved {format(new Date(item.created_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Liked Tab */}
        <TabsContent value="liked" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Liked Content ({filteredLikedContent.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading liked content...</div>
              ) : filteredLikedContent.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {searchQuery ? 'No liked content found matching your search' : 'No liked content yet. Start liking content by clicking the heart icon on content!'}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLikedContent.map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      to={getContentLink(item)}
                      className="block"
                    >
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <Badge variant="secondary" className="gap-1">
                                {getContentIcon(item.type)}
                                {item.type}
                              </Badge>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 mb-1 truncate">
                                {item.title}
                              </h3>
                              {item.description && (
                                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                  {item.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                Liked {format(new Date(item.created_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Following Tab */}
        <TabsContent value="following" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Following Feed</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Content from people, topics, and tags you follow</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading activity...</div>
              ) : followingActivity.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="mb-2">No recent activity</p>
                  <p className="text-sm">Follow members, topics, or tags to see their content here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followingActivity.map((item) => (
                    <div key={`${item.type}-${item.id}`}>
                      <Card 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(getContentLink(item))}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            {item.author ? (
                              <Link 
                                to={`/users/${item.author.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-shrink-0"
                              >
                                <Avatar className="w-10 h-10">
                                  <AvatarImage src={item.author.avatar || undefined} />
                                  <AvatarFallback>{item.author.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                              </Link>
                            ) : (
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                  {getContentIcon(item.type)}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {item.author && (
                                  <>
                                    <Link 
                                      to={`/users/${item.author.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="font-semibold text-sm hover:text-indigo-600"
                                    >
                                      {item.author.name}
                                    </Link>
                                    <span className="text-gray-400 text-sm">•</span>
                                  </>
                                )}
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  {getContentIcon(item.type)}
                                  {item.type}
                                </Badge>
                                {item.source && item.source !== 'person' && item.sourceName && (
                                  <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200">
                                    {item.source === 'topic' ? '📌' : '🏷️'} {item.sourceName}
                                  </Badge>
                                )}
                              </div>
                              
                              <h3 className="font-semibold text-gray-900 mb-1 truncate">
                                {item.title}
                              </h3>
                              
                              {item.description && (
                                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                  {item.description}
                                </p>
                              )}
                              
                              <p className="text-xs text-gray-500">
                                {format(new Date(item.created_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Followers Tab */}
        <TabsContent value="followers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity from People Following You ({followersCount})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading activity...</div>
              ) : followersCount === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="mb-2 font-semibold">No one is following you yet</p>
                  <p className="text-sm mb-4">Start engaging with members to attract followers!</p>
                </div>
              ) : followersActivity.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="mb-2">No recent activity</p>
                  <p className="text-sm">The people following you haven't posted anything yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followersActivity.map((item) => (
                    <div key={`${item.type}-${item.id}`}>
                      <Card 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(getContentLink(item))}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            {/* Author Avatar */}
                            <Link 
                              to={`/users/${item.author.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-shrink-0"
                            >
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={item.author.avatar || undefined} />
                                <AvatarFallback>{item.author.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            </Link>
                            
                            <div className="flex-1 min-w-0">
                              {/* Author Name & Content Type */}
                              <div className="flex items-center gap-2 mb-1">
                                <Link 
                                  to={`/users/${item.author.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-semibold text-sm hover:text-indigo-600"
                                >
                                  {item.author.name}
                                </Link>
                                <span className="text-gray-400 text-sm">•</span>
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  {getContentIcon(item.type)}
                                  {item.type}
                                </Badge>
                              </div>
                              
                              {/* Content Title */}
                              <h3 className="font-semibold text-gray-900 mb-1 truncate">
                                {item.title}
                              </h3>
                              
                              {/* Content Description */}
                              {item.description && (
                                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                  {item.description}
                                </p>
                              )}
                              
                              {/* Timestamp */}
                              <p className="text-xs text-gray-500">
                                {format(new Date(item.created_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}