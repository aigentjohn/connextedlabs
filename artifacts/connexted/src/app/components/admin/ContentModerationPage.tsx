import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Trash2, AlertTriangle, FileText, Star as StarIcon, Search, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
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

interface Document {
  id: string;
  title: string;
  description: string;
  url: string;
  created_at: string;
  author?: {
    id: string;
    name: string;
    avatar: string;
  };
}

interface Review {
  id: string;
  title: string;
  description: string;
  link_url: string;
  external_rating: number;
  created_at: string;
  author?: {
    id: string;
    name: string;
    avatar: string;
  };
}

export default function ContentModerationPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (profile) {
      // Check if user is platform admin
      if (profile.role !== 'super') {
        toast.error('Access denied: Platform admin only');
        navigate('/');
        return;
      }
      fetchDocuments();
      fetchReviews();
    }
  }, [profile]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);

      // Fetch all active documents (not soft-deleted)
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          description,
          url,
          created_at,
          author:users!documents_author_id_fkey(id, name, avatar)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      setDocuments(docsData || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);

      // Fetch all reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('endorsements')
        .select(`
          id,
          title,
          description,
          link_url,
          external_rating,
          created_at,
          author:users!reviews_author_id_fkey(id, name, avatar)
        `)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      setReviews(reviewsData || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, title: string) => {
    if (!profile) return;

    try {
      // Soft delete: set deleted_at and deleted_by, remove from all containers
      const { error } = await supabase
        .from('documents')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: profile.id,
          circle_ids: [],
          table_ids: [],
        })
        .eq('id', docId);

      if (error) throw error;

      setDocuments(documents.filter(d => d.id !== docId));
      toast.success(`Document "${title}" deleted`);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleDeleteReview = async (reviewId: string, title: string) => {
    try {
      // Hard delete for reviews (no soft delete support)
      const { error } = await supabase
        .from('endorsements')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      setReviews(reviews.filter(r => r.id !== reviewId));
      toast.success(`Review "${title}" permanently deleted`);
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  if (!profile || profile.role !== 'super') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading content...</div>
      </div>
    );
  }

  // Filter content based on search
  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.author?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReviews = reviews.filter(review =>
    review.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    review.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    review.author?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Content Moderation' }
        ]}
      />
      
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-2">Content Moderation</h1>
          <p className="text-gray-600">Review and manage all documents and reviews</p>
        </div>
        <Badge variant="destructive" className="gap-2">
          <AlertTriangle className="w-4 h-4" />
          Platform Admin Only
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search by title, description, or author..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList>
          <TabsTrigger value="documents">
            Documents ({filteredDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="reviews">
            Reviews ({filteredReviews.length})
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Active Documents</CardTitle>
              <p className="text-sm text-gray-600">
                Review and delete documents as needed. Deleted documents are soft-deleted and can be permanently removed from the{' '}
                <Link to="/platform-admin/deleted-documents" className="text-blue-600 hover:underline">
                  Deleted Documents
                </Link>{' '}
                page.
              </p>
            </CardHeader>
            <CardContent>
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {searchQuery ? 'No documents found' : 'No documents yet'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="max-w-xs">
                            <div className="space-y-1">
                              <Link to={`/documents/${doc.id}`}>
                                <div className="font-medium hover:text-blue-600 truncate" title={doc.title}>
                                  {doc.title}
                                </div>
                              </Link>
                              <p className="text-xs text-gray-600 truncate" title={doc.description}>
                                {doc.description}
                              </p>
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs text-blue-600 hover:underline gap-1"
                              >
                                View URL <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={doc.author?.avatar} />
                                <AvatarFallback>{doc.author?.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <Link
                                to={`/members/${doc.author?.id}`}
                                className="text-sm hover:underline"
                              >
                                {doc.author?.name || 'Unknown'}
                              </Link>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will soft-delete "{doc.title}" and remove it from all circles and tables.
                                    You can permanently delete it later from the Deleted Documents page.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteDocument(doc.id, doc.title)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
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
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Reviews</CardTitle>
              <p className="text-sm text-gray-600">
                Review and permanently delete reviews as needed. Reviews are permanently deleted immediately.
              </p>
            </CardHeader>
            <CardContent>
              {filteredReviews.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {searchQuery ? 'No reviews found' : 'No reviews yet'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReviews.map((review) => (
                        <TableRow key={review.id}>
                          <TableCell className="max-w-xs">
                            <div className="space-y-1">
                              <Link to={`/reviews/${review.id}`}>
                                <div className="font-medium hover:text-blue-600 truncate" title={review.title}>
                                  {review.title}
                                </div>
                              </Link>
                              <p className="text-xs text-gray-600 truncate" title={review.description}>
                                {review.description}
                              </p>
                              {review.link_url && (
                                <a
                                  href={review.link_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-xs text-blue-600 hover:underline gap-1"
                                >
                                  View Link <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {renderStars(review.external_rating)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={review.author?.avatar} />
                                <AvatarFallback>{review.author?.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <Link
                                to={`/members/${review.author?.id}`}
                                className="text-sm hover:underline"
                              >
                                {review.author?.name || 'Unknown'}
                              </Link>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Review?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the review "{review.title}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteReview(review.id, review.title)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}