import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { initializeSystemLibraries } from '@/lib/initializeSystemLibraries';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { PageHeader } from '@/app/components/shared/PageHeader';
import {
  BookOpen,
  Plus,
  Search,
  Globe,
  Lock,
  Eye,
  Calendar,
  RefreshCw,
  FolderOpen,
  Database,
  Tag,
  Check,
  Lightbulb,
} from 'lucide-react';

interface Library {
  id: string;
  name: string;
  description: string;
  type: 'system' | 'auto_generated' | 'manual';
  owner_type: 'user' | 'circle' | 'platform';
  owner_id: string | null;
  filter_rules: any;
  is_public: boolean;
  icon: string;
  created_at: string;
  updated_at: string;
  document_count?: number;
  folder_count?: number;
}

export default function LibrariesPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked'>('newest');
  const [likeCountsMap, setLikeCountsMap] = useState<Record<string, number>>({});
  const [likedByMeSet, setLikedByMeSet] = useState<Set<string>>(new Set());

  // Initialize system libraries on first load
  useEffect(() => {
    const initSystemLibs = async () => {
      if (!initialized && profile) {
        const result = await initializeSystemLibraries();
        setInitialized(true);
      }
    };
    initSystemLibs();
  }, [initialized, profile]);

  useEffect(() => {
    if (profile && initialized) {
      fetchLibraries();
    }
  }, [profile, activeTab, initialized]);

  const fetchLibraries = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      let query = supabase.from('libraries').select('*');

      // Filter based on active tab
      if (activeTab === 'my') {
        query = query.eq('owner_type', 'user').eq('owner_id', profile.id);
      } else if (activeTab === 'discover') {
        // Show system libraries AND public libraries (but not user's own private libraries)
        query = query.or(`type.eq.system,and(is_public.eq.true,owner_id.neq.${profile.id})`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Get document counts for each library
      const librariesWithCounts = await Promise.all(
        (data || []).map(async (library) => {
          if (library.type === 'manual') {
            // For manual libraries, count from library_documents
            const { count } = await supabase
              .from('library_documents')
              .select('*', { count: 'exact', head: true })
              .eq('library_id', library.id);

            const { count: folderCount } = await supabase
              .from('library_folders')
              .select('*', { count: 'exact', head: true })
              .eq('library_id', library.id);

            return { ...library, document_count: count || 0, folder_count: folderCount || 0 };
          } else if (library.type === 'auto_generated' && library.filter_rules) {
            const rules = library.filter_rules;
            let countQuery = supabase.from('documents').select('*', { count: 'exact', head: true });
            if (rules.document_type) {
              countQuery = Array.isArray(rules.document_type)
                ? countQuery.in('document_type', rules.document_type)
                : countQuery.eq('document_type', rules.document_type);
            }
            if (rules.intended_audience) {
              countQuery = countQuery.eq('intended_audience', rules.intended_audience);
            }
            if (rules.tags && Array.isArray(rules.tags) && rules.tags.length > 0) {
              countQuery = countQuery.overlaps('tags', rules.tags);
            }
            const { count } = await countQuery;
            return { ...library, document_count: count || 0, folder_count: 0 };
          } else if (library.type === 'system') {
            // For system libraries, count based on library name
            if (library.name === 'All Documents') {
              const { count } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true });
              return { ...library, document_count: count || 0, folder_count: 0 };
            } else if (library.name === 'My Documents') {
              const { count } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .eq('author_id', profile.id);
              return { ...library, document_count: count || 0, folder_count: 0 };
            } else if (library.name === 'Saved Documents') {
              // Count documents favorited by user from content_favorites table
              const { count } = await supabase
                .from('content_favorites')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', profile.id)
                .eq('content_type', 'document');
              return { ...library, document_count: count || 0, folder_count: 0 };
            } else if (library.name === 'Shared with Me') {
              // Documents shared into circles the user belongs to (excluding their own)
              const { data: memberCircles } = await supabase
                .from('circles')
                .select('id')
                .contains('member_ids', [profile.id]);
              const circleIds = (memberCircles || []).map((c: any) => c.id);
              if (circleIds.length > 0) {
                const { count } = await supabase
                  .from('documents')
                  .select('*', { count: 'exact', head: true })
                  .neq('author_id', profile.id)
                  .overlaps('circle_ids', circleIds);
                return { ...library, document_count: count || 0, folder_count: 0 };
              }
              return { ...library, document_count: 0, folder_count: 0 };
            }
          }
          return { ...library, document_count: 0, folder_count: 0 };
        })
      );

      setLibraries(librariesWithCounts);

      // Fetch likes
      if (librariesWithCounts.length > 0 && profile) {
        const ids = librariesWithCounts.map(l => l.id);
        const { data: likesData } = await supabase
          .from('content_likes')
          .select('content_id, user_id')
          .eq('content_type', 'library')
          .in('content_id', ids);

        const counts: Record<string, number> = {};
        const likedMe = new Set<string>();
        (likesData || []).forEach((like: { content_id: string; user_id: string }) => {
          counts[like.content_id] = (counts[like.content_id] || 0) + 1;
          if (like.user_id === profile.id) likedMe.add(like.content_id);
        });
        setLikeCountsMap(counts);
        setLikedByMeSet(likedMe);
      }
    } catch (error) {
      console.error('Error fetching libraries:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLibraries = libraries.filter((library) =>
    library.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    library.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedLibraries = [...filteredLibraries].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'most-liked') return (likeCountsMap[b.id] || 0) - (likeCountsMap[a.id] || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const getLibraryIcon = (library: Library) => {
    if (library.icon) return library.icon;
    if (library.type === 'system') return '📄';
    if (library.type === 'auto_generated') return '🔄';
    return '📚';
  };

  const getLibraryTypeLabel = (library: Library) => {
    if (library.type === 'system') return 'System';
    if (library.type === 'auto_generated') return 'Auto-Gen';
    return 'Manual';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Libraries' }]}
        icon={BookOpen}
        iconBg="bg-emerald-100"
        iconColor="text-emerald-600"
        title="Libraries"
        description="Organize and discover documents across the platform"
        actions={
          <Button asChild>
            <Link to="/libraries/create">
              <Plus className="w-4 h-4 mr-2" />
              Create Library
            </Link>
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('my')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'my'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          My Libraries
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'discover'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Discover
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search libraries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500">Sort:</span>
        <Button variant={sortBy === 'newest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('newest')}>Newest</Button>
        <Button variant={sortBy === 'oldest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('oldest')}>Oldest</Button>
        <Button variant={sortBy === 'most-liked' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-liked')}>Most Liked</Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-gray-500 mt-4">Loading libraries...</p>
        </div>
      )}

      {/* Libraries Grid */}
      {!loading && (
        <>
          {activeTab === 'my' && (
            <div className="space-y-4">
              {sortedLibraries.length === 0 ? (
                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-900">
                      <Lightbulb className="w-5 h-5" />
                      Start Your First Library
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-purple-800">
                      Libraries are curated collections of documents organized by theme. Perfect for courses, programs, or resource hubs.
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span className="text-purple-900">Organize documents into themed collections</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span className="text-purple-900">Create folders within libraries for structure</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span className="text-purple-900">Share entire collections publicly or with circles</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span className="text-purple-900">Perfect for learning paths and resource guides</span>
                      </div>
                    </div>
                    <div className="pt-2">
                      <Button asChild className="bg-purple-600 hover:bg-purple-700">
                        <Link to="/libraries/create">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Library
                        </Link>
                      </Button>
                    </div>
                    <div className="p-3 bg-white rounded border border-purple-200">
                      <p className="text-sm font-medium mb-1 text-purple-900 flex items-center gap-1">
                        <Lightbulb className="w-4 h-4" />
                        Pro Tip
                      </p>
                      <p className="text-xs text-purple-800">
                        Libraries work best when you already have documents to add. Create some documents first in{' '}
                        <Link to="/my-documents" className="text-purple-600 underline hover:text-purple-700">
                          My Documents
                        </Link>
                        , then organize them into libraries.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sortedLibraries.map((library) => (
                    <LibraryCard key={library.id} library={library} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'discover' && (() => {
            const systemLibraries = sortedLibraries.filter(lib => lib.type === 'system');
            const publicLibraries = sortedLibraries.filter(lib => lib.type !== 'system');

            return (
              <div className="space-y-8">
                {/* System Libraries Section */}
                {systemLibraries.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Smart Views</h2>
                      <p className="text-sm text-gray-600">
                        Quick access to common document collections
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {systemLibraries.map((library) => (
                        <LibraryCard key={library.id} library={library} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Public Libraries Section */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Community Libraries</h2>
                    <p className="text-sm text-gray-600">
                      Explore libraries shared by other members
                    </p>
                  </div>
                  {publicLibraries.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No public libraries found</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {publicLibraries.map((library) => (
                        <LibraryCard key={library.id} library={library} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

function LibraryCard({ library }: { library: Library }) {
  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffInMs = now.getTime() - created.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}mo ago`;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <Link to={`/libraries/${library.id}`} className="block">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{library.icon || '📚'}</span>
              <div>
                <h3 className="font-semibold text-gray-900">{library.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {library.type === 'system' && 'System'}
                    {library.type === 'auto_generated' && (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Auto-Gen
                      </>
                    )}
                    {library.type === 'manual' && 'Manual'}
                  </Badge>
                  {!library.is_public && (
                    <Lock className="w-3 h-3 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
            <span className="text-lg font-semibold text-indigo-600">
              {library.document_count}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {library.description || 'No description'}
          </p>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              {library.type === 'manual' && library.folder_count !== undefined && library.folder_count > 0 && (
                <span className="flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />
                  {library.folder_count} folders
                </span>
              )}
              {library.type === 'auto_generated' && library.filter_rules && (
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Smart filter
                </span>
              )}
            </div>
            <span>Updated {getTimeAgo(library.updated_at)}</span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}