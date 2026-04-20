import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { FileText, Search, ExternalLink, Plus, Trash2, Edit, Star, Bookmark, Users, Lock, Globe, Share2, Check, Lightbulb } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import ShareDocumentDialog from '@/app/components/ShareDocumentDialog';
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
  circle_ids: string[];
  table_ids: string[];
  author_id: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  views: number;
  favorites_count?: number;
  access_level: 'public' | 'member' | 'unlisted' | 'private';
  created_at: string;
}

interface Circle {
  id: string;
  name: string;
}

interface Table {
  id: string;
  name: string;
}

export default function MyDocumentsPage() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoritedDocIds, setFavoritedDocIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Fetch user's authored documents
      const { data: authoredDocs, error: authoredError } = await supabase
        .from('documents')
        .select('*')
        .eq('author_id', profile.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (authoredError) throw authoredError;

      setDocuments(authoredDocs || []);

      // Fetch this user's favorited document IDs
      const docIds = (authoredDocs || []).map((d: Document) => d.id);
      if (docIds.length > 0) {
        const { data: favData } = await supabase
          .from('content_favorites')
          .select('content_id')
          .eq('user_id', profile.id)
          .eq('content_type', 'document')
          .in('content_id', docIds);
        setFavoritedDocIds(new Set((favData || []).map((f: any) => f.content_id)));
      }

      // Fetch user's circles for display names
      const { data: circlesData } = await supabase
        .from('circles')
        .select('id, name')
        .contains('member_ids', [profile.id])
        .order('name');
      setCircles(circlesData || []);

      // Fetch user's tables for display names
      const { data: tablesData } = await supabase
        .from('tables')
        .select('id, name')
        .contains('member_ids', [profile.id])
        .order('name');
      setTables(tablesData || []);

    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!profile) return;

    try {
      // Soft delete
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
      toast.success('Document deleted');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading your documents...</div>
      </div>
    );
  }

  // Filter documents by search
  const filterBySearch = (docs: Document[]) => {
    return docs.filter(
      (doc) =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const filteredDocuments = filterBySearch(documents);

  // Separate by author and favorite status
  const createdDocs = filteredDocuments.filter(d => d.author_id === profile.id);

  // Separate created docs by privacy level
  const personalDocs = createdDocs.filter(
    d => (!d.circle_ids || d.circle_ids.length === 0) && (!d.table_ids || d.table_ids.length === 0)
  );
  const sharedWithCircles = createdDocs.filter(d => d.circle_ids && d.circle_ids.length > 0);
  const sharedWithTables = createdDocs.filter(d => d.table_ids && d.table_ids.length > 0);

  const getCircleNames = (circleIds: string[]) => {
    return circleIds
      .map(id => circles.find(c => c.id === id)?.name || 'Unknown Circle')
      .join(', ');
  };

  const getTableNames = (tableIds: string[]) => {
    return tableIds
      .map(id => tables.find(t => t.id === id)?.name || 'Unknown Table')
      .join(', ');
  };



  const renderDocumentCard = (doc: Document, showShareInfo: boolean = false) => {
    const isCreatedByUser = doc.author_id === profile.id;
    const isFavorited = favoritedDocIds.has(doc.id);
    const hasCircles = doc.circle_ids && doc.circle_ids.length > 0;
    const hasTables = doc.table_ids && doc.table_ids.length > 0;

    return (
      <Card key={doc.id} className="hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-2xl">
              <FileText className="text-white w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/documents/${doc.id}`}>
                    <h3 className="font-medium text-lg hover:text-indigo-600 transition-colors">
                      {doc.title}
                    </h3>
                  </Link>
                  {isCreatedByUser && (
                    <Bookmark className="w-4 h-4 text-blue-500 fill-blue-500" />
                  )}
                  {isFavorited && !isCreatedByUser && (
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                {isCreatedByUser && (
                  <div className="flex items-center gap-2 ml-2">
                    <Link to={`/documents/${doc.id}`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDocument(doc);
                        setShareDialogOpen(true);
                      }}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the document from all circles and tables.
                            {profile.role === 'super'
                              ? ' As a platform admin, you can permanently delete it later.'
                              : ' It can be reviewed by platform admins.'}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteDocument(doc.id)}>
                            Delete Document
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {doc.description}
              </p>

              {/* Share Info */}
              {showShareInfo && isCreatedByUser && (hasCircles || hasTables) && (
                <div className="mb-3 space-y-1">
                  {hasCircles && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Users className="w-3 h-3" />
                      <span>Circles: {getCircleNames(doc.circle_ids)}</span>
                    </div>
                  )}
                  {hasTables && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Globe className="w-3 h-3" />
                      <span>Tables: {getTableNames(doc.table_ids)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tags and Status */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {doc.tags && doc.tags.length > 0 && doc.tags.slice(0, 3).map((tag) => (
                  <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`}>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors">
                      <span className="mr-1">#</span>
                      {tag}
                    </Badge>
                  </Link>
                ))}
                {!hasCircles && !hasTables && isCreatedByUser && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Personal
                  </Badge>
                )}
                {doc.access_level && doc.access_level !== 'public' && (
                  <Badge variant="secondary" className="capitalize">
                    {doc.access_level === 'member' ? 'Members Only'
                      : doc.access_level === 'unlisted' ? 'Unlisted'
                      : 'Private'}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>Created {new Date(doc.created_at).toLocaleDateString()}</span>
                <span>{doc.views || 0} views • {doc.favorites_count || 0} saves</span>
              </div>

              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                View Document
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'My Documents' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">My Documents</h1>
          <p className="text-gray-600">Organize and manage your personal and shared documents</p>
        </div>
        <Link to="/documents/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Document
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search your documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">{filteredDocuments.length}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">{personalDocs.length}</div>
              <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" />
                Personal
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{sharedWithCircles.length}</div>
              <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                <Users className="w-3 h-3" />
                Circles
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{sharedWithTables.length}</div>
              <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                <Globe className="w-3 h-3" />
                Tables
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All Documents
            {filteredDocuments.length > 0 && (
              <Badge variant="secondary" className="ml-2">{filteredDocuments.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="personal">
            <Lock className="w-4 h-4 mr-1.5" />
            Personal
            {personalDocs.length > 0 && (
              <Badge variant="secondary" className="ml-2">{personalDocs.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="circles">
            <Users className="w-4 h-4 mr-1.5" />
            Shared with Circles
            {sharedWithCircles.length > 0 && (
              <Badge variant="secondary" className="ml-2">{sharedWithCircles.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tables">
            <Globe className="w-4 h-4 mr-1.5" />
            Shared with Tables
            {sharedWithTables.length > 0 && (
              <Badge variant="secondary" className="ml-2">{sharedWithTables.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Documents Tab */}
        <TabsContent value="all" className="space-y-6 mt-6">
          {filteredDocuments.length === 0 ? (
            searchQuery ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No documents found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Try a different search term
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <Lightbulb className="w-5 h-5" />
                    Create Your First Document
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-green-800">
                    Documents are URL-based resources you can share with circles and add to libraries.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-green-900">Link to articles, guides, videos, or any web resource</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-green-900">Share with specific circles or make public</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-green-900">Organize with categories and tags</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-green-900">Track views and engagement</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Link to="/documents/new">
                      <Button className="bg-green-600 hover:bg-green-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Document
                      </Button>
                    </Link>
                  </div>
                  <div className="p-3 bg-white rounded border border-green-200">
                    <p className="text-sm font-medium mb-1 text-green-900 flex items-center gap-1">
                      <Lightbulb className="w-4 h-4" />
                      Pro Tip
                    </p>
                    <p className="text-xs text-green-800">
                      Have many URLs to organize? Check out{' '}
                      <Link to="/my-contents" className="text-green-600 underline hover:text-green-700">
                        My Links
                      </Link>{' '}
                      for batch importing and organizing 50+ URLs at once.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocuments.map(doc => renderDocumentCard(doc, true))}
            </div>
          )}
        </TabsContent>

        {/* Personal Documents Tab */}
        <TabsContent value="personal" className="space-y-4 mt-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Lock className="w-4 h-4" />
            <span>These documents are private and not shared with any circles or tables</span>
          </div>
          {personalDocs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'No personal documents found' : 'No personal documents yet'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Create a document without sharing it to keep it personal'}
                </p>
                {!searchQuery && (
                  <Link to="/documents/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Personal Document
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personalDocs.map(doc => renderDocumentCard(doc))}
            </div>
          )}
        </TabsContent>

        {/* Shared with Circles Tab */}
        <TabsContent value="circles" className="space-y-4 mt-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Users className="w-4 h-4" />
            <span>Documents you've shared with circles</span>
          </div>
          {sharedWithCircles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'No circle documents found' : 'No documents shared with circles yet'}
                </h3>
                <p className="text-gray-600">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Share documents with circles to collaborate with members'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sharedWithCircles.map(doc => renderDocumentCard(doc, true))}
            </div>
          )}
        </TabsContent>

        {/* Shared with Tables Tab */}
        <TabsContent value="tables" className="space-y-4 mt-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Globe className="w-4 h-4" />
            <span>Documents you've shared with tables</span>
          </div>
          {sharedWithTables.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'No table documents found' : 'No documents shared with tables yet'}
                </h3>
                <p className="text-gray-600">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Share documents with tables to organize resources'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sharedWithTables.map(doc => renderDocumentCard(doc, true))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Share Document Dialog */}
      {selectedDocument && (
        <ShareDocumentDialog
          open={shareDialogOpen}
          onClose={() => {
            setShareDialogOpen(false);
            setSelectedDocument(null);
          }}
          documentId={selectedDocument.id}
          documentTitle={selectedDocument.title}
          currentCircleIds={selectedDocument.circle_ids || []}
          currentTableIds={selectedDocument.table_ids || []}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}