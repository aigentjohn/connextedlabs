import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Search, File, FolderOpen, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Document {
  id: string;
  title: string;
  description: string;
  tags: string[];
  author_id: string;
  created_at: string;
}

interface LibraryFolder {
  id: string;
  name: string;
  parent_folder_id: string | null;
}

interface AddDocumentsDialogProps {
  libraryId: string;
  folders?: LibraryFolder[];
  existingDocumentIds?: string[]; // Already in library
  onDocumentsAdded?: () => void;
}

export default function AddDocumentsDialog({
  libraryId,
  folders = [],
  existingDocumentIds = [],
  onDocumentsAdded,
}: AddDocumentsDialogProps) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDocuments();
      setSelectedDocIds(new Set());
      setSelectedFolderId(null);
    }
  }, [open]);

  const fetchDocuments = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // Fetch all documents
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, description, tags, author_id, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const toggleDocument = (docId: string) => {
    const newSelected = new Set(selectedDocIds);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocIds(newSelected);
  };

  const handleAddDocuments = async () => {
    if (selectedDocIds.size === 0) {
      toast.error('Please select at least one document');
      return;
    }

    setSaving(true);
    try {
      // Prepare library_documents records
      const libraryDocuments = Array.from(selectedDocIds).map((docId, index) => ({
        library_id: libraryId,
        document_id: docId,
        folder_id: selectedFolderId,
        added_by_user_id: profile?.id,
        display_order: index,
      }));

      const { error } = await supabase
        .from('library_documents')
        .insert(libraryDocuments);

      if (error) throw error;

      toast.success(`Added ${selectedDocIds.size} document(s) to library`);
      onDocumentsAdded?.();
      setOpen(false);
    } catch (error: any) {
      console.error('Error adding documents:', error);
      if (error.code === '23505') {
        toast.error('Some documents are already in this library');
      } else {
        toast.error('Failed to add documents');
      }
    } finally {
      setSaving(false);
    }
  };

  // Filter documents
  const availableDocuments = allDocuments.filter(
    (doc) => !existingDocumentIds.includes(doc.id)
  );

  const filteredDocuments = searchQuery
    ? availableDocuments.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : availableDocuments;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Documents
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Documents to Library</DialogTitle>
          <DialogDescription>
            Select documents to add to this library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Folder Selection */}
          {folders.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Add to Folder (optional)
              </label>
              <Select
                value={selectedFolderId || 'none'}
                onValueChange={(value) => setSelectedFolderId(value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="flex items-center gap-2">
                      <File className="w-4 h-4" />
                      No folder (root level)
                    </span>
                  </SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <span className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        {folder.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Document List */}
          <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                <p className="text-sm text-gray-500 mt-2">Loading documents...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <File className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">
                  {availableDocuments.length === 0
                    ? 'All documents are already in this library'
                    : 'No documents found'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredDocuments.map((doc) => {
                  const isSelected = selectedDocIds.has(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => toggleDocument(doc.id)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleDocument(doc.id)}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <h4 className="font-medium text-gray-900 truncate">
                              {doc.title}
                            </h4>
                          </div>
                          {doc.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                              {doc.description}
                            </p>
                          )}
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {doc.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {doc.tags.length > 3 && (
                                <span className="text-xs text-gray-500 py-0.5">
                                  +{doc.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selection Summary */}
          {selectedDocIds.size > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="text-sm text-indigo-900">
                <strong>{selectedDocIds.size}</strong> document{selectedDocIds.size !== 1 ? 's' : ''} selected
                {selectedFolderId && folders.find(f => f.id === selectedFolderId) && (
                  <> • Will be added to folder: <strong>{folders.find(f => f.id === selectedFolderId)?.name}</strong></>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddDocuments}
            disabled={selectedDocIds.size === 0 || saving}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add {selectedDocIds.size > 0 ? selectedDocIds.size : ''} Document{selectedDocIds.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}