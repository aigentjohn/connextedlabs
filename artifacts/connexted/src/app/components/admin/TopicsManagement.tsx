// Split candidate: ~495 lines — consider extracting TopicCard, TopicEditDialog, and TopicHierarchyTree into sub-components.
import { toast } from 'sonner';

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
  status: 'active' | 'archived';
}

export default function TopicsManagement() {
  const [topics, setTopics] = useState<{ audience: Topic[], purpose: Topic[], theme: Topic[] }>({
    audience: [],
    purpose: [],
    theme: []
  });
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [activeTab, setActiveTab] = useState<'audience' | 'purpose' | 'theme'>('audience');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    color: '#3B82F6',
    topic_type: 'audience' as 'audience' | 'purpose' | 'theme',
    is_featured: false,
  });

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/grouped`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTopics(data.grouped);
        }
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast.error('Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTopic = () => {
    setEditingTopic(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon: '',
      color: '#3B82F6',
      topic_type: activeTab,
      is_featured: false,
    });
    setDialogOpen(true);
  };

  const handleEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
    setFormData({
      name: topic.name,
      slug: topic.slug,
      description: topic.description || '',
      icon: topic.icon || '',
      color: topic.color || '#3B82F6',
      topic_type: topic.topic_type,
      is_featured: topic.is_featured,
    });
    setDialogOpen(true);
  };

  const handleSaveTopic = async () => {
    if (!formData.name || !formData.slug) {
      toast.error('Name and slug are required');
      return;
    }

    setLoading(true);
    try {
      const url = editingTopic
        ? `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/${editingTopic.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics`;

      const response = await fetch(url, {
        method: editingTopic ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingTopic ? 'Topic updated' : 'Topic created');
        setDialogOpen(false);
        fetchTopics();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save topic');
      }
    } catch (error) {
      console.error('Error saving topic:', error);
      toast.error('Failed to save topic');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeatured = async (topic: Topic) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/${topic.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...topic,
            is_featured: !topic.is_featured,
          }),
        }
      );

      if (response.ok) {
        toast.success(topic.is_featured ? 'Removed from featured' : 'Added to featured');
        fetchTopics();
      }
    } catch (error) {
      console.error('Error toggling featured:', error);
      toast.error('Failed to update topic');
    }
  };

  const handleArchiveTopic = async (topic: Topic) => {
    if (!confirm(`Archive topic "${topic.name}"? This will hide it from users.`)) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/${topic.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...topic,
            status: 'archived',
          }),
        }
      );

      if (response.ok) {
        toast.success('Topic archived');
        fetchTopics();
      }
    } catch (error) {
      console.error('Error archiving topic:', error);
      toast.error('Failed to archive topic');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'audience': return <Users className="w-4 h-4" />;
      case 'purpose': return <Target className="w-4 h-4" />;
      case 'theme': return <Sparkles className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'audience': return 'WHO';
      case 'purpose': return 'WHY';
      case 'theme': return 'THEME';
      default: return type;
    }
  };

  const renderTopicCard = (topic: Topic) => (
    <Card key={topic.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 flex items-center justify-center text-3xl bg-white rounded-lg border-2 border-gray-200">
              {topic.icon || '🏷️'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{topic.name}</CardTitle>
                <Badge 
                  variant="outline"
                  style={{ 
                    borderColor: topic.color || '#gray',
                    color: topic.color || '#gray'
                  }}
                >
                  {getTypeLabel(topic.topic_type)}
                </Badge>
                {topic.is_featured && (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    Featured
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">/{topic.slug}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleFeatured(topic)}
              title={topic.is_featured ? 'Remove from featured' : 'Add to featured'}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditTopic(topic)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleArchiveTopic(topic)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Archive className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {topic.description && (
        <CardContent className="pt-0">
          <p className="text-sm text-gray-600">{topic.description}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {topic.follower_count} followers
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {topic.content_count} items
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );

  return (
    <>
      <div className="space-y-6">
        {/* Header with Create Button */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Topics Management
                </CardTitle>
                <CardDescription className="mt-1.5">
                  Manage WHO/WHY topics for content classification
                </CardDescription>
              </div>
              <Button onClick={handleCreateTopic}>
                <Plus className="w-4 h-4 mr-2" />
                Create Topic
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Topics Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="audience" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Audience (WHO)
              <Badge variant="secondary">{topics.audience.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="purpose" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Purpose (WHY)
              <Badge variant="secondary">{topics.purpose.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="theme" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Themes
              <Badge variant="secondary">{topics.theme.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audience" className="space-y-4 mt-6">
            <div className="text-sm text-gray-600 mb-4">
              <strong>Audience topics</strong> define WHO the content is for (Job Seekers, Entrepreneurs, etc.)
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {topics.audience.map(renderTopicCard)}
            </div>
            {topics.audience.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No audience topics yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="purpose" className="space-y-4 mt-6">
            <div className="text-sm text-gray-600 mb-4">
              <strong>Purpose topics</strong> define WHY users need this content (Career Transition, Skills Development, etc.)
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {topics.purpose.map(renderTopicCard)}
            </div>
            {topics.purpose.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No purpose topics yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="theme" className="space-y-4 mt-6">
            <div className="text-sm text-gray-600 mb-4">
              <strong>Theme topics</strong> are cross-cutting themes and industry sectors (Remote Work, Tech Industry, etc.)
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {topics.theme.map(renderTopicCard)}
            </div>
            {topics.theme.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No theme topics yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTopic ? 'Edit Topic' : 'Create New Topic'}
            </DialogTitle>
            <DialogDescription>
              Topics help users find content based on WHO it's for and WHY they need it
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({
                      ...formData,
                      name,
                      slug: formData.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                    });
                  }}
                  placeholder="e.g., Job Seekers"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g., job-seekers"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe who this topic is for or what purpose it serves"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.topic_type}
                  onValueChange={(value: any) => setFormData({ ...formData, topic_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="audience">Audience (WHO)</SelectItem>
                    <SelectItem value="purpose">Purpose (WHY)</SelectItem>
                    <SelectItem value="theme">Theme</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">Icon (Emoji)</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="🔍"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="featured"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="featured" className="cursor-pointer">
                Featured topic (show prominently in selection interface)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTopic} disabled={loading}>
              {loading ? 'Saving...' : editingTopic ? 'Update Topic' : 'Create Topic'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}