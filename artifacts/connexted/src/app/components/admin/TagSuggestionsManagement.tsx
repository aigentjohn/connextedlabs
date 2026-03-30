// Split candidate: ~568 lines — consider extracting SuggestionQueue, ModerationActionsBar, and SuggestionFilters into sub-components.
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Plus, Edit, Archive, Hash, Lightbulb, Settings, CheckCircle, XCircle, Clock } from 'lucide-react';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { toast } from 'sonner';

interface TagSuggestion {
  id: string;
  tag: string;
  type: 'what' | 'how' | 'status';
  description: string | null;
  category: string | null;
  is_official: boolean;
  status: 'active' | 'archived';
  usage_count: number;
}

interface UserGeneratedTag {
  id: string;
  tag: string;
  status: 'pending' | 'approved' | 'rejected' | 'merged';
  merged_into: string | null;
  usage_count: number;
  content_count: number;
  first_used_at: string;
}

export default function TagSuggestionsManagement() {
  const [suggestions, setSuggestions] = useState<{ what: TagSuggestion[], how: TagSuggestion[], status: TagSuggestion[] }>({
    what: [],
    how: [],
    status: []
  });
  const [userTags, setUserTags] = useState<UserGeneratedTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagSuggestion | null>(null);
  const [activeTab, setActiveTab] = useState<'what' | 'how' | 'user-generated'>('what');

  // Form state
  const [formData, setFormData] = useState({
    tag: '',
    type: 'what' as 'what' | 'how' | 'status',
    description: '',
    category: '',
  });

  useEffect(() => {
    fetchTagSuggestions();
    fetchUserGeneratedTags();
  }, []);

  const fetchTagSuggestions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/suggestions/grouped`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuggestions(data.grouped);
        }
      }
    } catch (error) {
      console.error('Error fetching tag suggestions:', error);
      toast.error('Failed to load tag suggestions');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGeneratedTags = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/user-generated`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserTags(data.tags);
        }
      }
    } catch (error) {
      console.error('Error fetching user-generated tags:', error);
    }
  };

  const handleCreateTag = () => {
    setEditingTag(null);
    setFormData({
      tag: '',
      type: activeTab === 'user-generated' ? 'what' : activeTab,
      description: '',
      category: '',
    });
    setDialogOpen(true);
  };

  const handleEditTag = (tag: TagSuggestion) => {
    setEditingTag(tag);
    setFormData({
      tag: tag.tag,
      type: tag.type,
      description: tag.description || '',
      category: tag.category || '',
    });
    setDialogOpen(true);
  };

  const handleSaveTag = async () => {
    if (!formData.tag) {
      toast.error('Tag is required');
      return;
    }

    setLoading(true);
    try {
      const url = editingTag
        ? `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/suggestions/${editingTag.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/suggestions`;

      const response = await fetch(url, {
        method: editingTag ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingTag ? 'Tag updated' : 'Tag created');
        setDialogOpen(false);
        fetchTagSuggestions();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save tag');
      }
    } catch (error) {
      console.error('Error saving tag:', error);
      toast.error('Failed to save tag');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUserTag = async (userTag: UserGeneratedTag, type: 'what' | 'how') => {
    try {
      // Create official tag
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/suggestions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tag: userTag.tag,
            type,
            description: '',
            category: '',
          }),
        }
      );

      if (response.ok) {
        // Mark user tag as approved
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/user-generated/${userTag.id}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'approved' }),
          }
        );

        toast.success(`Tag "${userTag.tag}" approved and added to ${type.toUpperCase()} suggestions`);
        fetchTagSuggestions();
        fetchUserGeneratedTags();
      }
    } catch (error) {
      console.error('Error approving tag:', error);
      toast.error('Failed to approve tag');
    }
  };

  const handleRejectUserTag = async (userTag: UserGeneratedTag) => {
    if (!confirm(`Reject tag "${userTag.tag}"?`)) return;

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/user-generated/${userTag.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'rejected' }),
        }
      );

      toast.success('Tag rejected');
      fetchUserGeneratedTags();
    } catch (error) {
      console.error('Error rejecting tag:', error);
      toast.error('Failed to reject tag');
    }
  };

  const handleArchiveTag = async (tag: TagSuggestion) => {
    if (!confirm(`Archive tag "${tag.tag}"?`)) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/suggestions/${tag.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...tag,
            status: 'archived',
          }),
        }
      );

      if (response.ok) {
        toast.success('Tag archived');
        fetchTagSuggestions();
      }
    } catch (error) {
      console.error('Error archiving tag:', error);
      toast.error('Failed to archive tag');
    }
  };

  const renderTagBadge = (tag: TagSuggestion) => (
    <div
      key={tag.id}
      className="group flex items-center justify-between gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{tag.tag}</span>
            <Badge variant="outline" className="text-xs">
              {tag.type.toUpperCase()}
            </Badge>
            {tag.category && (
              <Badge variant="secondary" className="text-xs">
                {tag.category}
              </Badge>
            )}
            {tag.usage_count > 0 && (
              <span className="text-xs text-gray-500">
                Used {tag.usage_count}x
              </span>
            )}
          </div>
          {tag.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-1">{tag.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEditTag(tag)}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleArchiveTag(tag)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Archive className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const renderUserGeneratedTag = (userTag: UserGeneratedTag) => (
    <div
      key={userTag.id}
      className="group flex items-center justify-between gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{userTag.tag}</span>
            <Badge
              variant={
                userTag.status === 'pending' ? 'default' :
                userTag.status === 'approved' ? 'outline' :
                'secondary'
              }
              className="text-xs"
            >
              {userTag.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
              {userTag.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
              {userTag.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
              {userTag.status}
            </Badge>
            <span className="text-xs text-gray-500">
              Used by {userTag.content_count} items, {userTag.usage_count}x total
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            First used {new Date(userTag.first_used_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {userTag.status === 'pending' && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleApproveUserTag(userTag, 'what')}
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            WHAT
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleApproveUserTag(userTag, 'how')}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            HOW
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRejectUserTag(userTag)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );

  const pendingCount = userTags.filter(t => t.status === 'pending').length;

  return (
    <>
      <div className="space-y-6">
        {/* Header with Create Button */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="w-5 h-5" />
                  Tag Suggestions Management
                </CardTitle>
                <CardDescription className="mt-1.5">
                  Manage curated WHAT/HOW tags and review user-generated tags
                </CardDescription>
              </div>
              <Button onClick={handleCreateTag}>
                <Plus className="w-4 h-4 mr-2" />
                Create Tag
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Tags Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="what" className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              WHAT Tags
              <Badge variant="secondary">{suggestions.what.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="how" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              HOW Tags
              <Badge variant="secondary">{suggestions.how.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="user-generated" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              User Tags
              {pendingCount > 0 && (
                <Badge className="bg-orange-500">{pendingCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="what" className="space-y-4 mt-6">
            <div className="text-sm text-gray-600 mb-4">
              <strong>WHAT tags</strong> describe the subject matter or topic (e.g., resume-writing, networking, fundraising)
            </div>
            <div className="space-y-2">
              {suggestions.what.map(renderTagBadge)}
            </div>
            {suggestions.what.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Hash className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No WHAT tags yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="how" className="space-y-4 mt-6">
            <div className="text-sm text-gray-600 mb-4">
              <strong>HOW tags</strong> describe the format or method (e.g., step-by-step, video, interactive, template)
            </div>
            <div className="space-y-2">
              {suggestions.how.map(renderTagBadge)}
            </div>
            {suggestions.how.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No HOW tags yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="user-generated" className="space-y-4 mt-6">
            <div className="text-sm text-gray-600 mb-4">
              <strong>User-generated tags</strong> created by members. Review and approve to add to official suggestions.
            </div>
            <div className="space-y-2">
              {userTags.map(renderUserGeneratedTag)}
            </div>
            {userTags.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No user-generated tags yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingTag ? 'Edit Tag Suggestion' : 'Create New Tag Suggestion'}
            </DialogTitle>
            <DialogDescription>
              Tags help users describe WHAT content is about and HOW it's delivered
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tag">Tag *</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="tag"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value.toLowerCase() })}
                    placeholder="e.g., step-by-step"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="what">WHAT (subject/topic)</SelectItem>
                    <SelectItem value="how">HOW (format/method)</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., career, business, technical"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Help users understand when to use this tag"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTag} disabled={loading}>
              {loading ? 'Saving...' : editingTag ? 'Update Tag' : 'Create Tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}