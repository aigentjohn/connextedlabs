import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Search, Package, Users } from 'lucide-react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { OfferingCard } from '@/app/components/markets/OfferingCard';

interface Offering {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  logo_url: string;
  offering_type: 'product' | 'service';
  pricing_model?: 'free' | 'freemium' | 'paid' | 'contact';
  market_types: ('discovery' | 'launch' | 'marketplace')[];
  company?: {
    name: string;
    slug: string;
  };
  owner?: {
    name: string;
    id: string;
  };
  is_from_network?: boolean;
}

export default function MarketsAllOfferingsPage() {
  const { profile } = useAuth();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [filteredOfferings, setFilteredOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNetworkOnly, setShowNetworkOnly] = useState(false);

  useEffect(() => {
    fetchAllOfferings();
  }, []);

  useEffect(() => {
    filterOfferings();
  }, [offerings, searchQuery, showNetworkOnly]);

  const fetchAllOfferings = async () => {
    try {
      setLoading(true);

      // Get user's following list if authenticated
      let followingIds: string[] = [];
      if (profile?.id) {
        const { data: connectionsData } = await supabase
          .from('user_connections')
          .select('following_id')
          .eq('follower_id', profile.id);
        
        followingIds = connectionsData?.map(c => c.following_id) || [];
      }

      // Get ALL active public offerings
      const { data: offeringsData } = await supabase
        .from('market_offerings')
        .select('*')
        .eq('is_public', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!offeringsData) {
        setOfferings([]);
        setLoading(false);
        return;
      }

      // Get placements for each offering to determine which markets they're in
      const offeringsWithDetails = await Promise.all(
        offeringsData.map(async (offering) => {
          // Get market placements
          const { data: placements } = await supabase
            .from('market_placements')
            .select('market_type')
            .eq('offering_id', offering.id)
            .eq('is_active', true);

          const marketTypes = placements?.map(p => p.market_type as 'discovery' | 'launch' | 'marketplace') || [];

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
            .select('id, name')
            .eq('id', offering.owner_user_id)
            .single();

          const isFromNetwork = followingIds.includes(offering.owner_user_id);

          return {
            id: offering.id,
            name: offering.name,
            slug: offering.slug,
            tagline: offering.tagline,
            logo_url: offering.logo_url,
            offering_type: offering.offering_type,
            pricing_model: offering.pricing_model,
            market_types: marketTypes,
            company,
            owner: ownerData,
            is_from_network: isFromNetwork,
          };
        })
      );

      setOfferings(offeringsWithDetails);
    } catch (error) {
      console.error('Error fetching all offerings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOfferings = () => {
    let filtered = [...offerings];

    // Filter by network if enabled
    if (showNetworkOnly) {
      filtered = filtered.filter(o => o.is_from_network);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.name.toLowerCase().includes(query) ||
          o.tagline?.toLowerCase().includes(query) ||
          o.company?.name.toLowerCase().includes(query) ||
          o.owner?.name.toLowerCase().includes(query)
      );
    }

    setFilteredOfferings(filtered);
  };

  const networkOfferingsCount = offerings.filter(o => o.is_from_network).length;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading all offerings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Markets', href: '/markets' },
          { label: 'All Offerings' },
        ]}
        icon={Package}
        iconBg="bg-indigo-100"
        iconColor="text-indigo-600"
        title="All Offerings"
        description="Browse all products and services from our community"
      />

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search offerings by name, description, company, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Network Filter Toggle */}
          {profile && networkOfferingsCount > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button
                variant={showNetworkOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowNetworkOnly(!showNetworkOnly)}
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                From My Network ({networkOfferingsCount})
              </Button>
              {showNetworkOnly && (
                <span className="text-xs text-gray-500">
                  Showing offerings from people you follow
                </span>
              )}
            </div>
          )}

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredOfferings.length} of {offerings.length} offerings
          </div>
        </CardContent>
      </Card>

      {/* Offerings Grid */}
      {filteredOfferings.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-gray-100 rounded-full p-6">
              <Package className="w-16 h-16 text-gray-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery ? 'No offerings found' : 'No offerings yet'}
              </h3>
              <p className="text-gray-600">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Be the first to list an offering!'}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              All Offerings ({filteredOfferings.length})
            </h2>
            <p className="text-sm text-gray-600">
              Products and services across all markets
            </p>
          </div>

          {/* OFFERING CARDS - This is what an offering looks like */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOfferings.map((offering) => (
              <OfferingCard
                key={offering.id}
                id={offering.id}
                name={offering.name}
                slug={offering.slug}
                tagline={offering.tagline}
                logo_url={offering.logo_url}
                offering_type={offering.offering_type}
                pricing_model={offering.pricing_model}
                market_types={offering.market_types}
                company={offering.company}
                owner={offering.owner}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}