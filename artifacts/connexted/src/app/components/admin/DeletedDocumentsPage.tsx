import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Trash2, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
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
  url: string;
  created_at: string;
  deleted_at: string;
  author?: {
    id: string;
    name: string;
  };
  deleted_by_user?: {
    id: string;
    name: string;
  };
}

export default function DeletedDocumentsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<DeletedDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      // Check if user is platform admin
      if (profile.role !== 'super') {
        toast.error('Access denied: Platform admin only');
        navigate('/');
        return;
      }
      fetchDeletedDocuments();
    }
  }, [profile]);

  const fetchDeletedDocuments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          url,
          created_at,
          deleted_at,
          author:users!documents_author_id_fkey(id, name),
          deleted_by_user:users!documents_deleted_by_fkey(id, name)
        `)
        .not('deleted_at', 'is', null) // Only soft-deleted documents
        .order('deleted_at', { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching deleted documents:', error);
      toast.error('Failed to load deleted documents');
    } finally {
      setLoading(false);
    }
  };

  const handleHardDelete = async (docId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      setDocuments(documents.filter(d => d.id !== docId));
      toast.success(`"${title}" permanently deleted`);
    } catch (error) {
      console.error('Error permanently deleting document:', error);
      toast.error('Failed to permanently delete document');
    }
  };

  if (!profile || profile.role !== 'super') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading deleted documents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Deleted Documents' },
        ]}
      />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-2">Deleted Documents</h1>
          <p className="text-gray-600">Review and permanently delete soft-deleted documents</p>
        </div>
        <Badge variant="destructive" className="gap-2">
          <AlertTriangle className="w-4 h-4" />
          Platform Admin Only
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Soft-Deleted Documents ({documents.length})
          </CardTitle>
          <p className="text-sm text-gray-600">
            These documents have been removed from all circles and tables but remain in the database.
            You can permanently delete them here.
          </p>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No deleted documents
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Deleted By</TableHead>
                    <TableHead>Deleted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium max-w-xs">
                        <div className="truncate" title={doc.title}>
                          {doc.title}
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View URL
                        </a>
                      </TableCell>
                      <TableCell>
                        {doc.author?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {doc.deleted_by_user?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatDistanceToNow(new Date(doc.deleted_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Permanent Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Permanently Delete Document?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete "{doc.title}"
                                from the database. All associated data will be lost.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleHardDelete(doc.id, doc.title)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Permanently Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}