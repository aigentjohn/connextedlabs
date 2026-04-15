import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router';
import { ExternalLink, Star, Eye, Calendar, Bookmark, BookmarkCheck, Trash2, BookOpen, Plus, X, Download, Maximize2, Edit, Lock, Share2, Tag } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useViewTracking } from '@/hooks/useViewTracking';
import PrivateCommentDialog from '@/app/components/shared/PrivateCommentDialog';
import { ShareInviteButton } from '@/app/components/shared/ShareInviteButton';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Separator } from '@/app/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { TopicSelector } from '@/app/components/unified/TopicSelector';

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
  view_count?: number;
  unique_viewers?: string[];
  last_viewed_at?: string;
  author?: {
    id: string;
    name: string;
    avatar: string;
  };
}

interface Circle {
  id: string;
  name: string;
  host_ids: string[];
  moderator_ids: string[];
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [document, setDocument] = useState<Document | null>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [libraries, setLibraries] = useState<any[]>([]);
  const [userLibraries, setUserLibraries] = useState<any[]>([]);
  const [librariesDialogOpen, setLibrariesDialogOpen] = useState(false);
  const [selectedLibraries, setSelectedLibraries] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'info' | 'inline'>('info'); // Track viewing mode
  const [whereUsedOpen, setWhereUsedOpen] = useState(false);
  const [tables, setTables] = useState<any[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [topics, setTopics] = useState<any[]>([]);
  const [isEditTopicsTagsOpen, setIsEditTopicsTagsOpen] = useState(false);
  const [editingTopicIds, setEditingTopicIds] = useState<string[]>([]);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [relatedContent, setRelatedContent] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Track view automatically
  useViewTracking('document', id);

  useEffect(() => {
    if (id && profile) {
      fetchDocument();
    }
  }, [id, profile]);

  // Check for view parameter in URL and set view mode
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'inline') {
      setViewMode('inline');
    }
  }, [searchParams]);

  const fetchDocument = async () => {
    if (!id || !profile) return;

    try {
      setLoading(true);

      // Fetch document with author info
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select(`
          id,
          circle_ids,
          table_ids,
          author_id,
          title,
          description,
          url,
          tags,
          views,
          favorites_count,
          access_level,
          created_at,
          view_count,
          unique_viewers,
          last_viewed_at,
          author:users!documents_author_id_fkey(id, name, avatar)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (docError) throw docError;

      if (!doc) {
        toast.error('Document not found');
        navigate('/documents');
        return;
      }

      setDocument(doc);

      // Fetch circles this document belongs to
      if (doc.circle_ids && doc.circle_ids.length > 0) {
        const { data: circleData, error: circleError } = await supabase
          .from('circles')
          .select('id, name, host_ids, moderator_ids')
          .in('id', doc.circle_ids);

        if (!circleError && circleData) {
          setCircles(circleData);
        }
      }

      // Fetch libraries this document belongs to
      const { data: libDocs, error: libDocsError } = await supabase
        .from('library_documents')
        .select(`
          library:libraries(id, name, icon)
        `)
        .eq('document_id', id);
      
      if (libDocsError) {
        console.error('Error fetching libraries:', libDocsError);
      } else if (libDocs) {
        const documentLibraries = libDocs.map((ld: any) => ld.library).filter(Boolean);
        setLibraries(documentLibraries);
      }

      // Fetch user libraries (where user is a member)
      const { data: userLibraryData, error: userLibraryError } = await supabase
        .from('libraries')
        .select('id')
        .contains('member_ids', [profile.id]);

      if (!userLibraryError && userLibraryData) {
        setUserLibraries(userLibraryData.map((lib: any) => lib.id));
      }

      // Fetch tables this document is used in
      if (doc.table_ids && doc.table_ids.length > 0) {
        const { data: tableData, error: tableError } = await supabase
          .from('tables')
          .select('*')
          .in('id', doc.table_ids);

        if (!tableError && tableData) {
          setTables(tableData);
        }
      }

      // Check if document is favorited
      const { data: favoriteData, error: favoriteError} = await supabase
        .from('content_favorites')
        .select('*')
        .eq('user_id', profile.id)
        .eq('content_id', id)
        .eq('content_type', 'document');

      if (!favoriteError && favoriteData && favoriteData.length > 0) {
        setIsFavorited(true);
      }

      // Fetch topics for this document
      try {
        const topicsResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/content/document/${id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (topicsResponse.ok) {
          const { topics: documentTopics } = await topicsResponse.json();
          setTopics(documentTopics || []);
        }
      } catch (error) {
        console.error('Error fetching topics:', error);
        // Non-fatal error, continue loading
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      toast.error('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!document || !profile) return;

    try {
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('content_favorites')
          .delete()
          .eq('user_id', profile.id)
          .eq('content_id', document.id)
          .eq('content_type', 'document');

        if (error) throw error;
        setIsFavorited(false);
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('content_favorites')
          .insert({
            user_id: profile.id,
            content_id: document.id,
            content_type: 'document'
          });

        if (error) throw error;
        setIsFavorited(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const handleDeleteDocument = async () => {
    if (!document || !profile) return;

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
        .eq('id', document.id);

      if (error) throw error;

      toast.success('Document deleted');
      navigate('/documents');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const canDeleteDocument = () => {
    if (!document || !profile) return false;

    // Platform admin can delete anything
    if (profile.role === 'admin' || profile.role === 'super') return true;

    // Author can delete their own
    if (document.author_id === profile.id) return true;

    // Container admin can delete if doc is in their container
    const isCircleAdmin = document.circle_ids?.some(circleId => {
      const circle = circles.find(c => c.id === circleId);
      return circle?.host_ids?.includes(profile.id) ||
        circle?.moderator_ids?.includes(profile.id);
    });

    return isCircleAdmin;
  };

  const handleOpenDocument = () => {
    if (document) {
      window.open(document.url, '_blank', 'noopener,noreferrer');
    }
  };

  const getUrlSource = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      if (hostname.includes('google.com')) {
        if (url.includes('/document/')) return 'Google Docs';
        if (url.includes('/spreadsheets/')) return 'Google Sheets';
        if (url.includes('/presentation/')) return 'Google Slides';
        return 'Google Drive';
      }
      if (hostname.includes('notion.so') || hostname.includes('notion.site')) return 'Notion';
      if (hostname.includes('dropbox.com')) return 'Dropbox';
      if (hostname.includes('airtable.com')) return 'Airtable';
      if (hostname.includes('figma.com')) return 'Figma';
      if (hostname.includes('miro.com')) return 'Miro';
      if (hostname.includes('docs.microsoft.com') || hostname.includes('office.com')) return 'Microsoft 365';
      if (hostname.includes('github.com')) return 'GitHub';
      if (hostname.includes('gitlab.com')) return 'GitLab';
      
      // Return domain name
      return hostname.replace('www.', '');
    } catch {
      return 'External Link';
    }
  };

  const canEditDocument = () => {
    if (!document || !profile) return false;

    // Platform admin can edit anything
    if (profile.role === 'super') return true;

    // Author can edit their own
    if (document.author_id === profile.id) return true;

    return false;
  };

  const handleOpenEditTopicsTags = () => {
    setEditingTopicIds(topics.map(t => t.id));
    setEditingTags(document?.tags || []);
    setIsEditTopicsTagsOpen(true);
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !editingTags.includes(trimmedTag)) {
      setEditingTags([...editingTags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditingTags(editingTags.filter(tag => tag !== tagToRemove));
  };

  const handleSaveTopicsTags = async () => {
    if (!document || !id) return;

    try {
      // Update tags in Supabase
      const { error: tagsError } = await supabase
        .from('documents')
        .update({ tags: editingTags })
        .eq('id', id);

      if (tagsError) throw tagsError;

      // Update topics via API
      const topicsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contentType: 'document',
            contentId: id,
            topicIds: editingTopicIds
          })
        }
      );

      if (!topicsResponse.ok) {
        throw new Error('Failed to update topics');
      }

      // Refresh document data
      await fetchDocument();
      setIsEditTopicsTagsOpen(false);
      toast.success('Topics and tags updated successfully');
    } catch (error) {
      console.error('Error updating topics/tags:', error);
      toast.error('Failed to update topics and tags');
    }
  };

  // Fetch related content based on topics and tags
  useEffect(() => {
    if (document && topics.length > 0) {
      fetchRelatedContent();
    }
  }, [document, topics]);

  const fetchRelatedContent = async () => {
    if (!document || !id) return;
    
    setLoadingRelated(true);
    try {
      const topicIds = topics.map(t => t.id);
      const tags = document.tags || [];

      // Fetch documents with shared topics
      let relatedItems: any[] = [];

      if (topicIds.length > 0) {
        const { data: relatedDocs } = await supabase
          .from('documents')
          .select('id, title, description, created_at, author:users!documents_author_id_fkey(name, avatar)')
          .neq('id', id)
          .is('deleted_at', null)
          .limit(3);

        if (relatedDocs) {
          // Filter docs that share topics via the API
          for (const doc of relatedDocs) {
            try {
              const topicsResponse = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/content/document/${doc.id}`,
                {
                  headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              
              if (topicsResponse.ok) {
                const { topics: docTopics } = await topicsResponse.json();
                const sharedTopics = docTopics?.filter((t: any) => topicIds.includes(t.id)) || [];
                
                if (sharedTopics.length > 0) {
                  relatedItems.push({
                    ...doc,
                    type: 'document',
                    sharedTopics: sharedTopics.length
                  });
                }
              }
            } catch (err) {
              console.error('Error checking document topics:', err);
            }
          }
        }
      }

      // Fetch books with shared topics
      if (topicIds.length > 0) {
        const { data: relatedBooks } = await supabase
          .from('books')
          .select('id, title, description, author_name, cover_image, created_at')
          .is('deleted_at', null)
          .limit(3);

        if (relatedBooks) {
          for (const book of relatedBooks) {
            try {
              const topicsResponse = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/content/book/${book.id}`,
                {
                  headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              
              if (topicsResponse.ok) {
                const { topics: bookTopics } = await topicsResponse.json();
                const sharedTopics = bookTopics?.filter((t: any) => topicIds.includes(t.id)) || [];
                
                if (sharedTopics.length > 0) {
                  relatedItems.push({
                    ...book,
                    type: 'book',
                    sharedTopics: sharedTopics.length
                  });
                }
              }
            } catch (err) {
              console.error('Error checking book topics:', err);
            }
          }
        }
      }

      // Fetch decks with shared topics
      if (topicIds.length > 0) {
        const { data: relatedDecks } = await supabase
          .from('decks')
          .select('id, title, description, created_at, author:users!decks_author_id_fkey(name, avatar)')
          .is('deleted_at', null)
          .limit(3);

        if (relatedDecks) {
          for (const deck of relatedDecks) {
            try {
              const topicsResponse = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/content/deck/${deck.id}`,
                {
                  headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              
              if (topicsResponse.ok) {
                const { topics: deckTopics } = await topicsResponse.json();
                const sharedTopics = deckTopics?.filter((t: any) => topicIds.includes(t.id)) || [];
                
                if (sharedTopics.length > 0) {
                  relatedItems.push({
                    ...deck,
                    type: 'deck',
                    sharedTopics: sharedTopics.length
                  });
                }
              }
            } catch (err) {
              console.error('Error checking deck topics:', err);
            }
          }
        }
      }

      // Sort by number of shared topics and take top 6
      relatedItems.sort((a, b) => b.sharedTopics - a.sharedTopics);
      setRelatedContent(relatedItems.slice(0, 6));
    } catch (error) {
      console.error('Error fetching related content:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  const getContentIcon = (type: string) => {
    if (type === 'document') return '📄';
    if (type === 'book') return '📚';
    if (type === 'deck') return '🎴';
    return '📄';
  };

  const getContentPath = (item: any) => {
    if (item.type === 'document') return `/documents/${item.id}`;
    if (item.type === 'book') return `/books/${item.id}`;
    if (item.type === 'deck') return `/decks/${item.id}`;
    return '#';
  };

  if (!profile) {
    navigate('/');
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center h-64">
        <div className="text-gray-600">Loading document...</div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <p>Document not found</p>
        <Button onClick={() => navigate('/documents')}>Back to Documents</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Documents', path: '/documents' },
          { label: document.title, path: `/documents/${document.id}` }
        ]}
      />

      {/* Document Header */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Category & Actions */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📄</span>
              <Badge variant="secondary" className="capitalize">
                Document
              </Badge>
            </div>
            
            {/* View Mode Toggle + Actions */}
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'info' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('info')}
                  className="rounded-none border-0"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Info
                </Button>
                <Button
                  variant={viewMode === 'inline' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('inline')}
                  className="rounded-none border-0"
                >
                  <BookOpen className="w-4 h-4 mr-1" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenDocument}
                  className="rounded-none border-0"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="h-6 w-px bg-gray-200" />
              
              <Button
                variant={isFavorited ? 'default' : 'outline'}
                size="sm"
                onClick={handleToggleFavorite}
                className="gap-2"
              >
                {isFavorited ? (
                  <>
                    <BookmarkCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Saved</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    <span className="hidden sm:inline">Save</span>
                  </>
                )}
              </Button>
              
              {/* Where Used Dialog */}
              <Dialog open={whereUsedOpen} onOpenChange={setWhereUsedOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Where Used</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Document Usage</DialogTitle>
                    <DialogDescription>
                      {circles.length > 0 || tables.length > 0 || libraries.length > 0
                        ? 'This document is shared in the following locations'
                        : 'This document is not currently shared'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Libraries */}
                    {libraries.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Libraries ({libraries.length})</h4>
                        <div className="space-y-1">
                          {libraries.map((library) => (
                            <Link 
                              key={library.id} 
                              to={`/libraries/${library.id}`}
                              onClick={() => setWhereUsedOpen(false)}
                              className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition-colors"
                            >
                              <span>{library.icon || '📚'}</span>
                              <span className="text-sm">{library.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Circles */}
                    {circles.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Circles ({circles.length})</h4>
                        <div className="space-y-1">
                          {circles.map((circle) => (
                            <Link 
                              key={circle.id} 
                              to={`/circles/${circle.id}`}
                              onClick={() => setWhereUsedOpen(false)}
                              className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition-colors"
                            >
                              <span>📍</span>
                              <span className="text-sm">{circle.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Tables */}
                    {tables.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Tables ({tables.length})</h4>
                        <div className="space-y-1">
                          {tables.map((table) => (
                            <Link 
                              key={table.id} 
                              to={`/tables/${table.id}`}
                              onClick={() => setWhereUsedOpen(false)}
                              className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition-colors"
                            >
                              <span>🗂️</span>
                              <span className="text-sm">{table.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {circles.length === 0 && tables.length === 0 && libraries.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        This document is not currently shared in any circles, tables, or libraries.
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              
              {document.author_id && document.author_id !== profile.id && (
                <PrivateCommentDialog
                  containerId={document.id}
                  containerTitle={document.title}
                  recipientId={document.author_id}
                  recipientName={document.author?.name || 'the author'}
                />
              )}
              
              <ShareInviteButton
                entityType="document"
                entityId={document.id}
                entityName={document.title}
              />
              
              {canEditDocument() && (
                <Link to={`/documents/${document.id}/edit`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                </Link>
              )}
              {canDeleteDocument() && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
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
                      <AlertDialogAction onClick={handleDeleteDocument}>
                        Delete Document
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl">{document.title}</h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={document.author?.avatar} />
                <AvatarFallback>{document.author?.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <Link to={`/members/${document.author?.id}`} className="hover:underline">
                {document.author?.name}
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {document.views} {document.views === 1 ? 'view' : 'views'}
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4" />
              {document.favorites_count || 0} {document.favorites_count === 1 ? 'save' : 'saves'}
            </div>
          </div>

          {/* Description */}
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{document.description}</p>
          </div>

          {/* Document Properties Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Document Source */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Source:</h3>
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{getUrlSource(document.url)}</span>
              </div>
            </div>

            {/* Visibility */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Visibility:</h3>
              <div className="flex items-center gap-2">
                {document.access_level !== 'public' && <Lock className="w-4 h-4 text-gray-400" />}
                <Badge variant={document.access_level === 'public' ? 'outline' : 'secondary'} className="capitalize">
                  {document.access_level === 'public' && '🌐 '}
                  {document.access_level === 'member' && '👥 '}
                  {document.access_level === 'unlisted' && '🔗 '}
                  {document.access_level === 'private' && '🔒 '}
                  {document.access_level === 'public' ? 'Public — Anyone can view'
                    : document.access_level === 'member' ? 'Members Only'
                    : document.access_level === 'unlisted' ? 'Unlisted — Link only'
                    : 'Private'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Circles */}
          {circles.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Shared in:</h3>
              <div className="flex flex-wrap gap-2">
                {circles.map((circle) => (
                  <Link key={circle.id} to={`/circles/${circle.id}`}>
                    <Badge variant="outline" className="hover:bg-indigo-50 border-indigo-300 text-indigo-700">
                      <span className="mr-1">📍</span>
                      {circle.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Libraries */}
          {libraries.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">In Libraries:</h3>
              <div className="flex flex-wrap gap-2">
                {libraries.map((library) => (
                  <Link key={library.id} to={`/libraries/${library.id}`}>
                    <Badge variant="outline" className="hover:bg-green-50 border-green-300 text-green-700">
                      <span className="mr-1">{library.icon || '📚'}</span>
                      {library.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Tags:</h3>
              <div className="flex flex-wrap gap-2">
                {document.tags.map((tag) => (
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

          {/* Topics */}
          {topics.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Topics (Who/Why):</h3>
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

          {/* Edit Topics/Tags Button (Owner Only) */}
          {canEditDocument() && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEditTopicsTags}
                className="gap-2"
              >
                <Tag className="w-4 h-4" />
                Edit Topics & Tags
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Topics/Tags Dialog */}
      <Dialog open={isEditTopicsTagsOpen} onOpenChange={setIsEditTopicsTagsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Topics & Tags</DialogTitle>
            <DialogDescription>
              Update the topics (WHO/WHY) and tags (WHAT/HOW) for this document
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Topics Section */}
            <div>
              <Label className="text-base font-medium">Topics (Who/Why)</Label>
              <p className="text-sm text-gray-500 mb-3">Select audience identities and purposes</p>
              <TopicSelector 
                value={editingTopicIds}
                onChange={setEditingTopicIds}
              />
            </div>

            {/* Tags Section */}
            <div>
              <Label className="text-base font-medium">Tags (What/How)</Label>
              <p className="text-sm text-gray-500 mb-3">Add subject matter and method keywords</p>
              
              <div className="space-y-3">
                {/* Tag Input */}
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Type a tag and press Enter"
                  />
                  <Button onClick={handleAddTag} type="button">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>

                {/* Tag List */}
                {editingTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md">
                    {editingTags.map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="bg-gray-100 text-gray-700 pr-1"
                      >
                        <span className="mr-1">#</span>
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsEditTopicsTagsOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTopicsTags}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline Document Viewer */}
      {viewMode === 'inline' && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="w-4 h-4" />
                <span>Document Viewer</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenDocument}
                  className="gap-2"
                >
                  <Maximize2 className="w-4 h-4" />
                  Full Screen
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('info')}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="w-full bg-gray-50">
              <iframe
                src={document.url}
                className="w-full border-0"
                style={{ height: '80vh', minHeight: '600px' }}
                title={document.title}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Content */}
      {relatedContent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedContent.map(item => (
                <Link key={`${item.type}-${item.id}`} to={getContentPath(item)} className="block">
                  <Card className="hover:shadow-md transition-shadow h-full">
                    <CardContent className="pt-6 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getContentIcon(item.type)}</span>
                        <Badge variant="secondary" className="capitalize text-xs">
                          {item.type}
                        </Badge>
                      </div>
                      <h3 className="font-semibold line-clamp-2">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                      )}
                      {item.author && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 pt-2">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={item.author?.avatar} />
                            <AvatarFallback>{item.author?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{item.author?.name || item.author_name}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}