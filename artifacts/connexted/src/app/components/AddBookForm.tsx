import { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { TagSelector } from '@/app/components/unified/TagSelector';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { BookOpen } from 'lucide-react';

export default function AddBookForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [isbn, setIsbn] = useState('');
  const [amazonUrl, setAmazonUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to recommend a book');
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('books')
        .insert({
          title,
          author,
          description,
          isbn: isbn || null,
          amazon_url: amazonUrl || null,
          cover_image_url: coverImageUrl || null,
          tags,
          recommended_by: user.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Book recommended successfully!');
      navigate(`/books/${data.id}`);
    } catch (error) {
      console.error('Error adding book:', error);
      toast.error('Failed to add book. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Breadcrumbs
        items={[
          { label: 'Books', href: '/books' },
          { label: 'Recommend Book' }
        ]}
      />

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <CardTitle>Recommend a Book</CardTitle>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Share a book that has been valuable in your entrepreneurial or professional journey.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">Book Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="The Lean Startup"
                required
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="author">Author *</Label>
              <Input
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Eric Ries"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Why do you recommend this book?</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share why this book is valuable for entrepreneurs, innovators, and professionals..."
                rows={4}
              />
              <p className="text-sm text-gray-500 mt-1">
                Optional: Tell the community what makes this book special
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="isbn">ISBN (Optional)</Label>
                <Input
                  id="isbn"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="978-0-307-88789-4"
                />
              </div>

              <div>
                <Label htmlFor="amazonUrl">Amazon Link (Optional)</Label>
                <Input
                  id="amazonUrl"
                  value={amazonUrl}
                  onChange={(e) => setAmazonUrl(e.target.value)}
                  placeholder="https://amazon.com/..."
                  type="url"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="coverImageUrl">Cover Image URL (Optional)</Label>
              <Input
                id="coverImageUrl"
                value={coverImageUrl}
                onChange={(e) => {
                  setCoverImageUrl(e.target.value);
                  setImageError(false);
                }}
                placeholder="https://..."
                type="url"
              />
              {coverImageUrl && !imageError && (
                <div className="mt-3">
                  <img 
                    src={coverImageUrl} 
                    alt="Book cover preview" 
                    className="h-40 object-contain rounded border"
                    onError={() => {
                      setImageError(true);
                      toast.error('Invalid image URL');
                    }}
                  />
                </div>
              )}
              {imageError && (
                <p className="text-sm text-red-600 mt-1">
                  Unable to load image from this URL
                </p>
              )}
            </div>

            <div>
              <Label>Tags</Label>
              <TagSelector
                value={tags}
                onChange={setTags}
                placeholder="Add tags to categorize this book (e.g., startup, leadership, product)..."
              />
              <p className="text-sm text-gray-500 mt-1">
                Tags help others discover this book
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Recommend Book'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/books')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
