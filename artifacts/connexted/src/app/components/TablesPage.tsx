import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Table as TableIcon } from 'lucide-react';
import { toast } from 'sonner';
import ContainerCard from '@/app/components/shared/ContainerCard';
import { CONTAINER_TYPES } from '@/lib/container-types';
import { filterByVisibility } from '@/lib/visibility-access';
import { fetchAndEnrichLifecycle } from '@/lib/lifecycle-helpers';
import { PageHeader } from '@/app/components/shared/PageHeader';

export default function TablesPage() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [tables, setTables] = useState<any[]>([]);
  const [creators, setCreators] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-members' | 'most-liked'>('newest');
  const [showMineOnly, setShowMineOnly] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchTables();
    }
  }, [profile]);

  const fetchTables = async () => {
    try {
      // Fetch tables data
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const tablesData = data || [];

      // Fetch favorites and likes in parallel
      const ids = tablesData.map(t => t.id);
      const [favoritesRes, likesRes] = await Promise.all([
        supabase
          .from('content_favorites')
          .select('content_id')
          .eq('user_id', profile.id)
          .eq('content_type', 'table'),
        ids.length > 0
          ? supabase
              .from('content_likes')
              .select('content_id, user_id')
              .eq('content_type', 'table')
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
      
      // Fetch lifecycle states for all tables
      const enrichedTables = await fetchAndEnrichLifecycle('tables', tablesData);
      
      setTables(enrichedTables.map(table => ({
        ...table,
        is_favorited: favoritedIds.has(table.id),
        like_count: likeCountsMap[table.id] || 0,
        is_liked: likedByMeSet.has(table.id),
      })));
      
      // Fetch creator profiles
      const creatorIds = tablesData
        .map(t => t.created_by)
        .filter(Boolean);
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('users')
          .select('id, name')
          .in('id', creatorIds);
        
        if (profiles) {
          const creatorsMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
          setCreators(creatorsMap);
        }
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading tables...</p>
      </div>
    );
  }

  const filteredTables = filterByVisibility(tables, profile, 'tables').filter((table) => {
    const query = searchQuery.toLowerCase();
    const tableTags = table.tags || [];
    const matchesSearch = (
      table.name.toLowerCase().includes(query) ||
      table.description?.toLowerCase().includes(query) ||
      tableTags.some((tag: string) => tag.toLowerCase().includes(query))
    );
    const matchesMine = !showMineOnly || (
      table.created_by === profile.id ||
      (table.member_ids || []).includes(profile.id) ||
      (table.admin_ids || []).includes(profile.id)
    );
    return matchesSearch && matchesMine;
  });

  const displayedTables = [...filteredTables].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'most-members') return (b.member_ids?.length || 0) - (a.member_ids?.length || 0);
    if (sortBy === 'most-liked') return (b.like_count || 0) - (a.like_count || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleJoinTable = async (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    try {
      const updatedMemberIds = [...(table.member_ids || []), profile.id];
      
      const { error } = await supabase
        .from('tables')
        .update({ member_ids: updatedMemberIds })
        .eq('id', tableId);

      if (error) throw error;

      // Update local state
      setTables(tables.map(t => 
        t.id === tableId 
          ? { ...t, member_ids: updatedMemberIds }
          : t
      ));

      toast.success(`You've joined ${table.name}!`);
    } catch (error) {
      console.error('Error joining table:', error);
      toast.error('Failed to join table');
    }
  };

  const handleLeaveTable = async (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    try {
      const updatedMemberIds = (table.member_ids || []).filter((id: string) => id !== profile.id);
      
      const { error } = await supabase
        .from('tables')
        .update({ member_ids: updatedMemberIds })
        .eq('id', tableId);

      if (error) throw error;

      // Update local state
      setTables(tables.map(t => 
        t.id === tableId 
          ? { ...t, member_ids: updatedMemberIds }
          : t
      ));

      toast.success(`You've left ${table.name}`);
    } catch (error) {
      console.error('Error leaving table:', error);
      toast.error('Failed to leave table');
    }
  };

  const isMember = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    return table?.member_ids?.includes(profile.id);
  };

  const handleFavoriteUpdate = (tableId: string, isFavorited: boolean) => {
    setTables(tables.map(table =>
      table.id === tableId ? { ...table, is_favorited: isFavorited } : table
    ));
  };

  const handleLikeUpdate = (tableId: string, isLiked: boolean, newCount: number) => {
    setTables(prev => prev.map(t =>
      t.id === tableId ? { ...t, is_liked: isLiked, like_count: newCount } : t
    ));
  };

  const config = CONTAINER_TYPES.tables;
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Tables' }]}
        icon={config.icon}
        iconBg={config.color}
        iconColor={config.iconColor}
        title="Discover Tables"
        description="Find and join lightweight participation spaces organized by topic"
        actions={
          profile ? (
            <Button asChild>
              <Link to="/tables/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Table
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
                placeholder="Search tables by name, topic, or keyword..."
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
            <Button variant={sortBy === 'most-members' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-members')}>Most Members</Button>
            <Button variant={sortBy === 'most-liked' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-liked')}>Most Liked</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tables Grid */}
      {displayedTables.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <TableIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">
                {searchQuery || showMineOnly ? 'No tables found matching your filters' : 'No tables available yet'}
              </p>
              {profile && !searchQuery && !showMineOnly && (
                <Button asChild>
                  <Link to="/tables/create">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Table
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedTables.map((table) => {
            const isUserMember = isMember(table.id);
            const creator = table.created_by ? creators[table.created_by] : null;
            
            return (
              <ContainerCard
                key={table.id}
                id={table.id}
                type="tables"
                name={table.name}
                description={table.description}
                link={`/tables/${table.slug}`}
                visibility={table.visibility}
                memberCount={table.member_ids?.length || 0}
                createdBy={creator}
                tags={table.tags}
                isFavorited={table.is_favorited}
                lifecycleState={table.lifecycle_state}
                isMember={isUserMember}
                currentUserId={profile.id}
                likeCount={table.like_count}
                isLiked={table.is_liked}
                onLikeUpdate={handleLikeUpdate}
                onJoin={() => handleJoinTable(table.id)}
                onLeave={() => handleLeaveTable(table.id)}
                onFavoriteUpdate={handleFavoriteUpdate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}