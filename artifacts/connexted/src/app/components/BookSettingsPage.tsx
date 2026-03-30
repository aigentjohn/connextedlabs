import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import {
  Save,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';

export default function BookSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('guide');
  const [coverImage, setCoverImage] = useState('');
  const [tags, setTags] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);

  useEffect(() => {
    if (profile && id) {
      fetchBook();
    }
  }, [profile, id]);

  const fetchBook = async () => {
    try {
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single();

      if (bookError) throw bookError;

      // Check if user is owner or admin
      const isOwner = bookData.created_by === profile?.id;
      const isAdmin = profile?.role === 'super' || profile?.role === 'admin';

      if (!isOwner && !isAdmin) {
        toast.error('You do not have permission to edit this book');
        navigate(`/books/${id}`);
        return;
      }

      setBook(bookData);
      setTitle(bookData.title || '');
      setDescription(bookData.description || '');
      setCategory(bookData.category || 'guide');
      setCoverImage(bookData.cover_image || '');
      setTags(bookData.tags?.join(', ') || '');
      setIsTemplate(bookData.is_template ?? false);
    } catch (error) {
      console.error('Error fetching book:', error);
      toast.error('Failed to load book');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!book) return;

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      const tagsArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from('books')
        .update({
          title,
          description,
          category,
          cover_image: coverImage || null,
          tags: tagsArray,
          is_template: isTemplate,
          updated_at: new Date().toISOString()
        })
        .eq('id', book.id);

      if (error) throw error;

      toast.success('Book updated successfully');
      navigate(`/books/${id}`);
    } catch (error) {
      console.error('Error updating book:', error);
      toast.error('Failed to update book');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!book) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', book.id);

      if (error) throw error;

      toast.success('Book deleted successfully');
      navigate('/books');
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Failed to delete book');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Book not found</div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <Breadcrumbs
        items={[
          { label: 'Books', href: '/books' },
          { label: book.title, href: `/books/${id}` },
          { label: 'Settings' }
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{book.title}</h1>
          <p className="text-gray-600 mt-1">Edit book settings and metadata</p>
        </div>
        <Link to={`/books/${id}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Book
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update book title, description, and metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Book Title*</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter book title"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this book..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guide">Guide</SelectItem>
                  <SelectItem value="tutorial">Tutorial</SelectItem>
                  <SelectItem value="handbook">Handbook</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="reference">Reference</SelectItem>
                  <SelectItem value="workbook">Workbook</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="coverImage">Cover Image URL</Label>
              <Input
                id="coverImage"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://example.com/cover.jpg"
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="productivity, business, guide"
              />
              <p className="text-sm text-gray-500 mt-1">Use tags to help users discover your book</p>
            </div>
          </CardContent>
        </Card>

        {/* Template Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Template Settings</CardTitle>
            <CardDescription>Configure template and reusability options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="template">Use as Template</Label>
                <p className="text-sm text-gray-500">Allow others to create copies of this book</p>
              </div>
              <Switch
                id="template"
                checked={isTemplate}
                onCheckedChange={setIsTemplate}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Book
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Book?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{book.title}" and all its chapters.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Book
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
