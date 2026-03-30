import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Hammer, Plus, Search } from 'lucide-react';
import ContainerCard from '@/app/components/shared/ContainerCard';
import { fetchAndEnrichLifecycle } from '@/lib/lifecycle-helpers';
import { PageHeader } from '@/app/components/shared/PageHeader';

interface Build {
  id: string;
  name: string;
  description: string;
  slug: string;
  visibility: 'public' | 'member' | 'private';
  cover_image: string | null;
  tags: string[];
  created_by: string;
  admin_ids: string[];
  member_ids: string[];
  document_ids: string[];
  review_ids: string[];
  is_favorited?: boolean;
  created_at: string;
  lifecycle_state?: string;
  like_count?: number;
  is_liked?: boolean;
}

export default function BuildsPage() {
  const { profile } = useAuth();
  const [builds, setBuilds] = useState<Build[]>([]);
  const [creators, setCreators] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked'>('newest');
  const [showMineOnly, setShowMineOnly] = useState(false);
  
  useEffect(() => {
    fetchBuilds();
  }, []);

  const fetchBuilds = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('builds')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const buildsData = data || [];
      
      // Enrich with lifecycle data
      const enrichedBuilds = await fetchAndEnrichLifecycle('builds', buildsData);
      
      // Fetch favorites and likes in parallel
      const ids = buildsData.map(b => b.id);
      const [favoritesRes, likesRes] = await Promise.all([
        supabase
          .from('content_favorites')
          .select('content_id')
          .eq('user_id', profile.id)
          .eq('content_type', 'build'),
        ids.length > 0
          ? supabase
              .from('content_likes')
              .select('content_id, user_id')
              .eq('content_type', 'build')
              .in('content_id', ids)
          : Promise.resolve({ data: [] }),
      ]);
      
      const favoritedIds = new Set(favoritesRes.data?.map(f => f.content_id) || []);

      const likeCountsMap: Record<string, number> = {};
      const likedByMeSet = new Set<string>();
      (likesRes.data || []).forEach((like: { content_id: string; user_id: string }) => {
        likeCountsMap[like.content_id] = (likeCountsMap[like.content_id] || 0) + 1;
        if (like.user_id === profile.id) likedByMeSet.add(like.content_id);
      });
      
      setBuilds(enrichedBuilds.map(build => ({
        ...build,
        is_favorited: favoritedIds.has(build.id),
        like_count: likeCountsMap[build.id] || 0,
        is_liked: likedByMeSet.has(build.id),
      })));
      
      // Fetch creator profiles
      const creatorIds = buildsData.map(b => b.created_by).filter(Boolean);
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('users')
          .select('id, name')
          .in('id', creatorIds);
        if (profiles) {
          setCreators(profiles.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, any>));
        }
      }
    } catch (error) {
      console.error('Error fetching builds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteUpdate = (buildId: string, isFavorited: boolean) => {
    setBuilds(builds.map(b =>
      b.id === buildId ? { ...b, is_favorited: isFavorited } : b
    ));
  };

  const handleLikeUpdate = (buildId: string, isLiked: boolean, newCount: number) => {
    setBuilds(prev => prev.map(b =>
      b.id === buildId ? { ...b, is_liked: isLiked, like_count: newCount } : b
    ));
  };

  if (!profile || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading builds...</div>
      </div>
    );
  }

  const isAdmin = profile.role === 'super';
  
  const accessibleBuilds = builds.filter(build => {
    if (isAdmin) return true;
    if (build.visibility === 'public') return true;
    if (build.visibility === 'member' && build.member_ids.includes(profile.id)) return true;
    if (build.visibility === 'private' && build.member_ids.includes(profile.id)) return true;
    if (build.admin_ids.includes(profile.id)) return true;
    return false;
  });

  const filteredBuilds = accessibleBuilds.filter(build => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || (
      build.name.toLowerCase().includes(query) ||
      build.description?.toLowerCase().includes(query) ||
      (build.tags || []).some(t => t.toLowerCase().includes(query))
    );
    const matchesMine = !showMineOnly || (
      build.created_by === profile.id ||
      build.member_ids.includes(profile.id) ||
      build.admin_ids.includes(profile.id)
    );
    return matchesSearch && matchesMine;
  });

  const displayedBuilds = [...filteredBuilds].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'most-liked') return (b.like_count || 0) - (a.like_count || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Builds' }]}
        icon={Hammer}
        iconBg="bg-orange-100"
        iconColor="text-orange-600"
        title="Builds"
        description="Document collections for projects, initiatives, and collaborative work"
        actions={
          <Button asChild>
            <Link to="/builds/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Build
            </Link>
          </Button>
        }
      />

      {/* Search & Controls */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search builds by name, topic, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showMineOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowMineOnly(!showMineOnly)}
              className="shrink-0"
            >
              Mine
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Sort:</span>
            <Button variant={sortBy === 'newest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('newest')}>Newest</Button>
            <Button variant={sortBy === 'oldest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('oldest')}>Oldest</Button>
            <Button variant={sortBy === 'most-liked' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-liked')}>Most Liked</Button>
          </div>
        </CardContent>
      </Card>

      {/* Builds Grid */}
      {displayedBuilds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Hammer className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">
              {searchQuery || showMineOnly ? 'No builds found matching your filters' : 'No builds available yet'}
            </p>
            {!searchQuery && !showMineOnly && (
              <Button asChild>
                <Link to="/builds/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Build
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedBuilds.map((build) => {
            const creator = build.created_by ? creators[build.created_by] : null;
            return (
              <ContainerCard
                key={build.id}
                id={build.id}
                type="builds"
                name={build.name}
                description={build.description}
                link={`/builds/${build.slug}`}
                visibility={build.visibility}
                createdBy={creator}
                tags={build.tags}
                isFavorited={build.is_favorited}
                lifecycleState={build.lifecycle_state}
                documentCount={build.document_ids.length}
                reviewCount={build.review_ids?.length || 0}
                currentUserId={profile.id}
                likeCount={build.like_count}
                isLiked={build.is_liked}
                onLikeUpdate={handleLikeUpdate}
                onFavoriteUpdate={handleFavoriteUpdate}
                showJoinButton={false}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}