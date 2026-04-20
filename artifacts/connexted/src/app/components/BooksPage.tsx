import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Search, Plus, BookOpen, Trash2, Eye, ExternalLink, Clock, Heart, Star, Share2, Download, Edit2, ArrowUpDown, User } from 'lucide-react';
import { toast } from 'sonner';
import { CONTAINER_TYPES } from '@/lib/container-types';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrivacySelector } from '@/app/components/unified/PrivacySelector';
import { VisibilityBadge } from '@/app/components/unified/VisibilityBadge';
import { TagSelector } from '@/app/components/unified/TagSelector';
import { TopicSelector } from '@/app/components/unified/TopicSelector';
import { UserDisplay } from '@/app/components/shared/UserDisplay';

interface Book {
  id: string;
  title: string;
  description: string;
  category?: string;
  cover_image?: string;
  tags?: string[];
  created_by: string | null; // Can be null if creator deleted
  likes?: string[];
  favorites?: string[];
  views?: number;
  is_template?: boolean;
  visibility?: 'public' | 'member' | 'private' | 'unlisted';
  admin_ids?: string[];
  member_ids?: string[];
  created_at: string;
  updated_at: string;
  chapter_count?: number;
  is_liked?: boolean;
  is_favorited?: boolean;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface Chapter {
  id: string;
  book_id: string;
  title: string;
  content: string;
  order_index: number;
  created_at: string;
}

export default function BooksPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBook, setNewBook] = useState({ 
    title: '', 
    description: '', 
    visibility: 'public' as 'public' | 'member' | 'private' | 'unlisted',
    tags: [] as string[],
    topicIds: [] as string[]
  });
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editForm, setEditForm] = useState({ 
    title: '', 
    description: '', 
    visibility: 'public' as 'public' | 'member' | 'private' | 'unlisted',
    tags: [] as string[],
    topicIds: [] as string[]
  });
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [likedBookIds, setLikedBookIds] = useState<Set<string>>(new Set());
  const [favoritedBookIds, setFavoritedBookIds] = useState<Set<string>>(new Set());
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});
  const [favoritesCountMap, setFavoritesCountMap] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked'>('newest');
  const [filterMyContent, setFilterMyContent] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      // Fetch books from database via API
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/books`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching books:', errorData);
        
        // Check if it's a table not found error
        if (errorData?.code === 'PGRST205' || errorData?.message?.includes('Could not find the table')) {
          navigate('/books/setup');
          return;
        }
        
        throw new Error('Failed to fetch books');
      }
      
      const data = await response.json();
      
      // Fetch author info for all books
      if (data.books && data.books.length > 0) {
        const authorIds = [...new Set(data.books.map((b: Book) => b.created_by).filter(Boolean))]; // Filter out null
        
        if (authorIds.length > 0) {
          const { data: authors } = await supabase
            .from('users')
            .select('id, name, avatar')
            .in('id', authorIds);
          
          if (authors) {
            const authorMap = new Map(authors.map(a => [a.id, a]));
            data.books.forEach((book: Book) => {
              book.author = authorMap.get(book.created_by);
            });
          }
        }
      }
      
      setBooks(data.books || []);

      // Fetch Era 3 engagement data for books
      const bookIds = (data.books || []).map((b: Book) => b.id);
      if (bookIds.length > 0) {
        // Fetch likes counts
        const { data: likesData } = await supabase
          .from('content_likes')
          .select('content_id')
          .eq('content_type', 'book')
          .in('content_id', bookIds);

        if (likesData) {
          const counts: Record<string, number> = {};
          likesData.forEach(l => { counts[l.content_id] = (counts[l.content_id] || 0) + 1; });
          setLikesCountMap(counts);
        }

        // Fetch favorites counts
        const { data: favsData } = await supabase
          .from('content_favorites')
          .select('content_id')
          .eq('content_type', 'book')
          .in('content_id', bookIds);

        if (favsData) {
          const counts: Record<string, number> = {};
          favsData.forEach(f => { counts[f.content_id] = (counts[f.content_id] || 0) + 1; });
          setFavoritesCountMap(counts);
        }

        // Fetch current user's likes and favorites
        if (profile) {
          const { data: userLikes } = await supabase
            .from('content_likes')
            .select('content_id')
            .eq('content_type', 'book')
            .eq('user_id', profile.id)
            .in('content_id', bookIds);

          if (userLikes) {
            setLikedBookIds(new Set(userLikes.map(l => l.content_id)));
          }

          const { data: userFavs } = await supabase
            .from('content_favorites')
            .select('content_id')
            .eq('content_type', 'book')
            .eq('user_id', profile.id)
            .in('content_id', bookIds);

          if (userFavs) {
            setFavoritedBookIds(new Set(userFavs.map(f => f.content_id)));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching books:', error);
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBook = async () => {
    if (!newBook.title.trim() || !profile) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/books`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: newBook.title.trim(),
            description: newBook.description.trim(),
            author_id: profile.id,
            visibility: newBook.visibility,
            tags: newBook.tags,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to create book');

      const data = await response.json();
      toast.success('Book created!');
      
      // Link topics if any selected
      if (newBook.topicIds.length > 0 && data.book?.id) {
        try {
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/link`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: profile.id,
                entityType: 'book',
                entityId: data.book.id,
                topicIds: newBook.topicIds,
              }),
            }
          );
        } catch (topicError) {
          console.error('Error linking topics:', topicError);
        }
      }
      
      setNewBook({ title: '', description: '', visibility: 'public', tags: [], topicIds: [] });
      setIsCreateDialogOpen(false);
      fetchBooks();
    } catch (error) {
      console.error('Error creating book:', error);
      toast.error('Failed to create book');
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/books/${bookId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete book');

      toast.success('Book deleted');
      fetchBooks();
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Failed to delete book');
    }
  };

  const handleExpandBook = async (bookId: string) => {
    if (expandedBookId === bookId) {
      setExpandedBookId(null);
      setExpandedChapters([]);
      setSelectedChapterId(null);
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/books/${bookId}/chapters`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch chapters');

      const data = await response.json();
      setExpandedBookId(bookId);
      setExpandedChapters(data.chapters || []);
      setSelectedChapterId(data.chapters && data.chapters.length > 0 ? data.chapters[0].id : null);
    } catch (error) {
      console.error('Error fetching chapters:', error);
      toast.error('Failed to load chapters');
    }
  };

  const handleEditBook = async (book: Book) => {
    setEditingBook(book);
    setEditForm({
      title: book.title,
      description: book.description || '',
      visibility: book.visibility || 'public',
      tags: book.tags || [],
      topicIds: [],
    });
    setIsEditDialogOpen(true);

    // Fetch existing topics for this book
    try {
      const { data: topicData } = await supabase
        .from('content_topics')
        .select('topic_id')
        .eq('content_id', book.id)
        .eq('content_type', 'book');
      if (topicData && topicData.length > 0) {
        setEditForm(prev => ({ ...prev, topicIds: topicData.map((t: any) => t.topic_id) }));
      }
    } catch (err) {
      console.error('Error fetching book topics:', err);
    }
  };

  const handleUpdateBook = async () => {
    if (!editingBook || !editForm.title.trim() || !profile) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/books/${editingBook.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: editForm.title.trim(),
            description: editForm.description.trim(),
            visibility: editForm.visibility,
            tags: editForm.tags,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to update book');

      // Re-link topics if changed
      if (editForm.topicIds.length > 0) {
        try {
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/link`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content_id: editingBook.id,
                content_type: 'book',
                topic_ids: editForm.topicIds,
              }),
            }
          );
        } catch (topicError) {
          console.error('Error updating topics:', topicError);
        }
      }

      toast.success('Book updated!');
      setIsEditDialogOpen(false);
      setEditingBook(null);
      fetchBooks();
    } catch (error) {
      console.error('Error updating book:', error);
      toast.error('Failed to update book');
    }
  };

  const handleToggleLike = async (bookId: string) => {
    if (!profile) return;

    const isLiked = likedBookIds.has(bookId);

    // Optimistic update
    setLikedBookIds(prev => {
      const next = new Set(prev);
      if (isLiked) { next.delete(bookId); } else { next.add(bookId); }
      return next;
    });
    setLikesCountMap(prev => ({
      ...prev,
      [bookId]: Math.max(0, (prev[bookId] || 0) + (isLiked ? -1 : 1))
    }));

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('content_likes')
          .delete()
          .eq('content_type', 'book')
          .eq('content_id', bookId)
          .eq('user_id', profile.id);
        if (error) throw error;
        toast.success('Book unliked');
      } else {
        const { error } = await supabase
          .from('content_likes')
          .insert({ content_type: 'book', content_id: bookId, user_id: profile.id });
        if (error) throw error;
        toast.success('Book liked!');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert
      setLikedBookIds(prev => {
        const next = new Set(prev);
        if (isLiked) { next.add(bookId); } else { next.delete(bookId); }
        return next;
      });
      setLikesCountMap(prev => ({
        ...prev,
        [bookId]: Math.max(0, (prev[bookId] || 0) + (isLiked ? 1 : -1))
      }));
      toast.error('Failed to toggle like');
    }
  };

  const handleToggleFavorite = async (bookId: string) => {
    if (!profile) return;

    const isFav = favoritedBookIds.has(bookId);

    // Optimistic update
    setFavoritedBookIds(prev => {
      const next = new Set(prev);
      if (isFav) { next.delete(bookId); } else { next.add(bookId); }
      return next;
    });
    setFavoritesCountMap(prev => ({
      ...prev,
      [bookId]: Math.max(0, (prev[bookId] || 0) + (isFav ? -1 : 1))
    }));

    try {
      if (isFav) {
        const { error } = await supabase
          .from('content_favorites')
          .delete()
          .eq('content_type', 'book')
          .eq('content_id', bookId)
          .eq('user_id', profile.id);
        if (error) throw error;
        toast.success('Removed from favorites');
      } else {
        const { error } = await supabase
          .from('content_favorites')
          .insert({ content_type: 'book', content_id: bookId, user_id: profile.id });
        if (error) throw error;
        toast.success('Added to favorites!');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert
      setFavoritedBookIds(prev => {
        const next = new Set(prev);
        if (isFav) { next.add(bookId); } else { next.delete(bookId); }
        return next;
      });
      setFavoritesCountMap(prev => ({
        ...prev,
        [bookId]: Math.max(0, (prev[bookId] || 0) + (isFav ? 1 : -1))
      }));
      toast.error('Failed to toggle favorite');
    }
  };

  if (!profile) return null;

  const config = CONTAINER_TYPES.books;
  const Icon = config.icon;

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMine = !filterMyContent || book.created_by === profile?.id;
    return matchesSearch && matchesMine;
  });

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'most-liked') return (likesCountMap[b.id] || 0) - (likesCountMap[a.id] || 0);
    return 0;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Books', href: '/books' }]}
        icon={config.icon}
        iconBg={config.color}
        iconColor={config.iconColor}
        title="Books"
        description="Create and share books with chapters"
        actions={
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Book
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create a New Book</DialogTitle>
                <DialogDescription>
                  Create a book to share with your community.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-3 mt-3">
                <div>
                  <Label htmlFor="book-title" className="text-sm">Title *</Label>
                  <Input
                    id="book-title"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    placeholder="Enter book title"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="book-description" className="text-sm">Description</Label>
                  <Textarea
                    id="book-description"
                    value={newBook.description}
                    onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                    placeholder="What is this book about?"
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="book-visibility" className="text-sm">Visibility</Label>
                  <div className="mt-1">
                    <PrivacySelector
                      value={newBook.visibility}
                      onChange={(value) => setNewBook({ ...newBook, visibility: value })}
                      contentType="book"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="book-topics" className="text-sm">Topics (Who/Why)</Label>
                  <div className="mt-1">
                    <TopicSelector
                      value={newBook.topicIds}
                      onChange={(topicIds) => setNewBook({ ...newBook, topicIds })}
                      maxTopics={3}
                      showSuggestions={true}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="book-tags" className="text-sm">Tags (What/How)</Label>
                  <div className="mt-1">
                    <TagSelector
                      value={newBook.tags}
                      onChange={(tags) => setNewBook({ ...newBook, tags })}
                      contentType="book"
                      title={newBook.title}
                      description={newBook.description}
                      placeholder="Add tags..."
                      maxTags={10}
                      showSuggestions={true}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 pt-1">
                  Note: You can add chapters after creating the book.
                </p>
                <Button 
                  onClick={handleCreateBook} 
                  className="w-full mt-2"
                  disabled={!newBook.title.trim()}
                >
                  Create Book
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Edit Book Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
            <DialogDescription>
              Update the book's title, description, visibility, and tags.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-book-title" className="text-sm">Title *</Label>
              <Input
                id="edit-book-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Enter book title"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-book-description" className="text-sm">Description</Label>
              <Textarea
                id="edit-book-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="What is this book about?"
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-book-visibility" className="text-sm">Visibility</Label>
              <div className="mt-1">
                <PrivacySelector
                  value={editForm.visibility}
                  onChange={(value) => setEditForm({ ...editForm, visibility: value })}
                  contentType="book"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-book-tags" className="text-sm">Tags (What/How)</Label>
              <div className="mt-1">
                <TagSelector
                  value={editForm.tags}
                  onChange={(tags) => setEditForm({ ...editForm, tags })}
                  contentType="book"
                  title={editForm.title}
                  description={editForm.description}
                  placeholder="Add tags..."
                  maxTags={10}
                  showSuggestions={true}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleUpdateBook} 
                className="flex-1"
                disabled={!editForm.title.trim()}
              >
                Save Changes
              </Button>
              <Button 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingBook(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="search"
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filterMyContent ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMyContent(!filterMyContent)}
          >
            <User className="w-4 h-4 mr-1" />
            My Books
          </Button>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setSortBy('newest')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${sortBy === 'newest' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Newest
            </button>
            <button
              onClick={() => setSortBy('oldest')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${sortBy === 'oldest' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Oldest
            </button>
            <button
              onClick={() => setSortBy('most-liked')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${sortBy === 'most-liked' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Heart className="w-3 h-3 inline mr-1" />
              Most Liked
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        {sortedBooks.length} {sortedBooks.length === 1 ? 'book' : 'books'}
        {filterMyContent && ' (my books)'}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Books List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading books...</div>
        </div>
      ) : sortedBooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">
              {searchQuery ? 'No books found' : 'No books yet'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first book to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Book
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedBooks.map((book) => {
            const isOwner = book.author_id === profile.id;
            const isAdmin = profile.role === 'super';
            const canEdit = isOwner || isAdmin;
            const isExpanded = expandedBookId === book.id;
            const selectedChapter = expandedChapters.find(c => c.id === selectedChapterId);
            const isLiked = likedBookIds.has(book.id);
            const isFavorited = favoritedBookIds.has(book.id);

            return (
              <div key={book.id}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      <div className={`flex-shrink-0 w-12 h-12 ${config.color} ${config.iconColor} rounded-lg flex items-center justify-center`}>
                        <BookOpen className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center space-x-2">
                            <Link to={`/books/${book.id}`}>
                              <h3 className="font-medium text-lg hover:text-emerald-600 transition-colors">
                                {book.title}
                              </h3>
                            </Link>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {/* Edit button for creators */}
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleEditBook(book);
                                }}
                                className="flex-shrink-0 h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Edit book"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            )}
                            
                            {/* Delete button for creators */}
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleDeleteBook(book.id);
                                }}
                                className="flex-shrink-0 h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete book"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            
                            {/* Like button for all users */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                handleToggleLike(book.id);
                              }}
                              className={`flex-shrink-0 h-8 w-8 p-0 ${
                                isLiked 
                                  ? 'text-pink-600 hover:text-pink-700 hover:bg-pink-50' 
                                  : 'text-gray-600 hover:text-pink-600 hover:bg-pink-50'
                              }`}
                              title={isLiked ? 'Unlike book' : 'Like book'}
                            >
                              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                            </Button>
                            
                            {/* Favorite button for all users */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                handleToggleFavorite(book.id);
                              }}
                              className={`flex-shrink-0 h-8 w-8 p-0 ${
                                isFavorited 
                                  ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50' 
                                  : 'text-gray-600 hover:text-yellow-600 hover:bg-yellow-50'
                              }`}
                              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <Star className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                          {book.description}
                        </p>

                        {/* Author - Using UserDisplay component */}
                        <div className="mb-3">
                          <UserDisplay 
                            user={book.author} 
                            fallbackName="Former Member"
                            size="sm"
                          />
                          <span className="text-sm text-gray-400 ml-2">•</span>
                          <span className="text-sm text-gray-500 ml-2">
                            {new Date(book.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Book Properties */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <Badge variant="outline" className="bg-emerald-50 border-emerald-300 text-emerald-700">
                            {book.chapter_count || 0} chapters
                          </Badge>
                          {/* View count badge */}
                          <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700">
                            {book.views || 0} views
                          </Badge>
                          {/* Likes badge */}
                          <Badge variant="outline" className="bg-pink-50 border-pink-300 text-pink-700">
                            {likesCountMap[book.id] || 0} likes
                          </Badge>
                          {/* Favorites badge */}
                          <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
                            {favoritesCountMap[book.id] || 0} favorites
                          </Badge>
                        </div>

                        {/* View Mode Toggle - Bottom Right */}
                        <div className="flex justify-end">
                          <div className="flex items-center border rounded-lg overflow-hidden">
                            <Link to={`/books/${book.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-none border-0"
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExpandBook(book.id)}
                              className="rounded-none border-0"
                              title="View chapters"
                            >
                              <BookOpen className="w-4 h-4" />
                            </Button>
                            <Link to={`/books/${book.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-none border-0"
                                title="Open book page"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Inline Chapter Viewer */}
                {isExpanded && (
                  <Card className="mt-2">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <BookOpen className="w-4 h-4" />
                          <span className="font-medium">{book.title}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedBookId(null)}
                          className="h-8 w-8 p-0"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                      {expandedChapters.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>No chapters yet</p>
                        </div>
                      ) : (
                        <div className="flex" style={{ height: '500px' }}>
                          {/* Chapter List - Left Sidebar */}
                          <div className="w-64 border-r overflow-y-auto bg-gray-50">
                            {expandedChapters.map((chapter) => (
                              <button
                                key={chapter.id}
                                onClick={() => setSelectedChapterId(chapter.id)}
                                className={`w-full text-left px-4 py-3 border-b hover:bg-white transition-colors ${
                                  selectedChapterId === chapter.id
                                    ? 'bg-white border-l-4 border-l-emerald-500'
                                    : ''
                                }`}
                              >
                                <div className="text-sm font-medium text-gray-900">
                                  {chapter.title}
                                </div>
                              </button>
                            ))}
                          </div>
                          
                          {/* Chapter Content - Right Panel */}
                          <div className="flex-1 overflow-y-auto p-6 bg-white">
                            {selectedChapter ? (
                              <div>
                                <h2 className="text-2xl font-bold mb-4">{selectedChapter.title}</h2>
                                <div className="prose prose-sm max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {selectedChapter.content}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-500">
                                Select a chapter to view its content
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}