import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import {
  Trash2, RotateCcw, FileText, AlertTriangle, ChevronLeft,
} from 'lucide-react';
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

interface DeletedDocument {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  tags: string[];
  access_level: string;
  deleted_at: string;
  created_at: string;
}

export default function TrashPage() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<DeletedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) fetchDeleted();
  }, [profile]);

  const fetchDeleted = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, description, url, tags, access_level, deleted_at, created_at')
        .eq('author_id', profile.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching trash:', err);
      toast.error('Failed to load trash');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (doc: DeletedDocument) => {
    setRestoringId(doc.id);
    try {
      const { error } = await supabase
        .from('documents')
        .update({ deleted_at: null, deleted_by: null })
        .eq('id', doc.id);

      if (error) throw error;

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast.success(`"${doc.title}" restored`);
    } catch (err) {
      console.error('Error restoring document:', err);
      toast.error('Failed to restore document');
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async (doc: DeletedDocument) => {
    setDeletingId(doc.id);
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast.success(`"${doc.title}" permanently deleted`);
    } catch (err) {
      console.error('Error permanently deleting document:', err);
      toast.error('Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const daysUntilExpiry = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    const days = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  if (!profile) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/my-documents">
            <ChevronLeft className="w-4 h-4 mr-1" />
            My Documents
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 rounded-lg">
          <Trash2 className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Trash</h1>
          <p className="text-sm text-gray-500">Deleted documents are kept for 30 days before permanent removal</p>
        </div>
      </div>

      {/* Warning banner */}
      {documents.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Documents in trash are automatically permanently deleted 30 days after deletion.
            Restore items you want to keep.
          </p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Trash2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Trash is empty</p>
            <p className="text-sm text-gray-400 mt-1">Deleted documents will appear here</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/my-documents">Go to My Documents</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">{documents.length} deleted {documents.length === 1 ? 'document' : 'documents'}</p>
          {documents.map(doc => {
            const days = daysUntilExpiry(doc.deleted_at);
            const isExpiringSoon = days <= 7;

            return (
              <Card key={doc.id} className={isExpiringSoon ? 'border-amber-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-gray-900 truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          {isExpiringSoon && (
                            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-xs">
                              Expires in {days}d
                            </Badge>
                          )}
                          {!isExpiringSoon && (
                            <span className="text-xs text-gray-400">{days} days left</span>
                          )}
                        </div>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{doc.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Deleted {new Date(doc.deleted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(doc)}
                        disabled={restoringId === doc.id}
                        className="gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === doc.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Permanently delete document?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{doc.title}" will be permanently deleted and cannot be recovered.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handlePermanentDelete(doc)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
