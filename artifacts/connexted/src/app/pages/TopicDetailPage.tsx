import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { 
  Users, Target, Sparkles, UserPlus, FileText, 
  BookOpen, Layers, File, CheckSquare, Calendar,
  MessageCircle, Eye, Heart, Star, GraduationCap, Rocket,
  Video, ListVideo, BookCopy
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ShareInviteButton } from '@/app/components/shared/ShareInviteButton';

interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  topic_type: 'audience' | 'purpose' | 'theme';
  community_id?: string | null;
  is_featured: boolean;
  follower_count: number;
  content_count: number;
}

interface ContentItem {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  views?: number;
  likes?: string[];
  author?: {
    name: string;
    avatar?: string;
  };
}

export default function TopicDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [books, setBooks] = useState<ContentItem[]>([]);
  const [decks, setDecks] = useState<ContentItem[]>([]);
  const [documents, setDocuments] = useState<ContentItem[]>([]);
  const [courses, setCourses] = useState<ContentItem[]>([]);
  const [programs, setPrograms] = useState<ContentItem[]>([]);
  const [episodes, setEpisodes] = useState<ContentItem[]>([]);
  const [playlists, setPlaylists] = useState<ContentItem[]>([]);
  const [magazines, setMagazines] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const { profile } = useAuth();

  useEffect(() => {
    if (slug) {
      fetchTopicAndContent();
    }
  }, [slug]);

  useEffect(() => {
    if (profile && topic?.id) {
      checkFollowStatus();
    }
  }, [profile?.id, topic?.id]);

  const fetchTopicAndContent = async () => {
    try {
      setLoading(true);
      setBooks([]);
      setDecks([]);
      setDocuments([]);
      setCourses([]);
      setPrograms([]);
      setEpisodes([]);
      setPlaylists([]);
      setMagazines([]);

      // Fetch topic details
      const topicResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/${slug}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!topicResponse.ok) {
        throw new Error('Topic not found');
      }

      const topicData = await topicResponse.json();
      setTopic(topicData.topic);

      // Fetch content IDs for this topic
      const contentIdsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/${topicData.topic.id}/content-ids`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (contentIdsResponse.ok) {
        const contentIdsData = await contentIdsResponse.json();
        const contentIds = contentIdsData.contentIds || {};

        await Promise.all([
          fetchBooks(contentIds.book || []),
          fetchDecks(contentIds.deck || []),
          fetchDocuments(contentIds.document || []),
          fetchCourses(contentIds.course || []),
          fetchPrograms(contentIds.program || []),
          fetchEpisodes(contentIds.episode || []),
          fetchPlaylists(contentIds.playlist || []),
          fetchMagazines(contentIds.magazine || []),
        ]);
      }
    } catch (error) {
      console.error('Error fetching topic:', error);
      toast.error('Failed to load topic');
    } finally {
      setLoading(false);
    }
  };

  const fetchBooks = async (ids: string[]) => {
    if (ids.length === 0) return;
    
    const { data, error } = await supabase
      .from('books')
      .select('id, title, description, created_at, created_by, likes')
      .in('id', ids);

    if (error) {
      console.error('Error fetching books:', error);
      return;
    }

    // Fetch authors
    const authorIds = [...new Set(data?.map(b => b.created_by).filter(Boolean))] as string[];
    if (authorIds.length > 0) {
      const { data: authors } = await supabase
        .from('users')
        .select('id, name, avatar')
        .in('id', authorIds);

      const authorMap = new Map(authors?.map(a => [a.id, a]) || []);
      const booksWithAuthors = data?.map(book => ({
        ...book,
        author: authorMap.get(book.created_by),
      })) || [];

      setBooks(booksWithAuthors);
    } else {
      setBooks(data || []);
    }
  };

  const fetchDecks = async (ids: string[]) => {
    if (ids.length === 0) return;
    
    const { data, error } = await supabase
      .from('decks')
      .select('id, title, description, created_at, created_by, likes')
      .in('id', ids);

    if (error) {
      console.error('Error fetching decks:', error);
      return;
    }

    const authorIds = [...new Set(data?.map(d => d.created_by).filter(Boolean))] as string[];
    if (authorIds.length > 0) {
      const { data: authors } = await supabase
        .from('users')
        .select('id, name, avatar')
        .in('id', authorIds);

      const authorMap = new Map(authors?.map(a => [a.id, a]) || []);
      const decksWithAuthors = data?.map(deck => ({
        ...deck,
        author: authorMap.get(deck.created_by),
      })) || [];

      setDecks(decksWithAuthors);
    } else {
      setDecks(data || []);
    }
  };

  const fetchDocuments = async (ids: string[]) => {
    if (ids.length === 0) return;
    
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, description, created_at, author_id, view_count')
      .in('id', ids);

    if (error) {
      console.error('Error fetching documents:', error);
      return;
    }

    const authorIds = [...new Set(data?.map(d => d.author_id).filter(Boolean))] as string[];
    if (authorIds.length > 0) {
      const { data: authors } = await supabase
        .from('users')
        .select('id, name, avatar')
        .in('id', authorIds);

      const authorMap = new Map(authors?.map(a => [a.id, a]) || []);
      const documentsWithAuthors = data?.map(doc => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        created_at: doc.created_at,
        views: doc.view_count,
        author: authorMap.get(doc.author_id),
      })) || [];

      setDocuments(documentsWithAuthors);
    } else {
      setDocuments(data?.map(doc => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        created_at: doc.created_at,
        views: doc.view_count,
      })) || []);
    }
  };

  const fetchCourses = async (ids: string[]) => {
    if (ids.length === 0) return;
    
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, description, created_at, instructor_id, enrollment_count')
      .in('id', ids);

    if (error) {
      console.error('Error fetching courses:', error);
      return;
    }

    const instructorIds = [...new Set(data?.map(c => c.instructor_id).filter(Boolean))] as string[];
    if (instructorIds.length > 0) {
      const { data: instructors } = await supabase
        .from('users')
        .select('id, name, avatar')
        .in('id', instructorIds);

      const instructorMap = new Map(instructors?.map(i => [i.id, i]) || []);
      const coursesWithInstructors = data?.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        created_at: course.created_at,
        views: course.enrollment_count, // Use enrollment count as views equivalent
        author: instructorMap.get(course.instructor_id),
      })) || [];

      setCourses(coursesWithInstructors);
    } else {
      setCourses(data?.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        created_at: course.created_at,
        views: course.enrollment_count,
      })) || []);
    }
  };

  const fetchPrograms = async (ids: string[]) => {
    if (ids.length === 0) return;
    
    const { data, error } = await supabase
      .from('programs')
      .select('id, name, description, created_at, created_by')
      .in('id', ids);

    if (error) {
      console.error('Error fetching programs:', error);
      return;
    }

    const creatorIds = [...new Set(data?.map(p => p.created_by).filter(Boolean))] as string[];
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from('users')
        .select('id, name, avatar')
        .in('id', creatorIds);

      const creatorMap = new Map(creators?.map(c => [c.id, c]) || []);
      const programsWithCreators = data?.map(program => ({
        id: program.id,
        title: program.name, // Map name to title
        description: program.description,
        created_at: program.created_at,
        author: creatorMap.get(program.created_by),
      })) || [];

      setPrograms(programsWithCreators);
    } else {
      setPrograms(data?.map(program => ({
        id: program.id,
        title: program.name,
        description: program.description,
        created_at: program.created_at,
      })) || []);
    }
  };

  const fetchEpisodes = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data, error } = await supabase
      .from('episodes')
      .select('id, title, description, created_at, created_by')
      .in('id', ids);
    if (error) { console.error('Error fetching episodes:', error); return; }

    const creatorIds = [...new Set(data?.map(e => e.created_by).filter(Boolean))] as string[];
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase.from('users').select('id, name, avatar').in('id', creatorIds);
      const map = new Map(creators?.map(c => [c.id, c]) || []);
      setEpisodes(data?.map(e => ({ id: e.id, title: e.title, description: e.description, created_at: e.created_at, author: map.get(e.created_by) })) || []);
    } else {
      setEpisodes(data?.map(e => ({ id: e.id, title: e.title, description: e.description, created_at: e.created_at })) || []);
    }
  };

  const fetchPlaylists = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data, error } = await supabase
      .from('playlists')
      .select('id, name, description, created_at, created_by')
      .in('id', ids);
    if (error) { console.error('Error fetching playlists:', error); return; }

    const creatorIds = [...new Set(data?.map(p => p.created_by).filter(Boolean))] as string[];
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase.from('users').select('id, name, avatar').in('id', creatorIds);
      const map = new Map(creators?.map(c => [c.id, c]) || []);
      setPlaylists(data?.map(p => ({ id: p.id, title: p.name, description: p.description, created_at: p.created_at, author: map.get(p.created_by) })) || []);
    } else {
      setPlaylists(data?.map(p => ({ id: p.id, title: p.name, description: p.description, created_at: p.created_at })) || []);
    }
  };

  const fetchMagazines = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data, error } = await supabase
      .from('magazines')
      .select('id, name, description, created_at, created_by')
      .in('id', ids);
    if (error) { console.error('Error fetching magazines:', error); return; }

    const creatorIds = [...new Set(data?.map(m => m.created_by).filter(Boolean))] as string[];
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase.from('users').select('id, name, avatar').in('id', creatorIds);
      const map = new Map(creators?.map(c => [c.id, c]) || []);
      setMagazines(data?.map(m => ({ id: m.id, title: m.name, description: m.description, created_at: m.created_at, author: map.get(m.created_by) })) || []);
    } else {
      setMagazines(data?.map(m => ({ id: m.id, title: m.name, description: m.description, created_at: m.created_at })) || []);
    }
  };

  const checkFollowStatus = async () => {
    if (!profile || !topic) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/users/${profile.id}/topics/${topic.id}/following`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.isFollowing);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!profile || !topic) return;

    try {
      const endpoint = isFollowing ? 'unfollow' : 'follow';
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/${topic.id}/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: profile.id }),
        }
      );

      if (response.ok) {
        setIsFollowing(!isFollowing);
        toast.success(isFollowing ? 'Unfollowed topic' : 'Following topic!');
        
        // Update follower count
        if (topic) {
          setTopic({
            ...topic,
            follower_count: topic.follower_count + (isFollowing ? -1 : 1),
          });
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    }
  };

  const getTypeIcon = () => {
    if (!topic) return null;
    switch (topic.topic_type) {
      case 'audience': return <Users className="w-6 h-6" />;
      case 'purpose': return <Target className="w-6 h-6" />;
      case 'theme': return <Sparkles className="w-6 h-6" />;
      default: return null;
    }
  };

  const getTypeLabel = () => {
    if (!topic) return '';
    switch (topic.topic_type) {
      case 'audience': return 'WHO';
      case 'purpose': return 'WHY';
      case 'theme': return 'THEME';
      default: return topic.topic_type;
    }
  };

  const renderContentItem = (item: ContentItem, type: 'book' | 'deck' | 'document' | 'course' | 'program' | 'episode' | 'playlist' | 'magazine') => {
    const Icon = type === 'book' ? BookOpen : 
                 type === 'deck' ? Layers : 
                 type === 'course' ? GraduationCap : 
                 type === 'program' ? Rocket :
                 type === 'episode' ? Video :
                 type === 'playlist' ? ListVideo :
                 type === 'magazine' ? BookCopy : File;
    
    const basePath = type === 'book' ? '/books' : 
                     type === 'deck' ? '/decks' : 
                     type === 'course' ? '/courses' : 
                     type === 'program' ? '/programs' :
                     type === 'episode' ? '/episodes' :
                     type === 'playlist' ? '/playlists' :
                     type === 'magazine' ? '/magazines' : '/documents';

    return (
      <Link key={item.id} to={`${basePath}/${item.id}`}>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Icon className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {item.author && (
                    <span>{item.author.name}</span>
                  )}
                  {item.views !== undefined && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {item.views}
                    </span>
                  )}
                  {item.likes && (
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {item.likes.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Loading topic...</p>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">Topic not found</h2>
            <p className="text-gray-600 mb-4">The topic you're looking for doesn't exist.</p>
            <Button asChild>
              <Link to="/topics">Browse Topics</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalContent = books.length + decks.length + documents.length + courses.length + programs.length + episodes.length + playlists.length + magazines.length;
  const allContent = [...books, ...decks, ...documents, ...courses, ...programs, ...episodes, ...playlists, ...magazines].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Topics', path: '/topics' },
          { label: topic.name, path: `/topics/${topic.slug}` },
        ]}
      />

      {/* Topic Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4 flex-1">
              <div 
                className="flex-shrink-0 w-16 h-16 flex items-center justify-center text-3xl rounded-xl border-2"
                style={{ 
                  backgroundColor: topic.color ? `${topic.color}15` : '#EEF2FF',
                  borderColor: topic.color || '#3B82F6'
                }}
              >
                {topic.icon || '🏷️'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {topic.name}
                  </h1>
                  <Badge 
                    variant="outline"
                    style={{ 
                      borderColor: topic.color || '#3B82F6',
                      color: topic.color || '#3B82F6'
                    }}
                  >
                    {getTypeLabel()}
                  </Badge>
                </div>
                {topic.description && (
                  <p className="text-gray-600 mb-4">{topic.description}</p>
                )}
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    {topic.follower_count} followers
                  </span>
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {totalContent} items
                  </span>
                </div>
              </div>
            </div>
            {profile && (
              <div className="flex items-center gap-2">
                <ShareInviteButton
                  entityType="topic"
                  entityId={topic.slug}
                  entityName={topic.name}
                />
                <Button
                  variant={isFollowing ? 'outline' : 'default'}
                  onClick={handleFollowToggle}
                  className="flex-shrink-0"
                >
                  {isFollowing ? (
                    <>
                      <Star className="w-4 h-4 mr-2 fill-current" />
                      Following
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="all">
              All ({totalContent})
            </TabsTrigger>
            {books.length > 0 && (
              <TabsTrigger value="books">
                <BookOpen className="w-4 h-4 mr-1" />
                Books ({books.length})
              </TabsTrigger>
            )}
            {decks.length > 0 && (
              <TabsTrigger value="decks">
                <Layers className="w-4 h-4 mr-1" />
                Decks ({decks.length})
              </TabsTrigger>
            )}
            {documents.length > 0 && (
              <TabsTrigger value="documents">
                <File className="w-4 h-4 mr-1" />
                Docs ({documents.length})
              </TabsTrigger>
            )}
            {courses.length > 0 && (
              <TabsTrigger value="courses">
                <GraduationCap className="w-4 h-4 mr-1" />
                Courses ({courses.length})
              </TabsTrigger>
            )}
            {programs.length > 0 && (
              <TabsTrigger value="programs">
                <Rocket className="w-4 h-4 mr-1" />
                Programs ({programs.length})
              </TabsTrigger>
            )}
            {episodes.length > 0 && (
              <TabsTrigger value="episodes">
                <Video className="w-4 h-4 mr-1" />
                Episodes ({episodes.length})
              </TabsTrigger>
            )}
            {playlists.length > 0 && (
              <TabsTrigger value="playlists">
                <ListVideo className="w-4 h-4 mr-1" />
                Playlists ({playlists.length})
              </TabsTrigger>
            )}
            {magazines.length > 0 && (
              <TabsTrigger value="magazines">
                <BookCopy className="w-4 h-4 mr-1" />
                Magazines ({magazines.length})
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-6 space-y-3">
          {allContent.map((item) => {
            const type: 'book' | 'deck' | 'document' | 'course' | 'program' | 'episode' | 'playlist' | 'magazine' =
              books.some(b => b.id === item.id) ? 'book' :
              decks.some(d => d.id === item.id) ? 'deck' : 
              courses.some(c => c.id === item.id) ? 'course' :
              programs.some(p => p.id === item.id) ? 'program' :
              episodes.some(e => e.id === item.id) ? 'episode' :
              playlists.some(p => p.id === item.id) ? 'playlist' :
              magazines.some(m => m.id === item.id) ? 'magazine' : 'document';
            return renderContentItem(item, type);
          })}
          {allContent.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No content yet for this topic
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="books" className="mt-6 space-y-3">
          {books.map(book => renderContentItem(book, 'book'))}
          {books.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No books for this topic yet
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="decks" className="mt-6 space-y-3">
          {decks.map(deck => renderContentItem(deck, 'deck'))}
          {decks.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No decks for this topic yet
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-6 space-y-3">
          {documents.map(doc => renderContentItem(doc, 'document'))}
          {documents.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No documents for this topic yet
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="courses" className="mt-6 space-y-3">
          {courses.map(course => renderContentItem(course, 'course'))}
          {courses.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No courses for this topic yet
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="programs" className="mt-6 space-y-3">
          {programs.map(program => renderContentItem(program, 'program'))}
          {programs.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No programs for this topic yet
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="episodes" className="mt-6 space-y-3">
          {episodes.map(ep => renderContentItem(ep, 'episode'))}
          {episodes.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No episodes for this topic yet
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="playlists" className="mt-6 space-y-3">
          {playlists.map(pl => renderContentItem(pl, 'playlist'))}
          {playlists.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No playlists for this topic yet
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="magazines" className="mt-6 space-y-3">
          {magazines.map(mag => renderContentItem(mag, 'magazine'))}
          {magazines.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No magazines for this topic yet
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}