import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Separator } from '@/app/components/ui/separator';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Search, UserPlus, Lock, Users, ExternalLink, ArrowUpCircle, Sparkles, Table as TableIcon, TrendingUp, Video, Presentation, Hammer, MessageSquare, Users2, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { CONTAINER_TYPES, ContainerType } from '@/lib/container-types';
import { DISCOVERABLE_CONTAINER_TYPES } from '@/lib/visibility-access';
import { PageHeader } from '@/app/components/shared/PageHeader';
import ContainerCard from '@/app/components/shared/ContainerCard';
import PublicHeader from '@/app/components/PublicHeader';

interface Container {
  id: string;
  name: string;
  description: string;
  image?: string | null;
  cover_image?: string | null;
  access_type?: 'open' | 'request' | 'invite';
  visibility?: 'public' | 'member' | 'private';
  member_ids: string[];
  admin_ids: string[];
  participant_ids?: string[];
  tags?: string[];
  is_favorited?: boolean; // Changed from favorites array
  type: ContainerType;
  created_at?: string;
  slug?: string;
  like_count?: number;
  is_liked?: boolean;
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningContainerId, setJoiningContainerId] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [excludeFavorites, setExcludeFavorites] = useState(true); // Default to true
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked'>('newest');
  const { profile, userPermissions } = useAuth();

  // Available container types for filtering — driven by the canonical list in visibility-access.ts
  const filterableTypes = DISCOVERABLE_CONTAINER_TYPES;

  useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    try {
      setLoading(true);
      
      // For guest users (no profile), only show public circles
      if (!profile) {
        const { data, error } = await supabase
          .from('circles')
          .select('*')
          .eq('access_type', 'open')
          .order('name');

        if (error) {
          console.error('Error fetching public circles:', error);
          toast.error('Failed to load public content');
          setContainers([]);
          setLoading(false);
          return;
        }

        const publicCircles = (data || []).map(item => ({
          ...item,
          type: 'circles' as ContainerType,
          member_ids: item.member_ids || [],
          admin_ids: item.admin_ids || [],
          is_favorited: false, // Guests can't favorite
        }));

        setContainers(publicCircles);
        
        // Initialize selected types for guest users
        if (selectedTypes.size === 0 && publicCircles.length > 0) {
          setSelectedTypes(new Set(['circles']));
        }
        
        setLoading(false);
        return;
      }
      
      // For authenticated users without permissions, also show public circles
      if (!userPermissions) {
        const { data, error } = await supabase
          .from('circles')
          .select('*')
          .eq('access_type', 'open')
          .order('name');

        if (error) {
          console.error('Error fetching public circles:', error);
          setContainers([]);
          setLoading(false);
          return;
        }

        const publicCircles = (data || []).map(item => ({
          ...item,
          type: 'circles' as ContainerType,
          member_ids: item.member_ids || [],
          admin_ids: item.admin_ids || [],
          is_favorited: false, // Users without permissions can't favorite
        }));

        setContainers(publicCircles);
        
        // Initialize selected types
        if (selectedTypes.size === 0 && publicCircles.length > 0) {
          setSelectedTypes(new Set(['circles']));
        }
        
        setLoading(false);
        return;
      }
      
      // Get container types user has access to
      const accessibleTypes = userPermissions.visible_containers
        .filter(c => filterableTypes.includes(c.type_code as any))
        .map(c => c.type_code);

      // If user has no accessible types, fall back to showing public circles
      if (accessibleTypes.length === 0) {
        const { data, error } = await supabase
          .from('circles')
          .select('*')
          .eq('access_type', 'open')
          .order('name');

        if (error) {
          console.error('Error fetching public circles:', error);
          setContainers([]);
          setLoading(false);
          return;
        }

        const publicCircles = (data || []).map(item => ({
          ...item,
          type: 'circles' as ContainerType,
          member_ids: item.member_ids || [],
          admin_ids: item.admin_ids || [],
          is_favorited: false, // Users without accessible types can't favorite
        }));

        setContainers(publicCircles);
        
        // Initialize selected types
        if (selectedTypes.size === 0 && publicCircles.length > 0) {
          setSelectedTypes(new Set(['circles']));
        }
        
        setLoading(false);
        return;
      }

      // Fetch containers from all accessible types in parallel
      const containerPromises = accessibleTypes.map(async (type) => {
        try {
          const { data, error } = await supabase
            .from(type)
            .select('*')
            .order('name');

          if (error) {
            console.warn(`Error fetching ${type}:`, error);
            return [];
          }

          return (data || []).map(item => ({
            ...item,
            type: type as ContainerType,
            // Normalize member/participant fields
            member_ids: item.member_ids || item.participant_ids || [],
            admin_ids: item.admin_ids || [],
          }));
        } catch (err) {
          console.warn(`Failed to fetch ${type}:`, err);
          return [];
        }
      });

      const results = await Promise.all(containerPromises);
      const allContainers = results.flat();
      
      // Fetch favorites for the current user across all content types
      // Container types are plural (e.g. 'circles') but content_favorites stores singular (e.g. 'circle')
      const pluralToSingular = (t: string) => t.endsWith('s') ? t.slice(0, -1) : t;
      const favoritePromises = accessibleTypes.map(async (type) => {
        const { data } = await supabase
          .from('content_favorites')
          .select('content_id')
          .eq('user_id', profile.id)
          .eq('content_type', pluralToSingular(type));
        
        return { type, ids: new Set(data?.map(f => f.content_id) || []) };
      });
      
      const favoritesResults = await Promise.all(favoritePromises);
      const favoritesMap = new Map(favoritesResults.map(r => [r.type, r.ids]));
      
      // Add is_favorited flag to all containers
      const containersWithFavorites = allContainers.map(container => ({
        ...container,
        is_favorited: favoritesMap.get(container.type)?.has(container.id) || false
      }));

      // Fetch like counts for all accessible types in parallel
      const TABLE_TO_CONTENT_TYPE: Record<string, string> = {
        circles: 'circle', tables: 'table', elevators: 'elevator',
        meetings: 'meeting', meetups: 'meetup', pitches: 'pitch',
        builds: 'build', standups: 'standup', moments: 'moment',
      };

      const likePromises = accessibleTypes.map(async (type) => {
        const contentType = TABLE_TO_CONTENT_TYPE[type] || type.slice(0, -1);
        const typeIds = allContainers.filter(c => c.type === type).map(c => c.id);
        if (typeIds.length === 0) return { type, data: [] };
        const { data } = await supabase
          .from('content_likes')
          .select('content_id, user_id')
          .eq('content_type', contentType)
          .in('content_id', typeIds);
        return { type, data: data || [] };
      });

      const likesResults = await Promise.all(likePromises);
      const likeCountsMap: Record<string, number> = {};
      const likedByMeSet = new Set<string>();
      likesResults.forEach(({ data }) => {
        (data as { content_id: string; user_id: string }[]).forEach(like => {
          likeCountsMap[like.content_id] = (likeCountsMap[like.content_id] || 0) + 1;
          if (like.user_id === profile.id) likedByMeSet.add(like.content_id);
        });
      });

      const containersWithEngagement = containersWithFavorites.map(container => ({
        ...container,
        like_count: likeCountsMap[container.id] || 0,
        is_liked: likedByMeSet.has(container.id),
      }));
      
      setContainers(containersWithEngagement);
      
      // Initialize selected types with all types that have containers (only if not already set)
      if (selectedTypes.size === 0) {
        const typesWithData = new Set<string>();
        allContainers.forEach(c => typesWithData.add(c.type));
        setSelectedTypes(typesWithData);
      }
    } catch (error) {
      console.error('Error fetching containers:', error);
      toast.error('Failed to load containers');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinContainer = async (container: Container) => {
    if (!profile) return;

    // Check access restrictions
    if (container.access_type === 'invite') {
      toast.error('This is an invite-only container. Contact an admin to get invited.');
      return;
    }

    if (container.access_type === 'request') {
      toast.success('Join request sent! Waiting for admin approval.');
      // In a full implementation, this would create a join request in the database
      return;
    }

    if (container.visibility === 'private') {
      toast.error('This container is private. Contact an admin for access.');
      return;
    }

    try {
      setJoiningContainerId(container.id);
      
      // Add user to container
      const updatedMemberIds = [...container.member_ids, profile.id];
      const { error } = await supabase
        .from(container.type)
        .update({ member_ids: updatedMemberIds })
        .eq('id', container.id);

      if (error) throw error;

      // Update local state
      setContainers(containers.map(c => 
        c.id === container.id ? { ...c, member_ids: updatedMemberIds } : c
      ));

      toast.success(`You've joined ${container.name}!`);
      
    } catch (error) {
      console.error('Error joining container:', error);
      toast.error('Failed to join container');
    } finally {
      setJoiningContainerId(null);
    }
  };

  const toggleType = (type: string) => {
    const newSelected = new Set(selectedTypes);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    setSelectedTypes(newSelected);
  };

  const toggleAll = () => {
    const typesWithData = new Set<string>();
    containers.forEach(c => typesWithData.add(c.type));
    
    if (selectedTypes.size === typesWithData.size) {
      setSelectedTypes(new Set());
    } else {
      setSelectedTypes(typesWithData);
    }
  };

  // Guest users (not logged in) - show limited guest view
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <PublicHeader />
        
        <div className="max-w-7xl mx-auto space-y-6 p-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl">Explore Public Communities</h1>
            </div>
            <p className="text-gray-600">
              Browse public circles. Sign up to join and participate!
            </p>
          </div>

          {loading ? (
            <Card className="p-12 text-center">
              <div className="text-gray-500">Loading...</div>
            </Card>
          ) : containers.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <Users className="w-16 h-16 text-gray-400" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">No Public Communities Available</h3>
                  <p className="text-gray-600 mb-4">
                    There are no public communities at this time. Check back later or create an account to get started!
                  </p>
                  <div className="flex items-center gap-3 justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/')}
                    >
                      Back to Home
                    </Button>
                    <Button onClick={() => navigate('/register')} className="bg-indigo-600 hover:bg-indigo-700">
                      Create an Account
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{containers.length}</h2>
                      <p className="text-gray-600 mt-1">Public Communities</p>
                    </div>
                    <Button onClick={() => navigate('/register')} className="bg-indigo-600 hover:bg-indigo-700">
                      Sign Up to Join
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {containers.map((container) => (
                  <Card key={container.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <Users className="w-12 h-12 text-indigo-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold mb-1 truncate">{container.name}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {container.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {container.member_ids?.length || 0} members
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Public
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-indigo-50 border-indigo-200">
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-700 mb-4">
                    Want to join these communities and connect with other members?
                  </p>
                  <Button onClick={() => navigate('/register')} size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                    Create Free Account
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    );
  }

  // Get user's class number for upgrade messaging
  const userClass = (profile as any).user_class || 1;
  
  // Check if user truly has no access (no permissions AND no containers shown)
  const hasNoAccess = !userPermissions && containers.length === 0;

  // Get accessible types for filter buttons
  const accessibleTypes = userPermissions?.visible_containers
    .filter(c => filterableTypes.includes(c.type_code as any))
    .map(c => c.type_code) || [];

  // Filter containers
  let displayedContainers = containers;

  // Apply favorites filter if enabled
  if (excludeFavorites) {
    displayedContainers = displayedContainers.filter(container => 
      !container.is_favorited
    );
  }

  // Apply search filter
  displayedContainers = displayedContainers.filter((container) => {
    const query = searchQuery.toLowerCase();
    return (
      container.name.toLowerCase().includes(query) ||
      container.description?.toLowerCase().includes(query) ||
      container.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  // Apply sort within each group (items are already partitioned by type below)
  const sortItems = (items: Container[]) => [...items].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    if (sortBy === 'most-liked') return (b.like_count || 0) - (a.like_count || 0);
    // newest (default)
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  // Container type configuration
  const containerTypes = [
    {
      type: 'circles',
      name: 'Circles',
      icon: Users,
      color: 'indigo',
      path: (item: any) => `/circles/${item.id}`,
    },
    {
      type: 'tables',
      name: 'Tables',
      icon: TableIcon,
      color: 'blue',
      path: (item: any) => `/tables/${item.slug || item.id}`,
    },
    {
      type: 'elevators',
      name: 'Elevators',
      icon: TrendingUp,
      color: 'green',
      path: (item: any) => `/elevators/${item.slug || item.id}`,
    },
    {
      type: 'meetings',
      name: 'Meetings',
      icon: Video,
      color: 'purple',
      path: (item: any) => `/meetings/${item.slug || item.id}`,
    },
    {
      type: 'pitches',
      name: 'Pitches',
      icon: Presentation,
      color: 'orange',
      path: (item: any) => `/pitches/${item.slug || item.id}`,
    },
    {
      type: 'builds',
      name: 'Builds',
      icon: Hammer,
      color: 'yellow',
      path: (item: any) => `/builds/${item.slug || item.id}`,
    },
    {
      type: 'standups',
      name: 'Standups',
      icon: MessageSquare,
      color: 'pink',
      path: (item: any) => `/standups/${item.slug || item.id}`,
    },
    {
      type: 'meetups',
      name: 'Meetups',
      icon: Users2,
      color: 'cyan',
      path: (item: any) => `/meetups/${item.slug || item.id}`,
    },
    {
      type: 'moments',
      name: 'Moments',
      icon: Sparkles,
      color: 'indigo',
      path: (item: any) => `/moments/${item.id}`,
    },
  ];

  // Group containers by type
  const containersByType = containerTypes.map(ct => ({
    ...ct,
    items: sortItems(displayedContainers.filter(c => c.type === ct.type && selectedTypes.has(ct.type)))
  }));

  // Filter to only show types with items
  const typesWithContainers = containersByType.filter(ct => ct.items.length > 0);

  // Get count by type from all containers
  const getTypeCount = (type: string) => {
    return displayedContainers.filter(c => c.type === type).length;
  };

  const totalContainers = displayedContainers.length;
  const totalFiltered = typesWithContainers.reduce((sum, ct) => sum + ct.items.length, 0);

  const getAccessLabel = (container: Container) => {
    if (container.access_type) {
      switch (container.access_type) {
        case 'open':
          return { label: 'Open', color: 'bg-green-100 text-green-700' };
        case 'request':
          return { label: 'Request', color: 'bg-yellow-100 text-yellow-700' };
        case 'invite':
          return { label: 'Invite Only', color: 'bg-gray-100 text-gray-700' };
      }
    }
    
    if (container.visibility) {
      switch (container.visibility) {
        case 'public':
          return { label: 'Public', color: 'bg-green-100 text-green-700' };
        case 'member':
          return { label: 'Members Only', color: 'bg-blue-100 text-blue-700' };
        case 'private':
          return { label: 'Private', color: 'bg-gray-100 text-gray-700' };
      }
    }

    return { label: 'Open', color: 'bg-green-100 text-green-700' };
  };

  const getAccessLevelBadge = (accessLevel?: string) => {
    if (!accessLevel || accessLevel === 'public' || accessLevel === 'open') {
      return <Badge variant="secondary" className="text-xs">Public</Badge>;
    }
    if (accessLevel === 'member' || accessLevel === 'members-only') {
      return <Badge variant="default" className="text-xs bg-indigo-600">Member</Badge>;
    }
    if (accessLevel === 'premium') {
      return <Badge variant="default" className="text-xs bg-yellow-600">Premium</Badge>;
    }
    if (accessLevel === 'private') {
      return <Badge variant="default" className="text-xs bg-gray-600">Private</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Explore', href: '/explore' }]}
        icon={Sparkles}
        iconBg="bg-indigo-100"
        iconColor="text-indigo-600"
        title="Explore Containers"
        description="Discover and join containers available for your membership level"
      />

      {hasNoAccess ? (
        // Upgrade message when no containers are accessible
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full p-6">
              <ArrowUpCircle className="w-16 h-16 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Upgrade to Explore Containers
              </h3>
              <p className="text-gray-600 mb-6">
                Your current membership level (Class {userClass}) doesn't have access to explore containers. 
                Upgrade your membership to discover and join circles, tables, and other collaboration spaces.
              </p>
              <Button 
                onClick={() => navigate('/my-payments')}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                Upgrade Membership
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search containers by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Sort:</span>
            <Button variant={sortBy === 'newest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('newest')}>Newest</Button>
            <Button variant={sortBy === 'oldest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('oldest')}>Oldest</Button>
            <Button variant={sortBy === 'most-liked' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-liked')}>Most Liked</Button>
          </div>

          {/* Summary Card with Filters */}
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{totalContainers}</h2>
                  <p className="text-gray-600 mt-1">Available Containers</p>
                </div>
                <div className="text-right text-sm text-gray-600 space-y-1">
                  {containerTypes.filter(ct => getTypeCount(ct.type) > 0).map(ct => (
                    <div key={ct.type}>{getTypeCount(ct.type)} {ct.name}</div>
                  ))}
                </div>
              </div>

              {/* Exclude Favorites Checkbox */}
              <div className="pt-4 border-t border-indigo-300">
                <label className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border-2 border-indigo-300 cursor-pointer hover:border-indigo-400 transition-all">
                  <Checkbox
                    checked={excludeFavorites}
                    onCheckedChange={(checked) => setExcludeFavorites(checked as boolean)}
                  />
                  <span className="text-sm font-medium text-gray-900">
                    Exclude from My Favorites
                  </span>
                  <span className="text-xs text-gray-500">
                    (Only show containers you haven't favorited)
                  </span>
                </label>
              </div>

              {/* Filter by Type Checkboxes */}
              {containerTypes.filter(ct => getTypeCount(ct.type) > 0).length > 0 && (
                <div className="pt-4 border-t border-indigo-300">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">Filter by type:</p>
                    <button
                      onClick={toggleAll}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {selectedTypes.size === containerTypes.filter(ct => getTypeCount(ct.type) > 0).length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {containerTypes.filter(ct => getTypeCount(ct.type) > 0).map((containerType) => {
                      const Icon = containerType.icon;
                      const isChecked = selectedTypes.has(containerType.type);
                      const count = getTypeCount(containerType.type);
                      
                      return (
                        <label
                          key={containerType.type}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                            isChecked 
                              ? 'bg-white border-indigo-500 shadow-sm' 
                              : 'bg-white/50 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleType(containerType.type)}
                          />
                          <Icon className={`w-4 h-4 ${isChecked ? 'text-indigo-600' : 'text-gray-500'}`} />
                          <span className={`text-sm font-medium ${isChecked ? 'text-gray-900' : 'text-gray-600'}`}>
                            {containerType.name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {count}
                          </Badge>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading ? (
            <Card className="p-12 text-center">
              <div className="text-gray-500">Loading containers...</div>
            </Card>
          ) : totalFiltered === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <Sparkles className="w-16 h-16 text-gray-400" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">No Containers Found</h3>
                  <p className="text-gray-600">
                    {totalContainers === 0 
                      ? excludeFavorites
                        ? "You've already favorited all available containers!"
                        : "No containers are available at this time."
                      : "No containers match your current filters. Try adjusting your search or filters."}
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            /* Container Type Sections */
            typesWithContainers.map((containerType) => {
              const Icon = containerType.icon;

              return (
                <div key={containerType.type}>
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className={`w-6 h-6 text-${containerType.color}-600`} />
                    <h2 className="text-2xl font-semibold">{containerType.name}</h2>
                    <Badge variant="secondary">{containerType.items.length}</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {containerType.items.map((item: Container) => {
                      const isJoining = joiningContainerId === item.id;
                      const isMember = item.member_ids.includes(profile.id);
                      const canJoin = item.access_type !== 'invite' && item.visibility !== 'private' && !isMember;
                      const accessInfo = getAccessLabel(item);

                      // Handler to update favorites when changed
                      const handleFavoriteUpdate = (id: string, isFavorited: boolean) => {
                        setContainers(containers.map(c => 
                          c.id === id ? { ...c, is_favorited: isFavorited } : c
                        ));
                      };

                      return (
                        <ContainerCard
                          key={item.id}
                          id={item.id}
                          type={item.type}
                          name={item.name}
                          description={item.description || ''}
                          link={containerType.path(item)}
                          visibility={item.access_type || item.visibility || 'public'}
                          memberCount={item.member_ids?.length || 0}
                          tags={item.tags || []}
                          isFavorited={item.is_favorited}
                          isMember={isMember}
                          currentUserId={profile.id}
                          likeCount={item.like_count}
                          isLiked={item.is_liked}
                          onLikeUpdate={(id, isLiked, newCount) => {
                            setContainers(containers.map(c =>
                              c.id === id ? { ...c, is_liked: isLiked, like_count: newCount } : c
                            ));
                          }}
                          onJoin={canJoin ? () => handleJoinContainer(item) : undefined}
                          joinDisabled={isJoining}
                          joinLabel={item.access_type === 'request' ? 'Request' : 'Join'}
                          showJoinButton={true}
                          onFavoriteUpdate={handleFavoriteUpdate}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}