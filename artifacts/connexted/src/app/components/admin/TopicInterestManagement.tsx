import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { 
  Search, 
  TrendingUp, 
  Users, 
  Circle as CircleIcon, 
  Star, 
  ArrowUpRight,
  Merge,
  Plus,
  Edit,
  Check,
  X,
  Hash,
  Target,
  Sparkles
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface TopicPoolEntry {
  tag: string;
  created_by: string;
  first_used_at: string;
  is_official: boolean;
  official_name: string | null;
  description: string | null;
  category: string | null;
  icon: string | null;
  promoted_at: string | null;
  promoted_by: string | null;
  user_count: number;
  circle_count: number;
  merged_into: string | null;
  merged_at: string | null;
}

interface AudiencePoolEntry {
  tag: string;
  created_by: string;
  first_used_at: string;
  is_official: boolean;
  official_name: string | null;
  description: string | null;
  category: string | null;
  promoted_at: string | null;
  promoted_by: string | null;
  user_count: number;
  circle_count: number;
  merged_into: string | null;
  merged_at: string | null;
}

const TOPIC_CATEGORIES = [
  'Technology',
  'Industry Vertical',
  'Business Function',
  'Business Stage',
  'Business Model',
  'Geographic',
  'Other'
];

const AUDIENCE_CATEGORIES = [
  'Role',
  'Stage',
  'Background',
  'Experience Level',
  'Other'
];

export default function TopicInterestManagement() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('topics');
  const [loading, setLoading] = useState(true);
  
  // Topics
  const [topics, setTopics] = useState<TopicPoolEntry[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<TopicPoolEntry[]>([]);
  const [topicSearch, setTopicSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState<'all' | 'official' | 'unofficial'>('all');
  
  // Audience
  const [audience, setAudience] = useState<AudiencePoolEntry[]>([]);
  const [filteredAudience, setFilteredAudience] = useState<AudiencePoolEntry[]>([]);
  const [audienceSearch, setAudienceSearch] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'official' | 'unofficial'>('all');
  
  // Promotion Dialog
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [promotionType, setPromotionType] = useState<'topic' | 'audience'>('topic');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [officialName, setOfficialName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [icon, setIcon] = useState('');
  
  // Merge Dialog
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeSourceTag, setMergeSourceTag] = useState('');
  const [mergeTargetTag, setMergeTargetTag] = useState('');

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'super') {
      fetchAllData();
    }
  }, [profile]);

  useEffect(() => {
    filterTopics();
  }, [topics, topicSearch, topicFilter]);

  useEffect(() => {
    filterAudience();
  }, [audience, audienceSearch, audienceFilter]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const [topicsRes, audienceRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/all`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/audience/all`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        })
      ]);

      const topicsData = await topicsRes.json();
      const audienceData = await audienceRes.json();

      if (topicsData.success) {
        setTopics(topicsData.topics || []);
      }

      if (audienceData.success) {
        setAudience(audienceData.audience || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filterTopics = () => {
    let filtered = [...topics];

    // Filter by status
    if (topicFilter === 'official') {
      filtered = filtered.filter(t => t.is_official);
    } else if (topicFilter === 'unofficial') {
      filtered = filtered.filter(t => !t.is_official && !t.merged_into);
    }

    // Filter by search
    if (topicSearch) {
      const query = topicSearch.toLowerCase();
      filtered = filtered.filter(t => 
        t.tag.toLowerCase().includes(query) ||
        t.official_name?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query)
      );
    }

    // Sort by usage
    filtered.sort((a, b) => {
      const aTotal = a.user_count + a.circle_count;
      const bTotal = b.user_count + b.circle_count;
      return bTotal - aTotal;
    });

    setFilteredTopics(filtered);
  };

  const filterAudience = () => {
    let filtered = [...audience];

    // Filter by status
    if (audienceFilter === 'official') {
      filtered = filtered.filter(a => a.is_official);
    } else if (audienceFilter === 'unofficial') {
      filtered = filtered.filter(a => !a.is_official && !a.merged_into);
    }

    // Filter by search
    if (audienceSearch) {
      const query = audienceSearch.toLowerCase();
      filtered = filtered.filter(a => 
        a.tag.toLowerCase().includes(query) ||
        a.official_name?.toLowerCase().includes(query) ||
        a.category?.toLowerCase().includes(query)
      );
    }

    // Sort by usage
    filtered.sort((a, b) => {
      const aTotal = a.user_count + a.circle_count;
      const bTotal = b.user_count + b.circle_count;
      return bTotal - aTotal;
    });

    setFilteredAudience(filtered);
  };

  const openPromotionDialog = (tag: string, type: 'topic' | 'audience') => {
    setSelectedTag(tag);
    setPromotionType(type);
    setOfficialName(tag.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    setDescription('');
    setCategory('');
    setIcon('');
    setPromotionDialogOpen(true);
  };

  const handlePromote = async () => {
    if (!officialName || !description || !category) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      const endpoint = promotionType === 'topic' 
        ? '/topics/promote'
        : '/audience/promote';

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tag: selectedTag,
            officialName,
            description,
            category,
            icon: promotionType === 'topic' ? icon : undefined
          })
        }
      );

      const data = await res.json();

      if (data.success) {
        toast.success(`${promotionType === 'topic' ? 'Topic' : 'Audience tag'} promoted successfully`);
        setPromotionDialogOpen(false);
        fetchAllData();
      } else {
        toast.error(data.error || 'Failed to promote');
      }
    } catch (error) {
      console.error('Error promoting:', error);
      toast.error('Failed to promote');
    }
  };

  const openMergeDialog = (sourceTag: string, type: 'topic' | 'audience') => {
    setMergeSourceTag(sourceTag);
    setMergeTargetTag('');
    setPromotionType(type);
    setMergeDialogOpen(true);
  };

  const handleMerge = async () => {
    if (!mergeTargetTag) {
      toast.error('Please select a target tag');
      return;
    }

    if (mergeSourceTag === mergeTargetTag) {
      toast.error('Cannot merge a tag into itself');
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/merge`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sourceTag: mergeSourceTag,
            targetTag: mergeTargetTag
          })
        }
      );

      const data = await res.json();

      if (data.success) {
        toast.success('Tags merged successfully');
        setMergeDialogOpen(false);
        fetchAllData();
      } else {
        toast.error(data.error || 'Failed to merge');
      }
    } catch (error) {
      console.error('Error merging:', error);
      toast.error('Failed to merge');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading topic management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Topic & Interest Management', href: '/platform-admin/topics-interests' }
        ]}
      />

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Hash className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold">Topic & Interest Management</h1>
        </div>
        <p className="text-gray-600">
          Manage topics (interests/focus areas) and audience tags across the platform. Promote frequently used tags to official status.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="topics">
            <Sparkles className="w-4 h-4 mr-2" />
            Topics / Interests
          </TabsTrigger>
          <TabsTrigger value="audience">
            <Target className="w-4 h-4 mr-2" />
            Audience / Roles
          </TabsTrigger>
        </TabsList>

        {/* TOPICS TAB */}
        <TabsContent value="topics" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Topics</p>
                    <p className="text-2xl font-bold">{topics.length}</p>
                  </div>
                  <Hash className="w-8 h-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Official Topics</p>
                    <p className="text-2xl font-bold text-green-600">
                      {topics.filter(t => t.is_official).length}
                    </p>
                  </div>
                  <Star className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Unofficial</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {topics.filter(t => !t.is_official && !t.merged_into).length}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Merged</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {topics.filter(t => t.merged_into).length}
                    </p>
                  </div>
                  <Merge className="w-8 h-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search topics..."
                    value={topicSearch}
                    onChange={(e) => setTopicSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={topicFilter} onValueChange={(v: any) => setTopicFilter(v)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    <SelectItem value="official">Official Only</SelectItem>
                    <SelectItem value="unofficial">Unofficial Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Topics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Topic Usage Report</CardTitle>
              <CardDescription>
                {filteredTopics.length} topic{filteredTopics.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag / Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Members</TableHead>
                    <TableHead className="text-center">Circles</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTopics.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No topics found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTopics.map((topic) => (
                      <TableRow key={topic.tag}>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {topic.icon && <span>{topic.icon}</span>}
                              {topic.official_name || topic.tag}
                            </div>
                            {topic.official_name && (
                              <div className="text-xs text-gray-500">#{topic.tag}</div>
                            )}
                            {topic.description && (
                              <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {topic.description}
                              </div>
                            )}
                            {topic.merged_into && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Merged into: {topic.merged_into}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {topic.category && (
                            <Badge variant="secondary">{topic.category}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="w-4 h-4 text-gray-400" />
                            {topic.user_count}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <CircleIcon className="w-4 h-4 text-gray-400" />
                            {topic.circle_count}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {topic.is_official ? (
                            <Badge className="bg-green-500">
                              <Star className="w-3 h-3 mr-1" />
                              Official
                            </Badge>
                          ) : topic.merged_into ? (
                            <Badge variant="outline">Merged</Badge>
                          ) : (
                            <Badge variant="secondary">Unofficial</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!topic.is_official && !topic.merged_into && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPromotionDialog(topic.tag, 'topic')}
                                >
                                  <ArrowUpRight className="w-4 h-4 mr-1" />
                                  Promote
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openMergeDialog(topic.tag, 'topic')}
                                >
                                  <Merge className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {topic.is_official && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openPromotionDialog(topic.tag, 'topic')}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDIENCE TAB */}
        <TabsContent value="audience" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Tags</p>
                    <p className="text-2xl font-bold">{audience.length}</p>
                  </div>
                  <Target className="w-8 h-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Official Tags</p>
                    <p className="text-2xl font-bold text-green-600">
                      {audience.filter(a => a.is_official).length}
                    </p>
                  </div>
                  <Star className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Unofficial</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {audience.filter(a => !a.is_official && !a.merged_into).length}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Merged</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {audience.filter(a => a.merged_into).length}
                    </p>
                  </div>
                  <Merge className="w-8 h-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search audience tags..."
                    value={audienceSearch}
                    onChange={(e) => setAudienceSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={audienceFilter} onValueChange={(v: any) => setAudienceFilter(v)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    <SelectItem value="official">Official Only</SelectItem>
                    <SelectItem value="unofficial">Unofficial Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Audience Table */}
          <Card>
            <CardHeader>
              <CardTitle>Audience Tag Usage Report</CardTitle>
              <CardDescription>
                {filteredAudience.length} tag{filteredAudience.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag / Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Members</TableHead>
                    <TableHead className="text-center">Circles</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAudience.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No audience tags found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAudience.map((aud) => (
                      <TableRow key={aud.tag}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {aud.official_name || aud.tag}
                            </div>
                            {aud.official_name && (
                              <div className="text-xs text-gray-500">#{aud.tag}</div>
                            )}
                            {aud.description && (
                              <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {aud.description}
                              </div>
                            )}
                            {aud.merged_into && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Merged into: {aud.merged_into}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {aud.category && (
                            <Badge variant="secondary">{aud.category}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="w-4 h-4 text-gray-400" />
                            {aud.user_count}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <CircleIcon className="w-4 h-4 text-gray-400" />
                            {aud.circle_count}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {aud.is_official ? (
                            <Badge className="bg-green-500">
                              <Star className="w-3 h-3 mr-1" />
                              Official
                            </Badge>
                          ) : aud.merged_into ? (
                            <Badge variant="outline">Merged</Badge>
                          ) : (
                            <Badge variant="secondary">Unofficial</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!aud.is_official && !aud.merged_into && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPromotionDialog(aud.tag, 'audience')}
                                >
                                  <ArrowUpRight className="w-4 h-4 mr-1" />
                                  Promote
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openMergeDialog(aud.tag, 'audience')}
                                >
                                  <Merge className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {aud.is_official && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openPromotionDialog(aud.tag, 'audience')}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Promotion Dialog */}
      <Dialog open={promotionDialogOpen} onOpenChange={setPromotionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Promote {promotionType === 'topic' ? 'Topic' : 'Audience Tag'} to Official
            </DialogTitle>
            <DialogDescription>
              Make this {promotionType} an official, curated {promotionType} with rich metadata
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Current Tag</Label>
              <Input value={selectedTag} disabled />
            </div>

            <div>
              <Label>Official Name *</Label>
              <Input
                value={officialName}
                onChange={(e) => setOfficialName(e.target.value)}
                placeholder="e.g., Artificial Intelligence"
              />
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this topic covers..."
                rows={3}
              />
            </div>

            <div>
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {(promotionType === 'topic' ? TOPIC_CATEGORIES : AUDIENCE_CATEGORIES).map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {promotionType === 'topic' && (
              <div>
                <Label>Icon (Optional)</Label>
                <Input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="e.g., 🤖 (emoji)"
                  maxLength={2}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPromotionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePromote}>
              <Check className="w-4 h-4 mr-2" />
              Promote to Official
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Tags</DialogTitle>
            <DialogDescription>
              Combine duplicate or similar tags into one official tag
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Source Tag (will be merged)</Label>
              <Input value={mergeSourceTag} disabled />
            </div>

            <div>
              <Label>Target Tag (keep this one) *</Label>
              <Input
                value={mergeTargetTag}
                onChange={(e) => setMergeTargetTag(e.target.value)}
                placeholder="Enter target tag name"
              />
              <p className="text-xs text-gray-500 mt-1">
                All members and circles using "{mergeSourceTag}" will be updated to use "{mergeTargetTag}"
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMerge}>
              <Merge className="w-4 h-4 mr-2" />
              Merge Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}