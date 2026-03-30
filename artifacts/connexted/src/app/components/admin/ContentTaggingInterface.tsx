import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Search, FileText, BookOpen, Layers, CheckSquare, Calendar, Users2, Tag, Target } from 'lucide-react';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { toast } from 'sonner';
import { TopicSelector } from '@/app/components/unified/TopicSelector';
import { TagSelector } from '@/app/components/unified/TagSelector';

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  topics: string[];
  tags: string[];
  created_at: string;
}

export default function ContentTaggingInterface() {
  const [contentType, setContentType] = useState<'book' | 'deck' | 'document' | 'checklist' | 'circle'>('book');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'tagged' | 'untagged'>('all');
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [editingTopics, setEditingTopics] = useState<string[]>([]);
  const [editingTags, setEditingTags] = useState<string[]>([]);

  useEffect(() => {
    fetchContent();
  }, [contentType]);

  useEffect(() => {
    filterContent();
  }, [content, searchQuery, filterStatus]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/content/${contentType}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setContent(data.items);
        }
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const filterContent = () => {
    let filtered = content;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    // Filter by tagging status
    if (filterStatus === 'tagged') {
      filtered = filtered.filter(item => item.topics.length > 0 || item.tags.length > 0);
    } else if (filterStatus === 'untagged') {
      filtered = filtered.filter(item => item.topics.length === 0 && item.tags.length === 0);
    }

    setFilteredContent(filtered);
  };

  const handleSelectItem = (item: ContentItem) => {
    setSelectedItem(item);
    setEditingTopics(item.topics);
    setEditingTags(item.tags);
  };

  const handleSaveTagging = async () => {
    if (!selectedItem) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/content/${contentType}/${selectedItem.id}/tagging`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topics: editingTopics,
            tags: editingTags,
          }),
        }
      );

      if (response.ok) {
        toast.success('Tags and topics updated');
        fetchContent();
        setSelectedItem(null);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update');
      }
    } catch (error) {
      console.error('Error saving tagging:', error);
      toast.error('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'book': return <BookOpen className="w-4 h-4" />;
      case 'deck': return <Layers className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'checklist': return <CheckSquare className="w-4 h-4" />;
      case 'circle': return <Users2 className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1) + 's';
  };

  const untaggedCount = content.filter(item => item.topics.length === 0 && item.tags.length === 0).length;
  const taggedCount = content.filter(item => item.topics.length > 0 || item.tags.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Content Tagging Interface
          </CardTitle>
          <CardDescription>
            Assign topics (WHO/WHY) and tags (WHAT/HOW) to content for better discoverability
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Content Type Selector */}
            <div className="flex-1">
              <Select value={contentType} onValueChange={(value: any) => setContentType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="book">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Books
                    </div>
                  </SelectItem>
                  <SelectItem value="deck">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Decks
                    </div>
                  </SelectItem>
                  <SelectItem value="document">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Documents
                    </div>
                  </SelectItem>
                  <SelectItem value="checklist">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4" />
                      Checklists
                    </div>
                  </SelectItem>
                  <SelectItem value="circle">
                    <div className="flex items-center gap-2">
                      <Users2 className="w-4 h-4" />
                      Circles
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search content..."
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-48">
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({content.length})</SelectItem>
                  <SelectItem value="tagged">Tagged ({taggedCount})</SelectItem>
                  <SelectItem value="untagged">Untagged ({untaggedCount})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Content List */}
        <Card className="lg:max-h-[calc(100vh-300px)] overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {getTypeIcon(contentType)}
              {getTypeLabel(contentType)}
            </CardTitle>
            <CardDescription>
              {filteredContent.length} {filteredContent.length === 1 ? 'item' : 'items'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2">
            {filteredContent.map(item => (
              <button
                key={item.id}
                onClick={() => handleSelectItem(item)}
                className={`
                  w-full text-left p-3 rounded-lg border transition-all
                  ${selectedItem?.id === item.id 
                    ? 'bg-blue-50 border-blue-300 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'
                  }
                `}
              >
                <div className="font-medium text-gray-900 mb-1">{item.title}</div>
                {item.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {item.topics.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Target className="w-3 h-3 mr-1" />
                      {item.topics.length} {item.topics.length === 1 ? 'topic' : 'topics'}
                    </Badge>
                  )}
                  {item.tags.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      {item.tags.length} {item.tags.length === 1 ? 'tag' : 'tags'}
                    </Badge>
                  )}
                  {item.topics.length === 0 && item.tags.length === 0 && (
                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                      Untagged
                    </Badge>
                  )}
                </div>
              </button>
            ))}

            {filteredContent.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No content found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tagging Editor */}
        <Card className="lg:max-h-[calc(100vh-300px)] overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedItem ? 'Edit Tags & Topics' : 'Select an Item'}
            </CardTitle>
            <CardDescription>
              {selectedItem 
                ? 'Assign topics and tags to help users discover this content'
                : 'Choose content from the list to start tagging'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-6">
            {selectedItem ? (
              <>
                {/* Item Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-1">{selectedItem.title}</h3>
                  {selectedItem.description && (
                    <p className="text-sm text-gray-600">{selectedItem.description}</p>
                  )}
                </div>

                {/* Topics Selector */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-600" />
                    <h4 className="font-medium text-gray-900">Topics (WHO/WHY)</h4>
                  </div>
                  <TopicSelector
                    value={editingTopics}
                    onChange={setEditingTopics}
                    maxTopics={3}
                  />
                </div>

                {/* Tags Selector */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-600" />
                    <h4 className="font-medium text-gray-900">Tags (WHAT/HOW)</h4>
                  </div>
                  <TagSelector
                    value={editingTags}
                    onChange={setEditingTags}
                    contentType={contentType}
                    maxTags={10}
                    title={selectedItem.title}
                    description={selectedItem.description || ''}
                    showSuggestions={true}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedItem(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSaveTagging}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select content to start tagging</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}