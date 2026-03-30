import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import {
  Microscope,
  Rocket,
  Store,
  Search,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { OfferingCard } from '@/app/components/markets/OfferingCard';

interface MarketStats {
  discovery_count: number;
  launch_count: number;
  marketplace_count: number;
}

interface Offering {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  logo_url: string;
  offering_type: 'product' | 'service';
  pricing_model?: 'free' | 'freemium' | 'paid' | 'contact';
  market_type: 'discovery' | 'launch' | 'marketplace';
  company?: {
    name: string;
    slug: string;
  };
  owner?: {
    name: string;
  };
}

export default function MarketsAllMarketsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<MarketStats>({
    discovery_count: 0,
    launch_count: 0,
    marketplace_count: 0,
  });
  const [allOfferings, setAllOfferings] = useState<Offering[]>([]);
  const [filteredOfferings, setFilteredOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStats();
    fetchAllMarketOfferings();
  }, []);

  useEffect(() => {
    filterOfferings();
  }, [allOfferings, searchQuery]);

  const fetchStats = async () => {
    try {
      const { data: placements } = await supabase
        .from('market_placements')
        .select('market_type, offering_id')
        .eq('is_active', true);

      const discovery = placements?.filter(p => p.market_type === 'discovery').length || 0;
      const launch = placements?.filter(p => p.market_type === 'launch').length || 0;
      const marketplace = placements?.filter(p => p.market_type === 'marketplace').length || 0;

      setStats({
        discovery_count: discovery,
        launch_count: launch,
        marketplace_count: marketplace,
      });
    } catch (error) {
      console.error('Error fetching market stats:', error);
    }
  };

  const fetchAllMarketOfferings = async () => {
    try {
      setLoading(true);

      // Get ALL placements with their offerings
      const { data: placements } = await supabase
        .from('market_placements')
        .select(`
          market_type,
          market_offerings!inner(
            id,
            name,
            slug,
            tagline,
            logo_url,
            offering_type,
            pricing_model,
            company_id,
            owner_user_id
          )
        `)
        .eq('is_active', true)
        .eq('market_offerings.is_public', true)
        .eq('market_offerings.is_active', true);

      if (!placements) {
        setAllOfferings([]);
        setLoading(false);
        return;
      }

      // Get company and owner info for each offering
      const offeringsWithDetails = await Promise.all(
        placements.map(async (p: any) => {
          const offering = p.market_offerings;

          // Get company if exists
          let company = null;
          if (offering.company_id) {
            const { data: companyData } = await supabase
              .from('market_companies')
              .select('name, slug')
              .eq('id', offering.company_id)
              .single();
            company = companyData;
          }

          // Get owner
          const { data: ownerData } = await supabase
            .from('users')
            .select('name')
            .eq('id', offering.owner_user_id)
            .single();

          return {
            id: offering.id,
            name: offering.name,
            slug: offering.slug,
            tagline: offering.tagline,
            logo_url: offering.logo_url,
            offering_type: offering.offering_type,
            pricing_model: offering.pricing_model,
            market_type: p.market_type,
            company,
            owner: ownerData,
          };
        })
      );

      setAllOfferings(offeringsWithDetails);
    } catch (error) {
      console.error('Error fetching all market offerings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOfferings = () => {
    let filtered = [...allOfferings];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.name.toLowerCase().includes(query) ||
          o.tagline?.toLowerCase().includes(query) ||
          o.company?.name.toLowerCase().includes(query)
      );
    }

    setFilteredOfferings(filtered);
  };

  // Group offerings by market type
  const discoveryOfferings = filteredOfferings.filter(o => o.market_type === 'discovery');
  const launchOfferings = filteredOfferings.filter(o => o.market_type === 'launch');
  const marketplaceOfferings = filteredOfferings.filter(o => o.market_type === 'marketplace');

  const markets = [
    {
      id: 'discovery',
      name: 'Discovery Lab',
      icon: Microscope,
      description: 'Early-stage ideas seeking feedback and validation',
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      count: stats.discovery_count,
      offerings: discoveryOfferings,
      features: [
        'Help validate ideas',
        'Join beta testing',
        'Provide feedback',
        'Shape products',
      ],
    },
    {
      id: 'launch',
      name: 'Launch Pad',
      icon: Rocket,
      description: 'New products seeking early adopters',
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      count: stats.launch_count,
      offerings: launchOfferings,
      features: [
        'Be first users',
        'Early-adopter pricing',
        'Direct founder access',
        'Shape roadmap',
      ],
    },
    {
      id: 'marketplace',
      name: 'Marketplace',
      icon: Store,
      description: 'Established products ready for everyone',
      color: 'bg-green-500',
      lightColor: 'bg-green-50',
      iconColor: 'text-green-600',
      count: stats.marketplace_count,
      offerings: marketplaceOfferings,
      features: [
        'Proven solutions',
        'Polished experiences',
        'Ready to use',
        'Trusted by customers',
      ],
    },
  ];

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading markets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: 'Markets', href: '/markets' },
          { label: 'Browse All Markets' },
        ]}
        icon={Store}
        iconBg="bg-green-100"
        iconColor="text-green-600"
        title="Browse All Markets"
        description="Explore offerings across all three market stages"
      />

      {/* Search */}
      <div className="max-w-2xl mx-auto mt-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search across all markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center gap-8 text-sm text-gray-600 pt-4">
        <div>
          <span className="font-semibold text-gray-900">
            {stats.discovery_count + stats.launch_count + stats.marketplace_count}
          </span>{' '}
          Total Offerings
        </div>
      </div>

      {/* Markets with Offerings */}
      {markets.map((market) => {
        const Icon = market.icon;
        const hasOfferings = market.offerings.length > 0;

        return (
          <div key={market.id} className="space-y-4">
            {/* Market Header Card */}
            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl ${market.lightColor} flex items-center justify-center`}>
                      <Icon className={`w-7 h-7 ${market.iconColor}`} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{market.name}</h2>
                      <p className="text-gray-600">{market.description}</p>
                    </div>
                  </div>
                  <Badge className={market.color}>
                    {market.count} {market.count === 1 ? 'offering' : 'offerings'}
                  </Badge>
                </div>

                {/* Features */}
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  {market.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* View Market Button */}
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/markets/${market.id}`)}
                  >
                    View {market.name}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Offerings in this market */}
            {hasOfferings ? (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Showing {market.offerings.length} offering{market.offerings.length !== 1 ? 's' : ''} in {market.name}
                </p>
                <div className="grid md:grid-cols-3 gap-6">
                  {market.offerings.slice(0, 3).map((offering) => (
                    <OfferingCard
                      key={offering.id}
                      id={offering.id}
                      name={offering.name}
                      slug={offering.slug}
                      tagline={offering.tagline}
                      logo_url={offering.logo_url}
                      offering_type={offering.offering_type}
                      pricing_model={offering.pricing_model}
                      market_types={[offering.market_type]}
                      company={offering.company}
                      owner={offering.owner}
                    />
                  ))}
                </div>
                {market.offerings.length > 3 && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="ghost"
                      onClick={() => navigate(`/markets/${market.id}`)}
                    >
                      View all {market.offerings.length} offerings in {market.name}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No offerings in {market.name} yet</p>
              </Card>
            )}
          </div>
        );
      })}
    </div>
  );
}