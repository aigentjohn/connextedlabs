import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { Plus, Save, ArrowLeft, X, FileText, Link as LinkIcon } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';

export default function AddPortfolioItemPage() {
  const { userId } = useParams();
  const { profile: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('external');
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  
  // Documents list
  const [myDocuments, setMyDocuments] = useState<any[]>([]);

  const isOwner = currentUser?.id === userId;

  useEffect(() => {
    if (userId) {
      if (!isOwner) {
        toast.error('You can only add items to your own portfolio');
        navigate(`/portfolio/${userId}`);
        return;
      }
      fetchData();
    }
  }, [userId, isOwner]);

  const fetchData = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Fetch portfolio
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (portfolioError) throw portfolioError;
      setPortfolioId(portfolioData.id);

      // Fetch user's documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('id, title, description, created_at')
        .eq('author_id', userId)
        .order('created_at', { ascending: false });

      if (documentsError) throw documentsError;
      setMyDocuments(documentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    const newTag = tagsInput.trim().toLowerCase();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setTagsInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!portfolioId) return;

    // Validation
    if (activeTab === 'external') {
      if (!title.trim()) {
        toast.error('Title is required');
        return;
      }
      if (!url.trim()) {
        toast.error('URL is required');
        return;
      }
    } else if (activeTab === 'document') {
      if (!selectedDocumentId) {
        toast.error('Please select a document');
        return;
      }
    }

    setSaving(true);
    try {
      const itemData: any = {
        portfolio_id: portfolioId,
        category: category.trim() || null,
        tags: tags.length > 0 ? tags : null,
        is_featured: isFeatured,
        display_order: 0, // New items go to the top
      };

      if (activeTab === 'external') {
        itemData.title = title.trim();
        itemData.description = description.trim() || null;
        itemData.url = url.trim();
        itemData.thumbnail_url = thumbnailUrl.trim() || null;
      } else if (activeTab === 'document') {
        // Get document details
        const document = myDocuments.find(doc => doc.id === selectedDocumentId);
        itemData.document_id = selectedDocumentId;
        itemData.title = document?.title || 'Untitled';
        itemData.description = document?.description || null;
      }

      const { error } = await supabase
        .from('portfolio_items')
        .insert(itemData);

      if (error) throw error;

      toast.success('Item added to portfolio!');
      navigate(`/portfolio/${userId}`);
    } catch (error: any) {
      console.error('Error adding item:', error);
      toast.error(error.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'My Profile', path: '/profile' },
        { label: 'Portfolio', path: `/portfolio/${userId}` },
        { label: 'Add Item' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Add Portfolio Item</h1>
          <p className="text-gray-600">Showcase your work or link to external projects</p>
        </div>
        <Link to={`/portfolio/${userId}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Portfolio
          </Button>
        </Link>
      </div>

      {/* Item Type Selection */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="external" className="gap-2">
            <LinkIcon className="w-4 h-4" />
            External Link
          </TabsTrigger>
          <TabsTrigger value="document" className="gap-2">
            <FileText className="w-4 h-4" />
            My Document
          </TabsTrigger>
        </TabsList>

        {/* External Link Tab */}
        <TabsContent value="external" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>External Project or Link</CardTitle>
              <CardDescription>
                Add a link to work hosted elsewhere (GitHub, Behance, personal site, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Project name or title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this project and your role..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail URL (Optional)</Label>
                <Input
                  id="thumbnail"
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://... (image URL)"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Tab */}
        <TabsContent value="document" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Select a Document</CardTitle>
              <CardDescription>
                Choose from documents you've already shared on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myDocuments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="mb-2">No documents found</p>
                  <p className="text-sm">Create some documents first to add them to your portfolio</p>
                  <Link to="/documents/new">
                    <Button className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Document
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {myDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocumentId(doc.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedDocumentId === doc.id
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h4 className="font-semibold">{doc.title}</h4>
                      {doc.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Created {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Common Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            Categorize and tag your portfolio item
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Projects, Writing, Design..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag and press Enter"
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label htmlFor="featured">Featured Item</Label>
              <p className="text-sm text-gray-600">
                Highlight this item at the top of your portfolio
              </p>
            </div>
            <Switch
              id="featured"
              checked={isFeatured}
              onCheckedChange={setIsFeatured}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Link to={`/portfolio/${userId}`}>
          <Button variant="outline">
            Cancel
          </Button>
        </Link>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Adding...' : 'Add to Portfolio'}
        </Button>
      </div>
    </div>
  );
}
