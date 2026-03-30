import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Presentation, Plus, Search } from 'lucide-react';
import ContainerCard from '@/app/components/shared/ContainerCard';
import { fetchAndEnrichLifecycle } from '@/lib/lifecycle-helpers';
import { PageHeader } from '@/app/components/shared/PageHeader';

interface Pitch {
  id: string;
  name: string;
  description: string;
  long_description: string | null;
  slug: string;
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  cover_image: string | null;
  tags: string[];
  created_by: string;
  admin_ids: string[];
  member_ids: string[];
  is_favorited?: boolean;
  created_at: string;
  lifecycle_state: string;
  like_count?: number;
  is_liked?: boolean;
}

export default function PitchesPage() {
  const { profile } = useAuth();
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [creators, setCreators] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked'>('newest');
  const [showMineOnly, setShowMineOnly] = useState(false);
  
  useEffect(() => {
    fetchPitches();
  }, []);

  const fetchPitches = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('pitches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const pitchesData = data || [];
      
      // Fetch favorites and likes in parallel
      const ids = pitchesData.map(p => p.id);
      const [favoritesRes, likesRes] = await Promise.all([
        supabase
          .from('content_favorites')
          .select('content_id')
          .eq('user_id', profile.id)
          .eq('content_type', 'pitch'),
        ids.length > 0
          ? supabase
              .from('content_likes')
              .select('content_id, user_id')
              .eq('content_type', 'pitch')
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
      
      // Enrich with lifecycle data
      const enrichedPitches = await fetchAndEnrichLifecycle('pitches', pitchesData);
      
      setPitches(enrichedPitches.map(pitch => ({
        ...pitch,
        is_favorited: favoritedIds.has(pitch.id),
        like_count: likeCountsMap[pitch.id] || 0,
        is_liked: likedByMeSet.has(pitch.id),
      })));
      
      // Fetch creator profiles
      const creatorIds = pitchesData.map(p => p.created_by).filter(Boolean);
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
      console.error('Error fetching pitches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteUpdate = (pitchId: string, isFavorited: boolean) => {
    setPitches(pitches.map(pitch =>
      pitch.id === pitchId ? { ...pitch, is_favorited: isFavorited } : pitch
    ));
  };

  const handleLikeUpdate = (pitchId: string, isLiked: boolean, newCount: number) => {
    setPitches(prev => prev.map(p =>
      p.id === pitchId ? { ...p, is_liked: isLiked, like_count: newCount } : p
    ));
  };

  if (!profile || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading pitches...</div>
      </div>
    );
  }

  const isAdmin = profile.role === 'super';
  
  const accessiblePitches = pitches.filter(pitch => {
    if (isAdmin) return true;
    if (pitch.visibility === 'public') return true;
    if (pitch.visibility === 'member' && pitch.member_ids.includes(profile.id)) return true;
    if (pitch.visibility === 'unlisted') return true;
    if (pitch.visibility === 'private' && pitch.member_ids.includes(profile.id)) return true;
    if (pitch.admin_ids.includes(profile.id)) return true;
    if (pitch.created_by === profile.id) return true;
    return false;
  });

  const filteredPitches = accessiblePitches.filter(pitch => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || (
      pitch.name.toLowerCase().includes(query) ||
      pitch.description?.toLowerCase().includes(query) ||
      (pitch.tags || []).some(t => t.toLowerCase().includes(query))
    );
    const matchesMine = !showMineOnly || (
      pitch.created_by === profile.id ||
      pitch.member_ids.includes(profile.id) ||
      pitch.admin_ids.includes(profile.id)
    );
    return matchesSearch && matchesMine;
  });

  const displayedPitches = [...filteredPitches].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'most-liked') return (b.like_count || 0) - (a.like_count || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Pitches' }]}
        icon={Presentation}
        iconBg="bg-pink-100"
        iconColor="text-pink-600"
        title="Pitches"
        description="Showcase your ideas and projects"
        actions={
          profile ? (
            <Button asChild>
              <Link to="/pitches/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Pitch
              </Link>
            </Button>
          ) : undefined
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
                placeholder="Search pitches by name, topic, or keyword..."
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

      {/* Pitches Grid */}
      {displayedPitches.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Presentation className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">
                {searchQuery || showMineOnly ? 'No pitches found matching your filters' : 'No pitches available yet'}
              </p>
              {profile && !searchQuery && !showMineOnly && (
                <Button asChild>
                  <Link to="/pitches/create">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Pitch
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedPitches.map((pitch) => {
            const creator = pitch.created_by ? creators[pitch.created_by] : null;
            return (
              <ContainerCard
                key={pitch.id}
                id={pitch.id}
                type="pitches"
                name={pitch.name}
                description={pitch.description}
                link={`/pitches/${pitch.slug}`}
                visibility={pitch.visibility}
                createdBy={creator}
                tags={pitch.tags}
                isFavorited={pitch.is_favorited}
                lifecycleState={pitch.lifecycle_state}
                currentUserId={profile.id}
                likeCount={pitch.like_count}
                isLiked={pitch.is_liked}
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