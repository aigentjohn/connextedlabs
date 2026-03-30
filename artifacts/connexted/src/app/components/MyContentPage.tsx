import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { Checkbox } from '@/app/components/ui/checkbox';
import { 
  Users,
  Table as TableIcon,
  TrendingUp,
  Video,
  Presentation,
  Hammer,
  MessageSquare,
  Users2,
  ExternalLink,
  Lock,
  Star,
  Calendar,
  CalendarClock,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import FavoriteButton from '@/app/components/shared/FavoriteButton';
import ContainerCard from '@/app/components/shared/ContainerCard';
import { ContainerType } from '@/lib/container-types';

export default function MyContentPage() {
  const { profile } = useAuth();
  const [circles, setCircles] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [elevators, setElevators] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [pitches, setPitches] = useState<any[]>([]);
  const [builds, setBuilds] = useState<any[]>([]);
  const [standups, setStandups] = useState<any[]>([]);
  const [meetups, setMeetups] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (profile) {
      fetchContent();
    }
  }, [profile]);

  const fetchContent = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Fetch all favorites from content_favorites table for current user
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('content_favorites')
        .select('content_id, content_type')
        .eq('user_id', profile.id);

      if (favoritesError) throw favoritesError;

      // Group favorite IDs by content type
      const favoritesByType = (favoritesData || []).reduce((acc, fav) => {
        if (!acc[fav.content_type]) acc[fav.content_type] = [];
        acc[fav.content_type].push(fav.content_id);
        return acc;
      }, {} as Record<string, string[]>);

      // Fetch all container types where user has favorited them
      const fetchContainerType = async (type: string, ids: string[]) => {
        if (!ids || ids.length === 0) return [];
        const { data } = await supabase
          .from(type)
          .select('*')
          .in('id', ids);
        return (data || []).map(item => ({ ...item, is_favorited: true }));
      };

      const [
        circlesData,
        tablesData,
        elevatorsData,
        meetingsData,
        pitchesData,
        buildsData,
        standupsData,
        meetupsData,
        sprintsData,
      ] = await Promise.all([
        fetchContainerType('circles', favoritesByType['circles'] || []),
        fetchContainerType('tables', favoritesByType['tables'] || []),
        fetchContainerType('elevators', favoritesByType['elevators'] || []),
        fetchContainerType('meetings', favoritesByType['meetings'] || []),
        fetchContainerType('pitches', favoritesByType['pitches'] || []),
        fetchContainerType('builds', favoritesByType['builds'] || []),
        fetchContainerType('standups', favoritesByType['standups'] || []),
        fetchContainerType('meetups', favoritesByType['meetups'] || []),
        fetchContainerType('sprints', favoritesByType['sprints'] || []),
      ]);

      setCircles(circlesData);
      setTables(tablesData);
      setElevators(elevatorsData);
      setMeetings(meetingsData);
      setPitches(pitchesData);
      setBuilds(buildsData);
      setStandups(standupsData);
      setMeetups(meetupsData);
      setSprints(sprintsData);
      
      // Initialize selected types with all types that have favorites (only if not already set)
      if (selectedTypes.size === 0) {
        const typesWithData = [];
        if (circlesData && circlesData.length > 0) typesWithData.push('circles');
        if (tablesData && tablesData.length > 0) typesWithData.push('tables');
        if (elevatorsData && elevatorsData.length > 0) typesWithData.push('elevators');
        if (meetingsData && meetingsData.length > 0) typesWithData.push('meetings');
        if (pitchesData && pitchesData.length > 0) typesWithData.push('pitches');
        if (buildsData && buildsData.length > 0) typesWithData.push('builds');
        if (standupsData && standupsData.length > 0) typesWithData.push('standups');
        if (meetupsData && meetupsData.length > 0) typesWithData.push('meetups');
        if (sprintsData && sprintsData.length > 0) typesWithData.push('sprints');
        
        if (typesWithData.length > 0) {
          setSelectedTypes(new Set(typesWithData));
        }
      }
    } catch (error) {
      console.error('Error fetching favorited content:', error);
      toast.error('Failed to load favorited content');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading content...</p>
      </div>
    );
  }

  const totalContent = circles.length + tables.length + elevators.length + 
                       meetings.length + pitches.length + builds.length + 
                       standups.length + meetups.length + sprints.length;

  // Container type configuration
  const containerTypes = [
    {
      type: 'circles' as ContainerType,
      name: 'Circles',
      icon: Users,
      items: circles,
      color: 'indigo',
      path: (item: any) => `/circles/${item.id}`,
    },
    {
      type: 'tables' as ContainerType,
      name: 'Tables',
      icon: TableIcon,
      items: tables,
      color: 'blue',
      path: (item: any) => `/tables/${item.slug}`,
    },
    {
      type: 'elevators' as ContainerType,
      name: 'Elevators',
      icon: TrendingUp,
      items: elevators,
      color: 'green',
      path: (item: any) => `/elevators/${item.slug}`,
    },
    {
      type: 'meetings' as ContainerType,
      name: 'Meetings',
      icon: Video,
      items: meetings,
      color: 'purple',
      path: (item: any) => `/meetings/${item.slug}`,
    },
    {
      type: 'pitches' as ContainerType,
      name: 'Pitches',
      icon: Presentation,
      items: pitches,
      color: 'orange',
      path: (item: any) => `/pitches/${item.slug}`,
    },
    {
      type: 'builds' as ContainerType,
      name: 'Builds',
      icon: Hammer,
      items: builds,
      color: 'yellow',
      path: (item: any) => `/builds/${item.slug}`,
    },
    {
      type: 'standups' as ContainerType,
      name: 'Standups',
      icon: MessageSquare,
      items: standups,
      color: 'pink',
      path: (item: any) => `/standups/${item.slug}`,
    },
    {
      type: 'meetups' as ContainerType,
      name: 'Meetups',
      icon: Users2,
      items: meetups,
      color: 'cyan',
      path: (item: any) => `/meetups/${item.slug}`,
    },
    {
      type: 'sprints' as ContainerType,
      name: 'Sprints',
      icon: CalendarClock,
      items: sprints,
      color: 'indigo',
      path: (item: any) => `/sprints/${item.slug}`,
    },
  ];

  // Filter container types that have at least one favorite
  const typesWithFavorites = containerTypes.filter(ct => ct.items.length > 0);

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
    if (selectedTypes.size === typesWithFavorites.length) {
      setSelectedTypes(new Set());
    } else {
      setSelectedTypes(new Set(typesWithFavorites.map(ct => ct.type)));
    }
  };

  // Filter container types based on selection
  const filteredContainerTypes = containerTypes.filter(ct => 
    ct.items.length > 0 && selectedTypes.has(ct.type)
  );

  const getAccessLevelBadge = (accessLevel?: string) => {
    if (!accessLevel || accessLevel === 'public') {
      return <Badge variant="secondary" className="text-xs">Public</Badge>;
    }
    if (accessLevel === 'member') {
      return <Badge variant="default" className="text-xs bg-indigo-600">Member</Badge>;
    }
    if (accessLevel === 'premium') {
      return <Badge variant="default" className="text-xs bg-yellow-600">Premium</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'My Favorites' }]} />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
          <h1 className="text-3xl">My Favorites</h1>
        </div>
        <p className="text-gray-600">
          Your favorited containers for quick access
        </p>
      </div>

      {/* Summary Card with Filters */}
      <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{totalContent}</h2>
              <p className="text-gray-600 mt-1">Favorited Containers</p>
            </div>
            <div className="text-right text-sm text-gray-600 space-y-1">
              {typesWithFavorites.map(ct => (
                <div key={ct.type}>{ct.items.length} {ct.name}</div>
              ))}
            </div>
          </div>

          {/* Filter Checkboxes */}
          {typesWithFavorites.length > 0 && (
            <div className="pt-4 border-t border-yellow-300">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Filter by type:</p>
                <button
                  onClick={toggleAll}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {selectedTypes.size === typesWithFavorites.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {typesWithFavorites.map((containerType) => {
                  const Icon = containerType.icon;
                  const isChecked = selectedTypes.has(containerType.type);
                  
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
                        {containerType.items.length}
                      </Badge>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Container Type Sections */}
      {filteredContainerTypes.map((containerType) => {
        if (containerType.items.length === 0) return null;

        const Icon = containerType.icon;

        return (
          <div key={containerType.type}>
            <div className="flex items-center gap-2 mb-4">
              <Icon className={`w-6 h-6 text-${containerType.color}-600`} />
              <h2 className="text-2xl font-semibold">{containerType.name}</h2>
              <Badge variant="secondary">{containerType.items.length}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {containerType.items.map((item: any) => {
                // Handler to update favorites when changed
                const handleFavoriteUpdate = (id: string, isFavorited: boolean) => {
                  // If unfavorited, remove from the list
                  if (!isFavorited) {
                    const updateState = (setState: React.Dispatch<React.SetStateAction<any[]>>) => {
                      setState(prev => prev.filter(i => i.id !== id));
                    };
                    
                    switch (containerType.type) {
                      case 'circles': updateState(setCircles); break;
                      case 'tables': updateState(setTables); break;
                      case 'elevators': updateState(setElevators); break;
                      case 'meetings': updateState(setMeetings); break;
                      case 'pitches': updateState(setPitches); break;
                      case 'builds': updateState(setBuilds); break;
                      case 'standups': updateState(setStandups); break;
                      case 'meetups': updateState(setMeetups); break;
                      case 'sprints': updateState(setSprints); break;
                    }
                  }
                };

                return (
                  <ContainerCard
                    key={item.id}
                    id={item.id}
                    type={containerType.type}
                    name={item.name}
                    description={item.description || ''}
                    link={containerType.path(item)}
                    visibility={item.access_level || item.visibility || 'public'}
                    memberCount={item.member_ids?.length || 0}
                    tags={item.tags || []}
                    isFavorited={item.is_favorited}
                    showJoinButton={false}
                    onFavoriteUpdate={handleFavoriteUpdate}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {totalContent === 0 && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Star className="w-16 h-16 text-gray-400" />
            <div>
              <h3 className="text-xl font-semibold mb-2">No Favorites Yet</h3>
              <p className="text-gray-600 mb-6">
                You haven't favorited any containers yet. Click the star icon on any Circle, Table, Build, or other container to add it here for quick access.
              </p>
              <div className="flex gap-3 justify-center">
                <Link to="/circles">
                  <Badge className="cursor-pointer hover:bg-indigo-700 px-4 py-2 text-sm">
                    Explore Circles
                  </Badge>
                </Link>
                <Link to="/builds">
                  <Badge variant="secondary" className="cursor-pointer hover:bg-gray-300 px-4 py-2 text-sm">
                    Browse Builds
                  </Badge>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}