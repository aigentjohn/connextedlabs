import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { BookOpen, Plus, Trash2, Edit2, FileUp, Save, X, ArrowUp, ArrowDown, Download, Copy, Flag, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import ReportContentDialog from '@/app/components/shared/ReportContentDialog';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { isValidUUID } from '@/lib/uuid-utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { copyToClipboard } from '@/lib/clipboard-utils';
import { ShareInviteButton } from '@/app/components/shared/ShareInviteButton';
import PrivateCommentDialog from '@/app/components/shared/PrivateCommentDialog';

interface Book {
  id: string;
  title: string;
  description: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string;
  };
  tags?: string[];
}

interface Chapter {
  id: string;
  book_id: string;
  title: string;
  content: string;
  order_index: number;
  created_at: string;
}

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditBookOpen, setIsEditBookOpen] = useState(false);
  const [editBookForm, setEditBookForm] = useState({ title: '', description: '', tags: '' });
  const [isEditingChapter, setIsEditingChapter] = useState(false);
  const [newChapter, setNewChapter] = useState({ title: '', content: '' });
  const [editingContent, setEditingContent] = useState('');
  const [topics, setTopics] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { profile } = useAuth();

  const handleSpeak = () => {
    if (!selectedChapter?.content) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const text = selectedChapter.content.replace(/[#*_`>\-\[\]()]/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  useEffect(() => {
    if (!id || !isValidUUID(id)) {
      setLoading(false);
      toast.error('Invalid book ID');
      return;
    }

    fetchBook();
    fetchChapters();
  }, [id]);

  const fetchBook = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/books/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch book');

      const data = await response.json();
      
      // Fetch author info
      if (data.book && data.book.author_id) {
        const { data: author } = await supabase
          .from('users')
          .select('id, name')
          .eq('id', data.book.author_id)
          .single();
        
        if (author) {
          data.book.author = author;
        }
      }
      
      setBook(data.book);
      
      // Fetch topics for this book
      try {
        const topicsResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/content/book/${id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (topicsResponse.ok) {
          const { topics: bookTopics } = await topicsResponse.json();
          setTopics(bookTopics || []);
        }
      } catch (error) {
        console.error('Error fetching topics:', error);
        // Non-fatal error, continue loading
      }

      // Fetch tags for this book
      if (data.book && data.book.tags) {
        setTags(data.book.tags);
      }
    } catch (error) {
      console.error('Error fetching book:', error);
      toast.error('Failed to load book');
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/books/${id}/chapters`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch chapters');

      const data = await response.json();
      console.log('Fetched chapters:', data.chapters);
      setChapters(data.chapters || []);
      
      // Auto-select first chapter if none selected
      if (!selectedChapterId && data.chapters && data.chapters.length > 0) {
        setSelectedChapterId(data.chapters[0].id);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
      toast.error('Failed to load chapters');
    }
  };

  const handleCreateChapter = async () => {
    if (!newChapter.title.trim() || !profile || !id) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/books/${id}/chapters`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: newChapter.title.trim(),
            content: newChapter.content.trim(),
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to create chapter');

      const data = await response.json();
      toast.success('Chapter created!');
      setNewChapter({ title: '', content: '' });
      setIsCreateDialogOpen(false);
      fetchChapters();
    } catch (error) {
      console.error('Error creating chapter:', error);
      toast.error('Failed to create chapter');
    }
  };

  const handleUpdateChapter = async () => {
    if (!selectedChapterId || !profile || !id) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/books/${id}/chapters/${selectedChapterId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: editingContent,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to update chapter');

      toast.success('Chapter updated!');
      setIsEditingChapter(false);
      fetchChapters();
    } catch (error) {
      console.error('Error updating chapter:', error);
      toast.error('Failed to update chapter');
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('Are you sure you want to delete this chapter?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/books/${id}/chapters/${chapterId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete chapter');

      toast.success('Chapter deleted');
      if (selectedChapterId === chapterId) {
        setSelectedChapterId(null);
      }
      fetchChapters();
    } catch (error) {
      console.error('Error deleting chapter:', error);
      toast.error('Failed to delete chapter');
    }
  };

  const handleMoveChapter = async (chapter: Chapter, direction: 'up' | 'down') => {
    const currentIndex = chapters.findIndex((c) => c.id === chapter.id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === chapters.length - 1)
    ) {
      return;
    }

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const swapChapter = chapters[swapIndex];

    try {
      // Swap order_index values between chapters
      const response1 = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/books/${id}/chapters/${chapter.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_index: swapChapter.order_index,
          }),
        }
      );

      const response2 = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/books/${id}/chapters/${swapChapter.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_index: chapter.order_index,
          }),
        }
      );

      if (!response1.ok || !response2.ok) {
        const error1 = await response1.text();
        const error2 = await response2.text();
        console.error('Reorder response errors:', error1, error2);
        throw new Error('Failed to reorder chapters');
      }

      // Wait for the fetch to complete
      await fetchChapters();
      toast.success('Chapter order updated');
    } catch (error) {
      console.error('Error moving chapter:', error);
      toast.error('Failed to move chapter');
    }
  };

  const handleImportMarkdown = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setNewChapter({ ...newChapter, content: text });
      toast.success('Markdown file imported!');
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to import file');
    }
  };

  const openEditBook = () => {
    if (!book) return;
    setEditBookForm({
      title: book.title,
      description: book.description || '',
      tags: book.tags?.join(', ') || '',
    });
    setIsEditBookOpen(true);
  };

  const handleUpdateBook = async () => {
    if (!editBookForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      const { error } = await supabase
        .from('books')
        .update({
          title: editBookForm.title.trim(),
          description: editBookForm.description.trim(),
          tags: editBookForm.tags ? editBookForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        })
        .eq('id', book!.id);
      if (error) throw error;
      toast.success('Book updated');
      setIsEditBookOpen(false);
      fetchBook();
    } catch (error) {
      console.error('Error updating book:', error);
      toast.error('Failed to update book');
    }
  };

  const startEditing = () => {
    const chapter = chapters.find(c => c.id === selectedChapterId);
    if (chapter) {
      setEditingContent(chapter.content);
      setIsEditingChapter(true);
    }
  };

  const cancelEditing = () => {
    setIsEditingChapter(false);
    setEditingContent('');
  };

  // Export JSON Functions
  const handleExportJson = () => {
    if (!book) return;

    const exportData = {
      title: book.title,
      description: book.description || '',
      category: '',
      tags: [],
      chapters: chapters.map(ch => ({
        title: ch.title,
        content: ch.content,
      })),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-book.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Book exported as JSON');
  };

  const handleCopyJson = async () => {
    if (!book) return;

    const exportData = {
      title: book.title,
      description: book.description || '',
      category: '',
      tags: [],
      chapters: chapters.map(ch => ({
        title: ch.title,
        content: ch.content,
      })),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const success = await copyToClipboard(jsonString);
    if (success) {
      toast.success('JSON copied to clipboard!');
    } else {
      toast.error('Failed to copy JSON');
    }
  };

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading book...</div>
      </div>
    );
  }

  if (!book) {
    return <Navigate to="/books" replace />;
  }

  const isOwner = book.author_id === profile.id;
  const isAdmin = profile.role === 'super';
  const canEdit = isOwner || isAdmin;
  
  const selectedChapter = selectedChapterId 
    ? chapters.find(c => c.id === selectedChapterId) 
    : null;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Books', href: '/books' },
          { label: book.title, href: `/books/${book.id}` },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 text-emerald-600 p-3 rounded-lg">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{book.title}</h1>
            <p className="text-sm text-gray-600">
              By {book.author?.name || 'Unknown'} • {chapters.length} chapters
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Share */}
          <ShareInviteButton
            entityType="book"
            entityId={book.id}
            entityName={book.title}
          />
          {!isOwner && book.author_id && (
            <PrivateCommentDialog
              containerType="book"
              containerId={book.id}
              containerTitle={book.title}
              recipientId={book.author_id}
              recipientName={book.author?.name || 'the author'}
            />
          )}
          {!isOwner && (
            <ReportContentDialog
              contentType="book"
              contentId={book.id}
              contentTitle={book.title}
              trigger={
                <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700">
                  <Flag className="w-4 h-4" />
                </Button>
              }
            />
          )}
          {/* Export JSON Buttons */}
          {chapters.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJson}
                title="Copy book as JSON to clipboard"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJson}
                title="Download book as JSON file"
              >
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
            </>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={openEditBook}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Book
            </Button>
          )}
          {canEdit && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Chapter
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Chapter</DialogTitle>
                  <DialogDescription>
                    Create a new chapter for this book. You can paste or type content, or import a markdown file.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="chapter-title">Chapter Title *</Label>
                    <Input
                      id="chapter-title"
                      value={newChapter.title}
                      onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                      placeholder="Enter chapter title"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="chapter-content">Content</Label>
                      <label htmlFor="import-markdown" className="cursor-pointer">
                        <div className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700">
                          <FileUp className="w-4 h-4" />
                          Import Markdown
                        </div>
                        <input
                          id="import-markdown"
                          type="file"
                          accept=".md,.txt"
                          onChange={handleImportMarkdown}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <Textarea
                      id="chapter-content"
                      value={newChapter.content}
                      onChange={(e) => setNewChapter({ ...newChapter, content: e.target.value })}
                      placeholder="Paste or type your content here... Supports markdown formatting."
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button 
                    onClick={handleCreateChapter} 
                    className="w-full"
                    disabled={!newChapter.title.trim()}
                  >
                    Add Chapter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {book.description && (
        <p className="text-gray-600">{book.description}</p>
      )}

      {/* Topics and Tags */}
      {(topics.length > 0 || tags.length > 0) && (
        <div className="flex flex-wrap gap-4">
          {/* Topics */}
          {topics.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Topics (Who/Why)</h3>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <Link key={topic.id} to={`/topics/${topic.slug}`}>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer transition-all hover:shadow-sm"
                      style={{ 
                        borderColor: topic.color || '#9333ea',
                        color: topic.color || '#9333ea',
                        backgroundColor: `${topic.color || '#9333ea'}10`
                      }}
                    >
                      <span className="mr-1">{topic.icon}</span>
                      {topic.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tags (What/How)</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`}>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors">
                      <span className="mr-1">#</span>
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Book Reading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chapters List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Chapters</CardTitle>
            </CardHeader>
            <CardContent>
              {chapters.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-4">
                  No chapters yet
                </p>
              ) : (
                <div className="space-y-2">
                  {chapters.map((chapter, index) => (
                    <div
                      key={chapter.id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors border ${
                        selectedChapterId === chapter.id
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'hover:bg-gray-50 border-transparent'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setSelectedChapterId(chapter.id);
                          setIsEditingChapter(false);
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xs text-gray-500 mt-0.5">
                            {index + 1}
                          </span>
                          <h4 className="font-medium text-sm line-clamp-2">
                            {chapter.title}
                          </h4>
                        </div>
                      </button>
                      {canEdit && (
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveChapter(chapter, 'up');
                            }}
                            disabled={index === 0}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveChapter(chapter, 'down');
                            }}
                            disabled={index === chapters.length - 1}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChapter(chapter.id);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reading Area */}
        <div className="lg:col-span-2">
          {!selectedChapter ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                {chapters.length === 0 
                  ? 'Add your first chapter to get started' 
                  : 'Select a chapter to read'}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>{selectedChapter.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    {!isEditingChapter && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSpeak}
                        title={isSpeaking ? 'Stop reading' : 'Listen to chapter'}
                      >
                        {isSpeaking ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                        {isSpeaking ? 'Stop' : 'Listen'}
                      </Button>
                    )}
                    {canEdit && !isEditingChapter && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={startEditing}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {isEditingChapter && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEditing}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleUpdateChapter}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditingChapter ? (
                  <Textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    rows={20}
                    className="font-mono text-sm"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none">
                    {selectedChapter.content ? (
                      <ReactMarkdown
                        children={selectedChapter.content}
                        remarkPlugins={[remarkGfm]}
                      />
                    ) : (
                      <p className="text-gray-500 italic">This chapter is empty</p>
                    )}
                  </div>
                )}

                {/* Prev / Next chapter navigation */}
                {!isEditingChapter && (() => {
                  const idx = chapters.findIndex(c => c.id === selectedChapterId);
                  const prev = idx > 0 ? chapters[idx - 1] : null;
                  const next = idx < chapters.length - 1 ? chapters[idx + 1] : null;
                  if (!prev && !next) return null;
                  return (
                    <div className="flex items-center justify-between mt-8 pt-4 border-t">
                      <div>
                        {prev && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedChapterId(prev.id)}
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            {prev.title}
                          </Button>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {idx + 1} / {chapters.length}
                      </span>
                      <div>
                        {next && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedChapterId(next.id)}
                          >
                            {next.title}
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Book Dialog */}
      <Dialog open={isEditBookOpen} onOpenChange={setIsEditBookOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
            <DialogDescription>Update the book's title, description, and tags.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="book-title">Title *</Label>
              <Input
                id="book-title"
                value={editBookForm.title}
                onChange={(e) => setEditBookForm({ ...editBookForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="book-description">Description</Label>
              <Textarea
                id="book-description"
                value={editBookForm.description}
                onChange={(e) => setEditBookForm({ ...editBookForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="book-tags">Tags</Label>
              <Input
                id="book-tags"
                value={editBookForm.tags}
                onChange={(e) => setEditBookForm({ ...editBookForm, tags: e.target.value })}
                placeholder="comma-separated tags"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateBook} className="flex-1" disabled={!editBookForm.title.trim()}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={() => setIsEditBookOpen(false)} className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}