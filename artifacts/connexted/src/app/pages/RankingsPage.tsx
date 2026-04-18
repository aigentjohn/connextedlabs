import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { PageHeader } from '@/app/components/shared/PageHeader';
import {
  TrendingUp, Hash, Tag, Search, Crown, Medal,
  FileText, MessageSquare, Calendar, BookOpen, Users,
  Hammer, Lightbulb, Headphones, Presentation, ChevronRight, BookCopy,
} from 'lucide-react';

interface TagRank {
  tag: string;
  original: string;
  count: number;
  tables: { table: string; count: number }[];
}

interface TopicRank {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  topic_type: string;
  content_count: number;
  follower_count: number;
}

const TAG_TABLES = [
  { table: 'documents',     label: 'Documents',  icon: FileText },
  { table: 'episodes',      label: 'Episodes',   icon: Headphones },
  { table: 'books',         label: 'Books',      icon: BookOpen },
  { table: 'decks',         label: 'Decks',      icon: Presentation },
  { table: 'courses',       label: 'Courses',    icon: BookOpen },
  { table: 'forum_threads', label: 'Threads',    icon: MessageSquare },
  { table: 'blogs',         label: 'Blogs',      icon: FileText },
  { table: 'programs',      label: 'Programs',   icon: Users },
  { table: 'tables',        label: 'Tables',     icon: Presentation },
  { table: 'pitches',       label: 'Pitches',    icon: Lightbulb },
  { table: 'circles',       label: 'Circles',    icon: Users },
  { table: 'builds',        label: 'Builds',     icon: Hammer },
  { table: 'standups',      label: 'Standups',   icon: MessageSquare },
  { table: 'sprints',       label: 'Sprints',    icon: Calendar },
  { table: 'meetups',       label: 'Meetups',    icon: Calendar },
  { table: 'playlists',     label: 'Playlists',  icon: Headphones },
  { table: 'magazines',     label: 'Magazines',  icon: FileText },
  { table: 'libraries',     label: 'Libraries',  icon: BookOpen },
  { table: 'checklists',    label: 'Checklists', icon: FileText },
];

