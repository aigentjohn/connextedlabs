import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { 
  Search, 
  Hash, 
  TrendingUp, 
  Check, 
  X, 
  Edit,
  Trash2,
  Plus,
  AlertCircle,
  Sparkles,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
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

interface TagSuggestion {
  id: string;
  tag: string;
  type: 'what' | 'how' | 'status';
  description: string | null;
  category: string | null;
  is_official: boolean;
  status: 'active' | 'archived';
  usage_count: number;
  created_at: string;
}

interface UserGeneratedTag {
  id: string;
  tag: string;
  status: 'pending' | 'approved' | 'rejected' | 'merged';
  merged_into: string | null;
  usage_count: number;
  content_count: number;
  first_used_by: string | null;
  first_used_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
}

interface TagAnalytics {
  official: {
    total: number;
    byType: { what: number; how: number; status: number };
    totalUsage: number;
  };
  userGenerated: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    merged: number;
    totalUsage: number;
  };
}

export default function TagManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [officialTags, setOfficialTags] = useState<TagSuggestion[]>([]);
  const [userTags, setUserTags] = useState<UserGeneratedTag[]>([]);
  const [analytics, setAnalytics] = useState<TagAnalytics | null>(null);
  const [selectedTag, setSelectedTag] = useState<TagSuggestion | null>(null);
  const [selectedUserTag, setSelectedUserTag] = useState<UserGeneratedTag | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const { profile } = useAuth();

  const [formData, setFormData] = useState({
    tag: '',
    type: 'what' as 'what' | 'how' | 'status',
    description: '',
    category: '',
  });

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'super') {
      fetchAllData();
    }
  }, [profile]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchOfficialTags(),
        fetchUserGeneratedTags(),
        fetchAnalytics(),
      ]);
    } catch (error) {
      console.error('Error fetching tag data:', error);
      toast.error('Failed to load tag data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficialTags = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/suggestions`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOfficialTags(data.suggestions);
        }
      }
    } catch (error) {
      console.error('Error fetching official tags:', error);
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

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/analytics`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnalytics(data.analytics);
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleCreateTag = async () => {
    if (!formData.tag || !formData.type || !profile?.id) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/suggestions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: profile.id,
            ...formData,
          }),
        }
      );

      if (response.ok) {
        toast.success('Tag created successfully');
        setIsCreateDialogOpen(false);
        setFormData({ tag: '', type: 'what', description: '', category: '' });
        fetchAllData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create tag');
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Failed to create tag');
    }
  };

  const handleUpdateTag = async () => {
    if (!selectedTag || !profile?.id) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/suggestions/${selectedTag.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: profile.id,
            ...formData,
          }),
        }
      );

      if (response.ok) {
        toast.success('Tag updated successfully');
        setIsEditDialogOpen(false);
        setSelectedTag(null);
        fetchAllData();
      } else {
        toast.error('Failed to update tag');
      }
    } catch (error) {
      console.error('Error updating tag:', error);
      toast.error('Failed to update tag');
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!profile?.id || !confirm('Are you sure you want to delete this tag?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/suggestions/${tagId}?userId=${profile.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        toast.success('Tag deleted successfully');
        fetchAllData();
      } else {
        toast.error('Failed to delete tag');
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('Failed to delete tag');
    }
  };

  const handleApproveUserTag = async () => {
    if (!selectedUserTag || !profile?.id) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/user-generated/${selectedUserTag.id}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: profile.id,
            ...formData,
          }),
        }
      );

      if (response.ok) {
        toast.success('Tag approved and promoted to official');
        setIsApproveDialogOpen(false);
        setSelectedUserTag(null);
        fetchAllData();
      } else {
        toast.error('Failed to approve tag');
      }
    } catch (error) {
      console.error('Error approving tag:', error);
      toast.error('Failed to approve tag');
    }
  };

  const handleRejectUserTag = async (tagId: string, notes?: string) => {
    if (!profile?.id) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/user-generated/${tagId}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: profile.id,
            notes,
          }),
        }
      );

      if (response.ok) {
        toast.success('Tag rejected');
        fetchAllData();
      } else {
        toast.error('Failed to reject tag');
      }
    } catch (error) {
      console.error('Error rejecting tag:', error);
      toast.error('Failed to reject tag');
    }
  };

  const filteredOfficialTags = officialTags.filter(tag =>
    tag.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUserTags = userTags.filter(tag =>
    tag.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingUserTags = userTags.filter(tag => tag.status === 'pending');

  if (profile?.role !== 'admin' && profile?.role !== 'super') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/platform-admin' },
          { label: 'Tag Management', href: '/platform-admin/tags' },
        ]}
      />

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Official Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.official.total}</div>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.official.totalUsage} total uses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">WHAT Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{analytics.official.byType.what}</div>
              <p className="text-xs text-gray-500 mt-1">Subject matter tags</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">HOW Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{analytics.official.byType.how}</div>
              <p className="text-xs text-gray-500 mt-1">Format/method tags</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{analytics.userGenerated.pending}</div>
              <p className="text-xs text-gray-500 mt-1">User-generated tags</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Tag Management
              </CardTitle>
              <CardDescription>
                Manage official tag suggestions and review user-generated tags
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setFormData({ tag: '', type: 'what', description: '', category: '' })}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Tag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Official Tag</DialogTitle>
                  <DialogDescription>
                    Add a new official tag suggestion for users
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Tag</Label>
                    <Input
                      value={formData.tag}
                      onChange={(e) => setFormData({ ...formData, tag: e.target.value.toLowerCase() })}
                      placeholder="e.g., fundraising, step-by-step"
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value: 'what' | 'how' | 'status') => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="what">WHAT (Subject Matter)</SelectItem>
                        <SelectItem value="how">HOW (Format/Method)</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., career, business, technical"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what this tag is for..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTag}>Create Tag</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="official" className="space-y-4">
        <TabsList>
          <TabsTrigger value="official">
            Official Tags ({filteredOfficialTags.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending Review ({pendingUserTags.length})
            {pendingUserTags.length > 0 && (
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs text-white">
                {pendingUserTags.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="user-generated">
            All User Tags ({filteredUserTags.length})
          </TabsTrigger>
        </TabsList>

        {/* Official Tags Tab */}
        <TabsContent value="official">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Usage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOfficialTags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-gray-400" />
                        {tag.tag}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tag.type === 'what' ? 'default' : tag.type === 'how' ? 'secondary' : 'outline'}>
                        {tag.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{tag.category || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{tag.description || '-'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{tag.usage_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTag(tag);
                            setFormData({
                              tag: tag.tag,
                              type: tag.type,
                              description: tag.description || '',
                              category: tag.category || '',
                            });
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTag(tag.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Pending Review Tab */}
        <TabsContent value="pending">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Usage Count</TableHead>
                  <TableHead>First Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUserTags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-orange-400" />
                        {tag.tag}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <span>{tag.usage_count}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {new Date(tag.first_used_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Dialog open={isApproveDialogOpen && selectedUserTag?.id === tag.id} onOpenChange={(open) => {
                          setIsApproveDialogOpen(open);
                          if (!open) setSelectedUserTag(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => {
                                setSelectedUserTag(tag);
                                setFormData({ tag: tag.tag, type: 'what', description: '', category: '' });
                              }}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Approve Tag: #{tag.tag}</DialogTitle>
                              <DialogDescription>
                                Promote this user-generated tag to an official tag suggestion
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <Label>Type</Label>
                                <Select 
                                  value={formData.type} 
                                  onValueChange={(value: 'what' | 'how' | 'status') => setFormData({ ...formData, type: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="what">WHAT (Subject Matter)</SelectItem>
                                    <SelectItem value="how">HOW (Format/Method)</SelectItem>
                                    <SelectItem value="status">Status</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Category</Label>
                                <Input
                                  value={formData.category}
                                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                  placeholder="e.g., career, business, technical"
                                />
                              </div>
                              <div>
                                <Label>Description</Label>
                                <Textarea
                                  value={formData.description}
                                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                  placeholder="Describe what this tag is for..."
                                  rows={3}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleApproveUserTag}>Approve & Promote</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRejectUserTag(tag.id)}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingUserTags.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      No pending tags to review
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* All User-Generated Tags Tab */}
        <TabsContent value="user-generated">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage Count</TableHead>
                  <TableHead>First Used</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUserTags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-gray-400" />
                        {tag.tag}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          tag.status === 'approved' ? 'default' :
                          tag.status === 'pending' ? 'secondary' :
                          tag.status === 'rejected' ? 'destructive' :
                          'outline'
                        }
                      >
                        {tag.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span>{tag.usage_count}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {new Date(tag.first_used_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{tag.notes || '-'}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>
              Update the official tag details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Tag</Label>
              <Input
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value.toLowerCase() })}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: 'what' | 'how' | 'status') => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="what">WHAT (Subject Matter)</SelectItem>
                  <SelectItem value="how">HOW (Format/Method)</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTag}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}