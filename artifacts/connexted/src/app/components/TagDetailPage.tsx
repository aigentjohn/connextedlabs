import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';
import {
  FileText, MessageSquare, Calendar, BookOpen, ThumbsUp, Hash, Filter,
  ArrowLeft, Users, Hammer, Table, TrendingUp, Presentation,
  CalendarClock, Handshake, Image as ImageIcon, BookCopy, Library,
  CheckSquare, Sparkles, ListVideo, Video, Rocket, Bell,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { format } from 'date-fns';
import { Button } from '@/app/components/ui/button';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

type ContentType =
  | 'post' | 'thread' | 'event' | 'course' | 'document' | 'review'
  | 'circle' | 'build' | 'pitch' | 'standup' | 'sprint' | 'meetup'
  | 'playlist' | 'episode' | 'book' | 'deck' | 'library'
  | 'magazine' | 'program' | 'checklist' | 'prompt' | 'table';

interface TaggedContent {
  id: string;
  type: ContentType;
  title: string;
  description?: string;
  created_at: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  circle_ids?: string[];
  tags: string[];
}

type ContentTypeFilter = Record<ContentType, boolean>;

const ALL_TYPES: ContentType[] = [
  'post', 'thread', 'event', 'course', 'document', 'review',
  'circle', 'build', 'pitch', 'standup', 'sprint', 'meetup',
  'playlist', 'episode', 'book', 'deck', 'library',
  'magazine', 'program', 'checklist', 'prompt', 'table',
];

const TYPE_META: Record<ContentType, { label: string; plural: string; icon: React.ReactNode; group: 'content' | 'container' }> = {
  post:      { label: 'Post',         plural: 'Posts',          icon: <FileText className="w-4 h-4" />,       group: 'content' },
  thread:    { label: 'Thread',       plural: 'Forum Threads',  icon: <MessageSquare className="w-4 h-4" />,  group: 'content' },
  event:     { label: 'Event',        plural: 'Events',         icon: <Calendar className="w-4 h-4" />,       group: 'content' },
  course:    { label: 'Course',       plural: 'Courses',        icon: <BookOpen className="w-4 h-4" />,       group: 'content' },
  document:  { label: 'Document',     plural: 'Documents',      icon: <FileText className="w-4 h-4" />,       group: 'content' },
  review:    { label: 'Review',       plural: 'Reviews',        icon: <ThumbsUp className="w-4 h-4" />,       group: 'content' },
  episode:   { label: 'Episode',      plural: 'Episodes',       icon: <Video className="w-4 h-4" />,          group: 'content' },
  book:      { label: 'Book',         plural: 'Books',          icon: <BookOpen className="w-4 h-4" />,       group: 'content' },
  deck:      { label: 'Deck',         plural: 'Decks',          icon: <Presentation className="w-4 h-4" />,   group: 'content' },
  program:   { label: 'Program',      plural: 'Programs',       icon: <Rocket className="w-4 h-4" />,         group: 'content' },
  magazine:  { label: 'Magazine',     plural: 'Magazines',      icon: <BookCopy className="w-4 h-4" />,       group: 'container' },
  circle:    { label: 'Circle',       plural: 'Circles',        icon: <Users className="w-4 h-4" />,          group: 'container' },
  build:     { label: 'Build',        plural: 'Builds',         icon: <Hammer className="w-4 h-4" />,         group: 'container' },
  pitch:     { label: 'Pitch',        plural: 'Pitches',        icon: <Presentation className="w-4 h-4" />,   group: 'container' },
  standup:   { label: 'Standup',      plural: 'Standups',       icon: <MessageSquare className="w-4 h-4" />,  group: 'container' },
  sprint:    { label: 'Sprint',       plural: 'Sprints',        icon: <CalendarClock className="w-4 h-4" />,  group: 'container' },
  meetup:    { label: 'Meetup',       plural: 'Meetups',        icon: <Handshake className="w-4 h-4" />,      group: 'container' },
  playlist:  { label: 'Playlist',     plural: 'Playlists',      icon: <ListVideo className="w-4 h-4" />,      group: 'container' },
  library:   { label: 'Library',      plural: 'Libraries',      icon: <Library className="w-4 h-4" />,        group: 'container' },
  checklist: { label: 'List',          plural: 'Lists',           icon: <CheckSquare className="w-4 h-4" />,    group: 'container' },
  prompt:    { label: 'Prompt',       plural: 'Prompts',        icon: <Sparkles className="w-4 h-4" />,       group: 'container' },
  table:     { label: 'Table',        plural: 'Tables',         icon: <Table className="w-4 h-4" />,          group: 'container' },
};

interface TableQuery {
  table: string;
  type: ContentType;
  select: string;
  titleField: string;
  descField: string;
}

const TABLE_QUERIES: TableQuery[] = [
  // Content
  { table: 'documents',     type: 'document',  select: 'id, title, description, created_at, author_id, circle_ids, tags',   titleField: 'title', descField: 'description' },
  { table: 'episodes',      type: 'episode',   select: 'id, title, description, created_at, created_by, tags',              titleField: 'title', descField: 'description' },
  { table: 'books',         type: 'book',      select: 'id, title, description, created_at, created_by, tags',              titleField: 'title', descField: 'description' },
  { table: 'decks',         type: 'deck',      select: 'id, title, description, created_at, created_by, tags',              titleField: 'title', descField: 'description' },
  { table: 'courses',       type: 'course',    select: 'id, title, description, created_at, instructor_id, tags',           titleField: 'title', descField: 'description' },
  { table: 'reviews',       type: 'review',    select: 'id, title, content, created_at, author_id, tags',                   titleField: 'title', descField: 'content' },
  { table: 'blogs',         type: 'post',      select: 'id, title, description, created_at, author_id, tags',               titleField: 'title', descField: 'description' },
  { table: 'events',        type: 'event',     select: 'id, title, description, start_time, host_id, tags',                 titleField: 'title', descField: 'description' },
  { table: 'programs',      type: 'program',   select: 'id, name, description, created_at, created_by, tags',               titleField: 'name',  descField: 'description' },
  // Containers
  { table: 'tables',        type: 'table',     select: 'id, name, description, created_at, created_by, tags, slug',         titleField: 'name',  descField: 'description' },
  { table: 'pitches',       type: 'pitch',     select: 'id, name, description, created_at, created_by, tags',               titleField: 'name',  descField: 'description' },
  { table: 'circles',       type: 'circle',    select: 'id, name, description, created_at, tags',                           titleField: 'name',  descField: 'description' },
  { table: 'builds',        type: 'build',     select: 'id, name, description, created_at, created_by, tags',               titleField: 'name',  descField: 'description' },
  { table: 'standups',      type: 'standup',   select: 'id, name, description, created_at, created_by, tags',               titleField: 'name',  descField: 'description' },
  { table: 'sprints',       type: 'sprint',    select: 'id, name, description, created_at, created_by, tags',               titleField: 'name',  descField: 'description' },
  { table: 'meetups',       type: 'meetup',    select: 'id, name, description, created_at, created_by, tags',               titleField: 'name',  descField: 'description' },
  { table: 'playlists',     type: 'playlist',  select: 'id, name, description, created_at, created_by, tags',               titleField: 'name',  descField: 'description' },
  { table: 'magazines',     type: 'magazine',  select: 'id, name, description, created_at, created_by, tags',               titleField: 'name',  descField: 'description' },
  { table: 'libraries',     type: 'library',   select: 'id, name, description, created_at, created_by, tags',               titleField: 'name',  descField: 'description' },
  { table: 'checklists',    type: 'checklist', select: 'id, name, description, created_at, created_by, tags',               titleField: 'name',  descField: 'description' },
];

const getContentLink = (item: TaggedContent): string => {
  switch (item.type) {
    case 'post':      return `/posts/${item.id}`;
    case 'thread':    return `/forums/thread/${item.id}`;
    case 'event':     return `/events/${item.id}`;
    case 'course':    return `/courses/${item.id}`;
    case 'document':  return `/documents/${item.id}`;
    case 'review':    return `/reviews/${item.id}`;
    case 'episode':   return `/episodes/${item.id}`;
    case 'book':      return `/books/${item.id}`;
    case 'deck':      return `/decks/${item.id}`;
    case 'program':   return `/programs/${item.id}`;
    case 'circle':    return `/circles/${item.id}`;
    case 'build':     return `/builds/${item.id}`;
    case 'pitch':     return `/pitches/${item.id}`;
    case 'standup':   return `/standups/${item.id}`;
    case 'sprint':    return `/sprints/${item.id}`;
    case 'meetup':    return `/meetups/${item.id}`;
    case 'playlist':  return `/playlists/${item.id}`;
    case 'library':   return `/libraries/${item.id}`;
    case 'magazine':  return `/magazines/${item.id}`;
    case 'checklist': return `/checklists/${item.id}`;
    case 'prompt':    return '#';
    case 'table':     return `/tables/${item.id}`;
    default:          return '#';
  }
};

export default function TagDetailPage() {
  const { tagName } = useParams<{ tagName: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<TaggedContent[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const defaultFilters = Object.fromEntries(ALL_TYPES.map(t => [t, true])) as ContentTypeFilter;
  const [contentTypeFilters, setContentTypeFilters] = useState<ContentTypeFilter>(defaultFilters);

  const decodedTag = tagName ? decodeURIComponent(tagName) : '';

  useEffect(() => {
    if (profile && decodedTag) {
      fetchTaggedContent();
      checkFollowStatus();
    }
  }, [profile, decodedTag]);

  const checkFollowStatus = async () => {
    if (!profile || !decodedTag) return;
    const { data } = await supabase
      .from('tag_followers')
      .select('id')
      .eq('user_id', profile.id)
      .eq('tag', decodedTag.toLowerCase())
      .maybeSingle();
    setIsFollowing(!!data);
  };

  const toggleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    try {
      const normalized = decodedTag.toLowerCase();
      if (isFollowing) {
        await supabase.from('tag_followers').delete()
          .eq('user_id', profile.id).eq('tag', normalized);
        setIsFollowing(false);
        toast.success(`Unfollowed #${decodedTag}`);
      } else {
        await supabase.from('tag_followers').insert({ user_id: profile.id, tag: normalized });
        setIsFollowing(true);
        toast.success(`Following #${decodedTag}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update follow');
    } finally {
      setFollowLoading(false);
    }
  };

  const fetchTaggedContent = async () => {
    try {
      setLoading(true);
      const allContent: TaggedContent[] = [];

      const normalizedTag = decodedTag.toLowerCase();
      const results = await Promise.allSettled(
        TABLE_QUERIES.map(q =>
          supabase.from(q.table).select(q.select).not('tags', 'is', null)
        )
      );

      let failedTables: string[] = [];

      results.forEach((result, idx) => {
        const q = TABLE_QUERIES[idx];

        if (result.status === 'rejected') {
          failedTables.push(q.table);
          return;
        }

        const { data, error } = result.value;
        if (error) {
          failedTables.push(q.table);
          return;
        }
        if (!data || data.length === 0) return;

        data.forEach((row: any) => {
          const rowTags = Array.isArray(row.tags) ? row.tags : [];
          const hasMatch = rowTags.some((t: string) => typeof t === 'string' && t.trim().toLowerCase() === normalizedTag);
          if (!hasMatch) return;
          allContent.push({
            id: row.id,
            type: q.type,
            title: row[q.titleField] || 'Untitled',
            description: row[q.descField] || undefined,
            created_at: row.created_at || row.start_time,
            circle_ids: row.circle_ids,
            tags: rowTags,
          });
        });
      });

      if (failedTables.length > 0) {
        console.warn('Tag search skipped for tables:', failedTables);
      }

      allContent.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setContent(allContent);
    } catch (error) {
      console.error('Error fetching tagged content:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleContentType = (type: ContentType) => {
    setContentTypeFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const filteredContent = content.filter(item => contentTypeFilters[item.type]);

  const contentCounts = Object.fromEntries(
    ALL_TYPES.map(t => [t, content.filter(c => c.type === t).length])
  ) as Record<ContentType, number>;

  const typesWithContent = ALL_TYPES.filter(t => contentCounts[t] > 0);
  const contentTypes = typesWithContent.filter(t => TYPE_META[t].group === 'content');
  const containerTypes = typesWithContent.filter(t => TYPE_META[t].group === 'container');

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Discovery', path: '/discovery' },
        { label: `#${decodedTag}` }
      ]} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Link to="/discovery">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Discovery
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-6 h-6 text-gray-500" />
              <h1 className="text-3xl">#{decodedTag}</h1>
            </div>
            <p className="text-gray-600">
              {filteredContent.length} {filteredContent.length === 1 ? 'item' : 'items'} with this tag
            </p>
          </div>
        </div>
        {profile && (
          <Button
            variant={isFollowing ? 'outline' : 'default'}
            size="sm"
            onClick={toggleFollow}
            disabled={followLoading}
            className="shrink-0"
          >
            <Bell className={`w-4 h-4 mr-1.5 ${isFollowing ? 'fill-current text-indigo-500' : ''}`} />
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filter by Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contentTypes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Content</p>
                  {contentTypes.map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`filter-${type}`}
                        checked={contentTypeFilters[type]}
                        onCheckedChange={() => toggleContentType(type)}
                      />
                      <Label htmlFor={`filter-${type}`} className="cursor-pointer flex-1">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            {TYPE_META[type].icon}
                            {TYPE_META[type].plural}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {contentCounts[type]}
                          </Badge>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {containerTypes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Containers</p>
                  {containerTypes.map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`filter-${type}`}
                        checked={contentTypeFilters[type]}
                        onCheckedChange={() => toggleContentType(type)}
                      />
                      <Label htmlFor={`filter-${type}`} className="cursor-pointer flex-1">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            {TYPE_META[type].icon}
                            {TYPE_META[type].plural}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {contentCounts[type]}
                          </Badge>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {typesWithContent.length === 0 && !loading && (
                <p className="text-sm text-gray-500">No content found with this tag</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Content List */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Content with #{decodedTag}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading content...</div>
              ) : filteredContent.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No content found with this tag and selected filters.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredContent.map((item) => (
                    <Card 
                      key={`${item.type}-${item.id}`}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(getContentLink(item))}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <Badge variant="secondary" className="gap-1">
                              {TYPE_META[item.type]?.icon}
                              {TYPE_META[item.type]?.label || item.type}
                            </Badge>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {item.title}
                            </h3>
                            {item.description && (
                              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                {item.description.substring(0, 200)}
                                {item.description.length > 200 ? '...' : ''}
                              </p>
                            )}
                            
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <div className="flex flex-wrap gap-1">
                                {item.tags.slice(0, 5).map(tag => (
                                  <Link 
                                    key={tag} 
                                    to={`/tags/${encodeURIComponent(tag)}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs cursor-pointer hover:bg-gray-100"
                                    >
                                      #{tag}
                                    </Badge>
                                  </Link>
                                ))}
                                {item.tags.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{item.tags.length - 5} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-xs text-gray-500 mt-2">
                              {format(new Date(item.created_at), 'PPp')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}