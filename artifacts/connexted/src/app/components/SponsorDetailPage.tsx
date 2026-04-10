import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { useSponsor } from '@/lib/sponsor-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Checkbox } from '@/app/components/ui/checkbox';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import {
  Building2,
  Crown,
  Mail,
  MapPin,
  Globe,
  ExternalLink,
  Table,
  TrendingUp,
  Video,
  Presentation,
  Hammer,
  MessageSquare,
  Users2,
  Calendar,
  ArrowUpCircle,
  Coffee,
  FileText,
  CheckSquare,
  CalendarClock,
  Settings,
  Mic,
  Headphones,
  BookOpen,
  QrCode,
} from 'lucide-react';
import { CompanionQRCode } from '@/app/components/events/CompanionQRCode';

interface Sponsor {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  location_city: string | null;
  location_state: string | null;
  tier: string;
  tier_id: string | null;
  tier_data?: {
    tier_name: string;
    tier_level: number;
  };
}

interface SponsoredContainer {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  created_at: string;
}

interface SponsorContentItem {
  id: string;
  item_type: string;
  item_id: string;
  order_index: number;
  notes: string | null;
  resolved_name?: string;
  resolved_slug?: string;
}

interface TierPermission {
  container_type: string;
  can_view: boolean;
  can_create: boolean;
  max_count: number;
}