function getRankIcon(index: number) {
  if (index === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
  if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
  if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-400">#{index + 1}</span>;
}

function getTopicTypeBadge(type: string) {
  switch (type) {
    case 'audience': return <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">Audience</Badge>;
    case 'purpose':  return <Badge variant="outline" className="text-xs border-green-200 text-green-700">Purpose</Badge>;
    case 'theme':    return <Badge variant="outline" className="text-xs border-purple-200 text-purple-700">Theme</Badge>;
    default:         return null;
  }
}

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState<'tags' | 'topics'>('tags');
  const [tagRanks, setTagRanks] = useState<TagRank[]>([]);
  const [topicRanks, setTopicRanks] = useState<TopicRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchWarning, setFetchWarning] = useState<string | null>(null);
  const fetchIdRef = React.useRef(0);

  useEffect(() => {
    const id = ++fetchIdRef.current;
    if (activeTab === 'tags') {
      fetchTagRanks(id);
    } else {
      fetchTopicRanks(id);
    }
  }, [activeTab]);

  const fetchTagRanks = async (requestId: number) => {
    try {
      setLoading(true);
      setFetchWarning(null);
      const tagMap = new Map<string, { count: number; original: string; tables: { table: string; count: number }[] }>();
      const originalCaseMap = new Map<string, string>();

      const results = await Promise.allSettled(
        TAG_TABLES.map(({ table }) =>
          supabase.from(table).select('tags').not('tags', 'is', null)
        )
      );

      if (fetchIdRef.current !== requestId) return;

      let failedCount = 0;
      results.forEach((result, idx) => {
        if (result.status !== 'fulfilled') { failedCount++; return; }
        const { data, error } = result.value;
        if (error) { failedCount++; return; }
        if (!data) return;

        const tableName = TAG_TABLES[idx].label;
        const tableTagCounts = new Map<string, number>();

        data.forEach((row: any) => {
          const rowTags = row.tags;
          if (!Array.isArray(rowTags)) return;
          rowTags.forEach((tag: string) => {
            if (!tag || typeof tag !== 'string') return;
            const trimmed = tag.trim();
            if (!trimmed) return;
            const normalized = trimmed.toLowerCase();
            tableTagCounts.set(normalized, (tableTagCounts.get(normalized) || 0) + 1);
            if (!originalCaseMap.has(normalized)) originalCaseMap.set(normalized, trimmed);
          });
        });

        tableTagCounts.forEach((count, tag) => {
          const existing = tagMap.get(tag) || { count: 0, original: originalCaseMap.get(tag) || tag, tables: [] };
          existing.count += count;
          existing.tables.push({ table: tableName, count });
          tagMap.set(tag, existing);
        });
      });

      const ranked = Array.from(tagMap.entries())
        .map(([tag, data]) => ({ tag, original: data.original, count: data.count, tables: data.tables.sort((a, b) => b.count - a.count) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 100);

      if (failedCount > 0) {
        setFetchWarning(`Some content sources (${failedCount} of ${TAG_TABLES.length}) could not be queried. Rankings may be incomplete.`);
      }
      setTagRanks(ranked);
    } catch (err) {
      console.error('Error fetching tag rankings:', err);
    } finally {
      if (fetchIdRef.current === requestId) setLoading(false);
    }
  };

  const fetchTopicRanks = async (requestId: number) => {
    try {
      setLoading(true);
      setFetchWarning(null);

      const { data: topics, error } = await supabase
        .from('topics')
        .select('id, name, slug, description, icon, topic_type');

      if (fetchIdRef.current !== requestId) return;
      if (error) throw error;
      if (!topics || topics.length === 0) {
        setTopicRanks([]);
        setLoading(false);
        return;
      }

      const topicIds = topics.map(t => t.id);

      const [linksResult, followersResult] = await Promise.allSettled([
        supabase.from('topic_links').select('topic_id').in('topic_id', topicIds),
        supabase.from('topic_followers').select('topic_id').in('topic_id', topicIds),
      ]);

      if (fetchIdRef.current !== requestId) return;

      const contentCounts = new Map<string, number>();
      if (linksResult.status === 'fulfilled' && linksResult.value.data) {
        linksResult.value.data.forEach((row: any) => {
          contentCounts.set(row.topic_id, (contentCounts.get(row.topic_id) || 0) + 1);
        });
      }

      const followerCounts = new Map<string, number>();
      if (followersResult.status === 'fulfilled' && followersResult.value.data) {
        followersResult.value.data.forEach((row: any) => {
          followerCounts.set(row.topic_id, (followerCounts.get(row.topic_id) || 0) + 1);
        });
      }

      const ranked: TopicRank[] = topics
        .map(t => ({
          ...t,
          content_count: contentCounts.get(t.id) || 0,
          follower_count: followerCounts.get(t.id) || 0,
        }))
        .sort((a, b) => b.content_count - a.content_count || b.follower_count - a.follower_count)
        .slice(0, 100);

      setTopicRanks(ranked);
    } catch (err) {
      console.error('Error fetching topic rankings:', err);
    } finally {
      if (fetchIdRef.current === requestId) setLoading(false);
    }
  };

  const filteredTags = tagRanks.filter(t =>
    t.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTopics = topicRanks.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <PageHeader
        breadcrumbs={[{ label: 'Rankings' }]}
        icon={TrendingUp}
        iconBg="bg-amber-100"
        iconColor="text-amber-600"
        title="Rankings"
        description="The most used tags and most active topics across the platform"
      />

      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tags' | 'topics')}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <TabsList>
              <TabsTrigger value="tags" className="gap-1.5">
                <Hash className="w-4 h-4" />
                Top Tags
              </TabsTrigger>
              <TabsTrigger value="topics" className="gap-1.5">
                <Tag className="w-4 h-4" />
                Top Topics
              </TabsTrigger>
            </TabsList>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {fetchWarning && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              {fetchWarning}
            </div>
          )}

          <TabsContent value="tags">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-indigo-600" />
                  Most Used Tags
                  {!loading && <Badge variant="secondary">{filteredTags.length} tags</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12 text-gray-500">Counting tags across all content...</div>
                ) : filteredTags.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {searchQuery ? 'No tags found matching your search' : 'No tagged content yet'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTags.map((item, index) => (
                      <Link
                        key={item.tag}
                        to={`/tags/${encodeURIComponent(item.original)}`}
                        className="block"
                      >
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-200">
                          <div className="flex-shrink-0 w-8 flex justify-center">
                            {getRankIcon(index)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-semibold text-indigo-700 group-hover:text-indigo-900">
                                #{item.tag}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {item.count} {item.count === 1 ? 'use' : 'uses'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.tables.slice(0, 5).map(t => (
                                <span key={t.table} className="text-xs text-gray-500">
                                  {t.table}: {t.count}
                                </span>
                              ))}
                              {item.tables.length > 5 && (
                                <span className="text-xs text-gray-400">+{item.tables.length - 5} more</span>
                              )}
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-indigo-500 h-2 rounded-full"
                                style={{ width: `${Math.min(100, (item.count / (filteredTags[0]?.count || 1)) * 100)}%` }}
                              />
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="topics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-purple-600" />
                  Most Active Topics
                  {!loading && <Badge variant="secondary">{filteredTopics.length} topics</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12 text-gray-500">Calculating topic activity...</div>
                ) : filteredTopics.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {searchQuery ? 'No topics found matching your search' : 'No topics yet'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTopics.map((topic, index) => (
                      <Link
                        key={topic.id}
                        to={`/topics/${topic.slug}`}
                        className="block"
                      >
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-200">
                          <div className="flex-shrink-0 w-8 flex justify-center">
                            {getRankIcon(index)}
                          </div>

                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-lg">
                            {topic.icon || '📌'}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900 group-hover:text-purple-700 truncate">
                                {topic.name}
                              </span>
                              {getTopicTypeBadge(topic.topic_type)}
                            </div>
                            {topic.description && (
                              <p className="text-sm text-gray-500 line-clamp-1">{topic.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span>{topic.content_count} {topic.content_count === 1 ? 'item' : 'items'} linked</span>
                              <span>{topic.follower_count} {topic.follower_count === 1 ? 'watcher' : 'watchers'}</span>
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-purple-500 h-2 rounded-full"
                                style={{ width: `${Math.min(100, (topic.content_count / (filteredTopics[0]?.content_count || 1)) * 100)}%` }}
                              />
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
