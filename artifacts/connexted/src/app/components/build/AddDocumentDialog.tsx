import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { FileText, Plus, Search, Bookmark } from 'lucide-react';
import BookmarkBrowser from '@/app/components/BookmarkBrowser';

interface Document {
  id: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  created_at: string;
}

interface AddDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildId: string;
  onDocumentAdded: () => void;
}

export default function AddDocumentDialog({
  open,
  onOpenChange,
  buildId,
  onDocumentAdded,
}: AddDocumentDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [existingDocuments, setExistingDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // New document form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');

  // Bookmark browser
  const [showBookmarkBrowser, setShowBookmarkBrowser] = useState(false);

  useEffect(() => {
    if (open) {
      fetchExistingDocuments();
    }
  }, [open]);

  const fetchExistingDocuments = async () => {
    try {
      // Fetch documents not already in this build
      const { data: buildDocs } = await supabase
        .from('build_documents')
        .select('document_id')
        .eq('build_id', buildId);

      const existingDocIds = buildDocs?.map(bd => bd.document_id) || [];

      let query = supabase
        .from('documents')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (existingDocIds.length > 0) {
        query = query.not('id', 'in', `(${existingDocIds.join(',')})`);
      }

      const { data } = await query;
      setExistingDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile || !title.trim() || !url.trim()) {
      toast.error('Title and URL are required');
      return;
    }

    setLoading(true);

    try {
      // Create new document
      const { data: newDoc, error: docError } = await supabase
        .from('documents')
        .insert([
          {
            title: title.trim(),
            description: description.trim(),
            url: url.trim(),
            author_id: profile.id,
            tags: [],
            circle_ids: [], // Empty array - document not tied to any circle
            table_ids: [], // Empty array - document not tied to any table
            access_level: 'public', // Default to public access
          },
        ])
        .select()
        .single();

      if (docError) throw docError;

      // Add to build
      const { error: buildDocError } = await supabase
        .from('build_documents')
        .insert([
          {
            build_id: buildId,
            document_id: newDoc.id,
            added_by: profile.id,
          },
        ]);

      if (buildDocError) throw buildDocError;

      toast.success('Document created and added to build');
      onDocumentAdded();
      onOpenChange(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setUrl('');
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error('Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExisting = async (documentId: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('build_documents')
        .insert([
          {
            build_id: buildId,
            document_id: documentId,
            added_by: profile.id,
          },
        ]);

      if (error) throw error;

      toast.success('Document added to build');
      onDocumentAdded();
      fetchExistingDocuments(); // Refresh list
    } catch (error) {
      console.error('Error adding document:', error);
      toast.error('Failed to add document');
    }
  };

  const handleBookmarkSelect = (selectedUrl: string, selectedTitle: string) => {
    setUrl(selectedUrl);
    if (!title.trim()) {
      setTitle(selectedTitle);
    }
  };

  const filteredDocuments = existingDocuments.filter(
    doc =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Document to Build</DialogTitle>
          <DialogDescription>
            Create a new document or add an existing one
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="existing">Add Existing</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            <form onSubmit={handleCreateAndAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Document title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL *</Label>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    type="url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://..."
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowBookmarkBrowser(true)}
                    className="flex-shrink-0"
                  >
                    <Bookmark className="w-4 h-4 mr-2" />
                    Browse
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What is this document about?"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                  <Plus className="w-4 h-4 mr-2" />
                  {loading ? 'Creating...' : 'Create & Add to Build'}
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="pl-9"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No available documents found</p>
                </div>
              ) : (
                filteredDocuments.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <h4 className="font-medium truncate">{doc.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{doc.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {doc.tags.slice(0, 2).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleAddExisting(doc.id)}>
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Bookmark Browser Modal */}
        <BookmarkBrowser
          open={showBookmarkBrowser}
          onClose={() => setShowBookmarkBrowser(false)}
          onSelect={handleBookmarkSelect}
        />
      </DialogContent>
    </Dialog>
  );
}