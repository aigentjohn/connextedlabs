import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { FileText, Search, Lock, ExternalLink, Star, BookOpen, X, Maximize2, Eye, Filter, Plus, Heart } from 'lucide-react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { toast } from 'sonner';
import { ViewCountBadge } from '@/app/components/analytics/ViewCountBadge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/app/components/ui/select';

interface Document {
  id: string;
  circle_ids: string[];
  table_ids: string[];
  author_id: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  access_level: 'public' | 'member' | 'unlisted' | 'private';
  created_at: string;
  view_count?: number;
  unique_viewers?: string[];
  is_favorited?: boolean;
  author?: {
    id: string;
    name: string;
    avatar: string;
  };
  libraries?: Array<{
    id: string;
    name: string;
    icon: string;
  }>;
}

interface Circle {
  id: string;
  name: string;
}

export default function DocumentsPage() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked'>('newest');
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});
  const [likedDocIds, setLikedDocIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (profile) {
      fetchDocuments();
    }
  }, [profile]);

  const fetchDocuments = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      const isPlatformAdmin = profile.role === 'super';

      // 1. Get user's accessible circles
      let circlesQuery = supabase
        .from('circles')
        .select('id, name')
        .eq('community_id', profile.community_id);
      
      if (!isPlatformAdmin) {
        circlesQuery = circlesQuery.contains('member_ids', [profile.id]);
      }

      const { data: userCircles, error: circlesError } = await circlesQuery;
      if (circlesError) throw circlesError;

      const circleIds = userCircles?.map(c => c.id) || [];
      setCircles(userCircles || []);

      // 2. Get user's accessible tables
      let tablesQuery = supabase
        .from('tables')
        .select('id')
        .eq('community_id', profile.community_id);
      
      if (!isPlatformAdmin) {
        tablesQuery = tablesQuery.contains('member_ids', [profile.id]);
      }

      const { data: userTables, error: tablesError } = await tablesQuery;
      if (tablesError) throw tablesError;

      const tableIds = userTables?.map(t => t.id) || [];

      // 3. Fetch all documents
      const { data: documentsData, error: documentsError } = await supabase
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
          access_level,
          created_at,
          view_count,
          unique_viewers,
          author:users!documents_author_id_fkey(id, name, avatar)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (documentsError) throw documentsError;

      // 4. Fetch library associations
      const documentIds = documentsData?.map(d => d.id) || [];
      let libraryAssociations: Record<string, Array<{ id: string; name: string; icon: string }>> = {};
      
      if (documentIds.length > 0) {
        const { data: libDocs, error: libDocsError } = await supabase
          .from('library_documents')
          .select(`
            document_id,
            library:libraries(id, name, icon)
          `)
          .in('document_id', documentIds);
        
        if (libDocsError) {
          console.error('Error fetching library associations:', libDocsError);
        } else if (libDocs) {
          libDocs.forEach((ld: any) => {
            if (!libraryAssociations[ld.document_id]) {
              libraryAssociations[ld.document_id] = [];
            }
            if (ld.library) {
              libraryAssociations[ld.document_id].push(ld.library);
            }
          });
        }
      }

      // 5. Fetch user favorites
      let favoriteDocumentIds: string[] = [];
      if (documentIds.length > 0) {
        const { data: favoritesData, error: favoritesError } = await supabase
          .from('content_favorites')
          .select('content_id')
          .eq('user_id', profile.id)
          .eq('content_type', 'document')
          .in('content_id', documentIds);
        
        if (favoritesError) {
          console.error('Error fetching favorites:', favoritesError);
        } else if (favoritesData) {
          favoriteDocumentIds = favoritesData.map(f => f.content_id);
        }
      }

      // 6. Fetch Era 3 likes data
      if (documentIds.length > 0) {
        const { data: likesData } = await supabase
          .from('content_likes')
          .select('content_id')
          .eq('content_type', 'document')
          .in('content_id', documentIds);

        if (likesData) {
          const counts: Record<string, number> = {};
          likesData.forEach(l => { counts[l.content_id] = (counts[l.content_id] || 0) + 1; });
          setLikesCountMap(counts);
        }

        // Fetch current user's likes
        const { data: userLikes } = await supabase
          .from('content_likes')
          .select('content_id')
          .eq('content_type', 'document')
          .eq('user_id', profile.id)
          .in('content_id', documentIds);

        if (userLikes) {
          setLikedDocIds(new Set(userLikes.map(l => l.content_id)));
        }
      }

      const documentsWithData = documentsData?.map(doc => ({
        ...doc,
        libraries: libraryAssociations[doc.id] || [],
        is_favorited: favoriteDocumentIds.includes(doc.id)
      })) || [];

      setDocuments(documentsWithData);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (docId: string) => {
    if (!profile) return;
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    const isFavorited = doc.is_favorited || false;

    try {
      if (isFavorited) {
        const { error } = await supabase
          .from('content_favorites')
          .delete()
          .eq('user_id', profile.id)
          .eq('content_type', 'document')
          .eq('content_id', docId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('content_favorites')
          .insert({
            user_id: profile.id,
            content_type: 'document',
            content_id: docId,
          });
        if (error) throw error;
      }
      setDocuments(prev =>
        prev.map(d =>
          d.id === docId ? { ...d, is_favorited: !isFavorited } : d
        )
      );
      toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
    }
  };

  const handleToggleLike = async (docId: string) => {
    if (!profile) return;
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    const isLiked = likedDocIds.has(docId);

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('content_likes')
          .delete()
          .eq('user_id', profile.id)
          .eq('content_type', 'document')
          .eq('content_id', docId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('content_likes')
          .insert({
            user_id: profile.id,
            content_type: 'document',
            content_id: docId,
          });
        if (error) throw error;
      }
      setLikedDocIds(prev => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.delete(docId);
        } else {
          newSet.add(docId);
        }
        return newSet;
      });
      toast.success(isLiked ? 'Removed like' : 'Added like');
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading documents...</div>
      </div>
    );
  }

  const uniqueTags = Array.from(new Set(documents.flatMap(d => d.tags || [])));

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'all' || doc.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'most-liked') return (likesCountMap[b.id] || 0) - (likesCountMap[a.id] || 0);
    return 0;
  });

  const recentDocuments = [...sortedDocuments].slice(0, 10);

  const favoriteDocuments = filteredDocuments.filter(doc => 
    doc.is_favorited === true
  );

  const authoredDocuments = filteredDocuments.filter(doc => 
    doc.author_id === profile.id
  );

  const canAccessContent = (accessLevel?: string) => {
    if (!accessLevel || accessLevel === 'public') return true;
    if (accessLevel === 'member' && profile.membership_tier !== 'free') return true;
    if (accessLevel === 'premium' && profile.membership_tier === 'premium') return true;
    return false;
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
      return hostname.replace('www.', '');
    } catch {
      return 'External Link';
    }
  };

  const renderDocumentCard = (doc: Document) => {
    const accessible = canAccessContent(doc.access_level);
    const isFavorite = doc.is_favorited || false;
    const isExpanded = expandedDocId === doc.id;
    const isLiked = likedDocIds.has(doc.id);
    const likeCount = likesCountMap[doc.id] || 0;

    return (
      <div key={doc.id}>
        <Card className={!accessible ? 'opacity-60' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-2xl">
                <FileText className="text-white w-6 h-6" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center space-x-2">
                    <Link to={`/documents/${doc.id}`}>
                      <h3 className="font-medium text-lg hover:text-indigo-600 transition-colors">
                        {doc.title}
                      </h3>
                    </Link>
                    {!accessible && (
                      <Lock className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  
                  {accessible && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Like button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleLike(doc.id);
                        }}
                        className={`h-8 px-2 gap-1 hover:bg-red-50 ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                        title={isLiked ? 'Unlike' : 'Like'}
                      >
                        <Heart
                          className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`}
                        />
                        {likeCount > 0 && (
                          <span className="text-xs font-medium">{likeCount}</span>
                        )}
                      </Button>

                      {/* Favourite button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleFavorite(doc.id);
                        }}
                        className="h-8 w-8 p-0 hover:bg-yellow-50"
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star 
                          className={`w-5 h-5 ${
                            isFavorite 
                              ? 'text-yellow-500 fill-yellow-500' 
                              : 'text-gray-400 hover:text-yellow-500'
                          }`} 
                        />
                      </Button>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                  {doc.description}
                </p>

                <div className="flex items-center space-x-2 mb-3">
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {getUrlSource(doc.url)}
                  </span>
                </div>

                {doc.author && (
                  <div className="flex items-center space-x-2 mb-3">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={doc.author.avatar} />
                      <AvatarFallback>{doc.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-600">
                      by {doc.author.name}
                    </span>
                    <span className="text-sm text-gray-400">•</span>
                    <span className="text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {doc.libraries && doc.libraries.length > 0 && doc.libraries.map((library) => (
                    <Link key={library.id} to={`/libraries/${library.id}`}>
                      <Badge variant="outline" className="hover:bg-green-50 border-green-300 text-green-700">
                        <span className="mr-1">{library.icon || '📚'}</span>
                        {library.name}
                      </Badge>
                    </Link>
                  ))}
                  {doc.tags && doc.tags.length > 0 && doc.tags.map((tag) => (
                    <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`}>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors">
                        <span className="mr-1">#</span>
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                  {doc.access_level && doc.access_level !== 'public' && (
                    <Badge variant="secondary" className="capitalize">
                      {doc.access_level === 'member' ? 'Members Only'
                        : doc.access_level === 'unlisted' ? 'Unlisted'
                        : 'Private'}
                    </Badge>
                  )}
                  <ViewCountBadge 
                    viewCount={doc.view_count} 
                    uniqueViewers={doc.unique_viewers?.length}
                  />
                </div>

                {accessible && (
                  <div className="flex justify-end">
                    <div className="flex items-center border rounded-lg overflow-hidden">
                      <Link to={`/documents/${doc.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-none border-0"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link to={`/documents/${doc.id}?view=inline`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-none border-0"
                          title="View document"
                        >
                          <BookOpen className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(doc.url, '_blank', 'noopener,noreferrer')}
                        className="rounded-none border-0"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {isExpanded && accessible && (
          <Card className="mt-2">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BookOpen className="w-4 h-4" />
                  <span className="font-medium">{doc.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(doc.url, '_blank', 'noopener,noreferrer')}
                    className="gap-2"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Full Screen</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedDocId(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="w-full bg-gray-50">
                <iframe
                  src={doc.url}
                  className="w-full border-0"
                  style={{ height: '70vh', minHeight: '500px' }}
                  title={doc.title}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Documents' }]}
        icon={FileText}
        iconBg="bg-amber-100"
        iconColor="text-amber-600"
        title="Document Library"
        description="Browse all documents available to you from your circles and the public community"
        actions={
          <Link to="/documents/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Document
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
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

      {uniqueTags.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filter by:</span>
              </div>
              
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select tag..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {uniqueTags.slice(0, 20).map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      #{tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTag !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTag('all')}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Documents</TabsTrigger>
          <TabsTrigger value="authored">Authored</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          <div className="text-sm text-gray-500 mb-2">
            {sortedDocuments.length} {sortedDocuments.length === 1 ? 'document' : 'documents'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedDocuments.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-6 text-gray-500">
                  {searchQuery ? 'No documents found' : 'No documents yet'}
                </CardContent>
              </Card>
            ) : (
              sortedDocuments.map(renderDocumentCard)
            )}
          </div>
        </TabsContent>

        <TabsContent value="authored" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {authoredDocuments.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-6 text-gray-500">
                  No documents authored by you
                </CardContent>
              </Card>
            ) : (
              authoredDocuments.map(renderDocumentCard)
            )}
          </div>
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favoriteDocuments.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-6 text-gray-500">
                  No favorite documents
                </CardContent>
              </Card>
            ) : (
              favoriteDocuments.map(renderDocumentCard)
            )}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentDocuments.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-6 text-gray-500">
                  No recent documents
                </CardContent>
              </Card>
            ) : (
              recentDocuments.map(renderDocumentCard)
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}