export default function SponsorDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const { canManageSponsor, isDirector } = useSponsor();
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [containers, setContainers] = useState<SponsoredContainer[]>([]);
  const [permissions, setPermissions] = useState<TierPermission[]>([]);
  const [contentItems, setContentItems] = useState<SponsorContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchSponsorData();
    }
  }, [slug]);

  const fetchSponsorData = async () => {
    try {
      setLoading(true);

      // Fetch sponsor info
      const { data: sponsorData, error: sponsorError } = await supabase
        .from('sponsors')
        .select(`
          *,
          tier_data:sponsor_tiers (
            tier_name,
            tier_level
          )
        `)
        .eq('slug', slug)
        .single();

      if (sponsorError) throw sponsorError;
      setSponsor(sponsorData);

      // Fetch sponsor content items
      if (sponsorData?.id) {
        const { data: itemsData } = await supabase
          .from('sponsor_companion_items')
          .select('*')
          .eq('sponsor_id', sponsorData.id)
          .order('order_index');
        setContentItems(itemsData || []);
      }

      // Fetch all containers sponsored by this sponsor
      if (sponsorData?.id) {
        const containerTypes = [
          { table: 'tables', type: 'table', icon: Table },
          { table: 'elevators', type: 'elevator', icon: TrendingUp },
          { table: 'meetings', type: 'meeting', icon: Video },
          { table: 'pitches', type: 'pitch', icon: Presentation },
          { table: 'builds', type: 'build', icon: Hammer },
          { table: 'standups', type: 'standup', icon: MessageSquare },
          { table: 'meetups', type: 'meetup', icon: Users2 },
        ];

        const allContainers: SponsoredContainer[] = [];

        for (const { table, type } of containerTypes) {
          const { data, error } = await supabase
            .from(table)
            .select('id, name, slug, description, created_at')
            .eq('sponsor_id', sponsorData.id)
            .order('created_at', { ascending: false });

          if (!error && data) {
            allContainers.push(
              ...data.map((item) => ({
                ...item,
                type,
              }))
            );
          }
        }

        // Sort by created_at
        allContainers.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setContainers(allContainers);
      }

      // Fetch tier permissions
      if (sponsorData?.tier_id) {
        const { data: permissionData, error: permissionError } = await supabase
          .from('sponsor_tier_permissions')
          .select('*')
          .eq('tier_id', sponsorData.tier_id);

        if (permissionError) {
          console.error('Error fetching permissions:', permissionError);
        } else {
          setPermissions(permissionData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching sponsor:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierBadgeColor = (tierLevel?: number) => {
    switch (tierLevel) {
      case 1: return 'bg-amber-700 text-white'; // Bronze
      case 2: return 'bg-gray-400 text-white'; // Silver
      case 3: return 'bg-yellow-600 text-white'; // Gold
      case 4: return 'bg-slate-700 text-white'; // Platinum
      default: return 'bg-blue-600 text-white';
    }
  };

  const getContainerIcon = (type: string) => {
    const icons: Record<string, any> = {
      table: Table,
      elevator: TrendingUp,
      meeting: Video,
      pitch: Presentation,
      build: Hammer,
      standup: MessageSquare,
      meetup: Users2,
    };
    return icons[type] || Calendar;
  };

  const getContainerLink = (container: SponsoredContainer) => {
    const routes: Record<string, string> = {
      table: `/tables/${container.slug}`,
      elevator: `/elevators/${container.slug}`,
      meeting: `/meetings/${container.slug}`,
      pitch: `/pitches/${container.slug}`,
      build: `/builds/${container.slug}`,
      standup: `/standups/${container.slug}`,
      meetup: `/meetups/${container.slug}`,
    };
    return routes[container.type] || '#';
  };

  const toggleFilter = (type: string) => {
    const newFilters = new Set(selectedFilters);
    if (newFilters.has(type)) {
      newFilters.delete(type);
    } else {
      newFilters.add(type);
    }
    setSelectedFilters(newFilters);
  };

  // Get container counts by type
  const containerCounts = containers.reduce((acc, container) => {
    acc[container.type] = (acc[container.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get permission limits for each type
  const getPermissionForType = (type: string) => {
    // Map display type to database container_type
    const typeMap: Record<string, string> = {
      'table': 'tables',
      'elevator': 'elevators',
      'meeting': 'meetings',
      'pitch': 'pitches',
      'build': 'builds',
      'standup': 'standups',
      'meetup': 'meetups',
    };
    
    const dbType = typeMap[type] || type;
    return permissions.find(p => p.container_type === dbType);
  };

  // Filter containers based on selected filters
  const filteredContainers = selectedFilters.size === 0
    ? containers
    : containers.filter(c => selectedFilters.has(c.type));

  // Get unique container types that have containers
  const availableTypes = Array.from(new Set(containers.map(c => c.type)));

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading sponsor...</p>
      </div>
    );
  }

  if (!sponsor) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-2xl mb-2">Sponsor Not Found</h2>
        <p className="text-gray-600 mb-6">The sponsor you're looking for doesn't exist.</p>
        <Button asChild>
          <Link to="/sponsors">Browse All Sponsors</Link>
        </Button>
      </div>
    );
  }

  const location = [sponsor.location_city, sponsor.location_state].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Sponsors', href: '/sponsors' },
          { label: sponsor.name },
        ]}
      />

      {/* Sponsor Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {/* Logo/Avatar */}
            <Avatar className="w-32 h-32">
              <AvatarImage src={sponsor.logo_url || undefined} />
              <AvatarFallback className="text-4xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white">
                {sponsor.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl">{sponsor.name}</h1>
                    {sponsor.tier_data && (
                      <Badge className={getTierBadgeColor(sponsor.tier_data.tier_level)}>
                        <Crown className="w-4 h-4 mr-1" />
                        {sponsor.tier_data.tier_name}
                      </Badge>
                    )}
                  </div>
                  {sponsor.tagline && (
                    <p className="text-lg text-gray-600 mb-4">{sponsor.tagline}</p>
                  )}
                  {sponsor.description && (
                    <p className="text-gray-700 mb-4">{sponsor.description}</p>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{location}</span>
                  </div>
                )}
                {sponsor.contact_email && (
                  <a
                    href={`mailto:${sponsor.contact_email}`}
                    className="flex items-center gap-2 text-indigo-600 hover:underline"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{sponsor.contact_email}</span>
                  </a>
                )}
                {sponsor.website_url && (
                  <a
                    href={sponsor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-indigo-600 hover:underline"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Visit Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sponsor Content Items (read-only) */}
      {contentItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>From {sponsor.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/sponsors/${sponsor.slug}/companion`}>
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    Companion
                  </Link>
                </Button>
                {canManageSponsor(sponsor.id) && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/sponsor/${sponsor.slug}/manage`}>
                      <Settings className="w-4 h-4 mr-2" />
                      Manage
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {contentItems.map(item => {
                const ITEM_ICONS: Record<string, any> = {
                  elevator: Mic, pitch: Presentation, document: FileText,
                  checklist: CheckSquare, episode: Headphones, book: BookOpen, qr_code: QrCode,
                };
                const ITEM_ROUTES: Record<string, string> = {
                  elevator: '/elevators', pitch: '/pitches', document: '/documents',
                  checklist: '/checklists', episode: '/episodes', book: '/books',
                };
                const Icon = ITEM_ICONS[item.item_type] || FileText;
                const isQR = item.item_type === 'qr_code';

                return (
                  <div key={item.id} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border-b">
                      <Icon className="w-4 h-4 text-indigo-500" />
                      <span className="flex-1 text-sm font-medium text-gray-700 capitalize">
                        {item.item_type.replace('_', ' ')}
                        {isQR && (() => {
                          try {
                            const d = JSON.parse(item.notes || '{}');
                            return d.label ? <span className="ml-2 font-normal text-gray-500">— {d.label}</span> : null;
                          } catch { return null; }
                        })()}
                      </span>
                    </div>
                    <div className="px-3 py-3">
                      {isQR && (() => {
                        let qrData = { url: '', label: '' };
                        try { qrData = JSON.parse(item.notes || '{}'); } catch {}
                        return qrData.url
                          ? <CompanionQRCode url={qrData.url} label={qrData.label || undefined} />
                          : null;
                      })()}
                      {!isQR && ITEM_ROUTES[item.item_type] && (
                        <Link
                          to={`${ITEM_ROUTES[item.item_type]}/${item.item_id}`}
                          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
                        >
                          View {item.item_type}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sponsored Containers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sponsored Containers</CardTitle>
              <CardDescription>
                Showing {filteredContainers.length} of {containers.length} containers
              </CardDescription>
            </div>
            {canManageSponsor(sponsor.id) && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/sponsor/${sponsor.slug}/manage`}>
                  <Settings className="w-4 h-4 mr-2" />
                  Manage
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {containers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>This sponsor hasn't created any containers yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Permission Stats */}
              {permissions.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-6 border-b">
                  {availableTypes.map((type) => {
                    const Icon = getContainerIcon(type);
                    const count = containerCounts[type] || 0;
                    const perm = getPermissionForType(type);
                    const limit = perm?.max_count || 0;
                    const canCreate = perm?.can_create || false;
                    const percentage = limit > 0 ? (count / limit) * 100 : 0;
                    const isNearLimit = percentage >= 80;
                    const isAtLimit = count >= limit;

                    return (
                      <div key={type} className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium capitalize">{type}s</span>
                        </div>
                        <div className="text-2xl font-bold mb-1">
                          {count}
                          <span className="text-sm text-gray-500 font-normal">
                            {canCreate ? ` / ${limit}` : ''}
                          </span>
                        </div>
                        {canCreate && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                isAtLimit
                                  ? 'bg-red-600'
                                  : isNearLimit
                                  ? 'bg-yellow-600'
                                  : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        )}
                        {!canCreate && (
                          <Badge variant="outline" className="text-xs">View Only</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Filters */}
              {availableTypes.length > 1 && (
                <div className="flex flex-wrap gap-2 pb-4 border-b">
                  <span className="text-sm font-medium text-gray-700 py-2">Filter by type:</span>
                  {availableTypes.map((type) => {
                    const Icon = getContainerIcon(type);
                    const count = containerCounts[type] || 0;
                    const isSelected = selectedFilters.has(type);
                    
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <label
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300'
                              : 'bg-white hover:bg-gray-50'
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleFilter(type)}
                          />
                          <Icon className="w-4 h-4 text-gray-600" />
                          <span className="text-sm capitalize">{type}s</span>
                          <Badge variant="secondary" className="text-xs">
                            {count}
                          </Badge>
                        </label>
                      </div>
                    );
                  })}
                  {selectedFilters.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFilters(new Set())}
                      className="ml-2"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              )}

              {/* Container Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContainers.map((container) => {
                  const Icon = getContainerIcon(container.type);
                  return (
                    <Link
                      key={container.id}
                      to={getContainerLink(container)}
                      className="block p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                          <Icon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">{container.name}</h3>
                            <Badge variant="outline" className="text-xs capitalize">
                              {container.type}
                            </Badge>
                          </div>
                          {container.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{container.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(container.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}