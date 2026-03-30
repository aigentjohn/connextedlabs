import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { FileText, Search, Trash2, Download, ExternalLink, Eye, Star } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
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
import { format } from 'date-fns';

interface Document {
  id: string;
  title: string;
  description: string;
  url: string;
  author_id: string;
  circle_ids: string[];
  table_ids: string[];
  tags: string[];
  views: number;
  favorites: string[];
  access_level: string;
  created_at: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
}

export default function DocumentsManagement() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  useEffect(() => {
    if (!profile || profile.role !== 'super') return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all documents with author info using JOIN (matching Content Moderation approach)
        const { data: documentsData, error: documentsError } = await supabase
          .from('documents')
          .select(`
            *,
            author:users!documents_author_id_fkey(id, name, email, avatar)
          `)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (documentsError) throw documentsError;
        setDocuments(documentsData || []);
        
        // Fetch circles for display
        const { data: circlesData } = await supabase
          .from('circles')
          .select('id, name');
        setCircles(circlesData || []);
        
        // Fetch users for additional lookups if needed
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, email');
        setUsers(usersData || []);
        
      } catch (error) {
        console.error('Error fetching documents:', error);
        toast.error('Failed to load documents');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);
  
  if (!profile || profile.role !== 'super') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access</p>
      </div>
    );
  }
  
  const filteredDocuments = documents
    .filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

  const handleDeleteDocument = async (documentId: string, documentTitle: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', documentId);

      if (error) throw error;

      setDocuments(documents.filter(d => d.id !== documentId));
      toast.success(`Document "${documentTitle}" deleted successfully!`);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(documents, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `documents-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success('Documents exported successfully!');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[
          { label: 'Admin', path: '/admin' },
          { label: 'Documents Management' }
        ]} />
        <div className="text-center py-12">
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  const getAuthorName = (authorId: string) => {
    const author = users.find(u => u.id === authorId);
    return author ? author.name : 'Unknown';
  };

  const getCircleNames = (circleIds: string[]) => {
    return circleIds
      .map(id => circles.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'Platform-wide';
  };

  const totalViews = documents.reduce((sum, d) => sum + (d.views || 0), 0);
  const avgViews = documents.length > 0 ? Math.round(totalViews / documents.length) : 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Admin', path: '/admin' },
        { label: 'Documents Management' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Documents Management</h1>
          <p className="text-gray-600">Manage all documents across the platform</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToJSON} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalViews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgViews}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No documents found
            </CardContent>
          </Card>
        ) : (
          filteredDocuments.map(doc => {
            return (
              <Card key={doc.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold">{doc.title}</h3>
                      </div>
                      
                      <p className="text-gray-700 mb-3">{doc.description}</p>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                        <div>Author: {getAuthorName(doc.author_id)}</div>
                        <div>Circles: {getCircleNames(doc.circle_ids || [])}</div>
                        <div className="flex items-center">
                          <Eye className="w-4 h-4 mr-1" />
                          {doc.views || 0} views
                        </div>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 mr-1" />
                          {doc.favorites?.length || 0} favorites
                        </div>
                        <div>{format(new Date(doc.created_at), 'PPp')}</div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {doc.tags?.map(tag => (
                          <Badge key={tag} variant="outline" className="bg-gray-50">
                            {tag}
                          </Badge>
                        ))}
                        {doc.access_level !== 'public' && (
                          <Badge variant="secondary" className="capitalize">
                            {doc.access_level}
                          </Badge>
                        )}
                      </div>
                      
                      <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline text-sm inline-flex items-center"
                      >
                        View Document <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Link to={`/documents/${doc.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{doc.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteDocument(doc.id, doc.title)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}