import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Search,
  Filter,
  ExternalLink,
  Building2,
  MessageCircle,
  Zap,
  BookOpen,
  Store,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { OfferingCard } from '@/app/components/markets/OfferingCard';
import { toast } from 'sonner';

interface Market {
  id: string;
  name: string;
  slug: string;
  description: string;
  tagline: string;
  icon: string;
  color: string;
  is_active: boolean;
}

interface Offering {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  logo_url: string;
  offering_type: string;
  engagement_style: string;
  seeking_feedback: boolean;
  seeking_early_adopters: boolean;
  seeking_customers: boolean;
  company?: {
    name: string;
    slug: string;
  };
  owner?: {
    name: string;
  };
}

const OFFERING_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'software', label: 'Software/SaaS' },
  { value: 'service', label: 'Services' },
  { value: 'physical', label: 'Physical Products' },
  { value: 'digital', label: 'Digital Products' },
  { value: 'hardware', label: 'Hardware' },
];

export default function MarketDetailPage() {
  const { marketType } = useParams<{ marketType: string }>();
  const navigate = useNavigate();
  const [market, setMarket] = useState<Market | null>(null);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [filteredOfferings, setFilteredOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (marketType) {
      fetchMarket();
      fetchOfferings();
    }
  }, [marketType]);

  useEffect(() => {
    filterOfferings();
  }, [offerings, searchQuery, typeFilter]);

  const fetchMarket = async () => {
    try {
      console.log(`[MarketDetailPage] Fetching market: ${marketType}`);
      
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .eq('slug', marketType)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('[MarketDetailPage] Error fetching market:', error);
        toast.error('Failed to load market');
        navigate('/markets');
        return;
      }

      if (!data) {
        console.log('[MarketDetailPage] Market not found');
        toast.error('Market not found');
        navigate('/markets');
        return;
      }

      console.log('[MarketDetailPage] Market found:', data);
      setMarket(data);
    } catch (error) {
      console.error('[MarketDetailPage] Error:', error);
      toast.error('Failed to load market');
      navigate('/markets');
    }
  };

  const fetchOfferings = async () => {
    try {
      setLoading(true);
      
      console.log(`[MarketDetailPage] Fetching offerings for market slug: ${marketType}`);

      // First get the market ID from slug
      const { data: marketData } = await supabase
        .from('markets')
        .select('id')
        .eq('slug', marketType)
        .single();

      if (!marketData) {
        console.log('[MarketDetailPage] Market not found');
        setOfferings([]);
        setLoading(false);
        return;
      }

      // Get offerings in this market
      const { data: placements, error: placementsError } = await supabase
        .from('market_placements')
        .select(`
          offering_id,
          market_offerings!inner(
            id,
            name,
            slug,
            tagline,
            logo_url,
            offering_type,
            engagement_style,
            seeking_feedback,
            seeking_early_adopters,
            seeking_customers,
            company_id,
            owner_user_id
          )
        `)
        .eq('market_id', marketData.id)
        .eq('is_active', true)
        .eq('market_offerings.is_public', true)
        .eq('market_offerings.is_active', true);

      if (placementsError) {
        console.error('[MarketDetailPage] Error fetching placements:', placementsError);
      }
      
      console.log(`[MarketDetailPage] Found ${placements?.length || 0} placements`, placements);

      if (!placements || placements.length === 0) {
        console.log('[MarketDetailPage] No placements found, setting empty array');
        setOfferings([]);
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
            ...offering,
            company,
            owner: ownerData,
          };
        })
      );
      
      console.log(`[MarketDetailPage] Offerings with details:`, offeringsWithDetails);

      setOfferings(offeringsWithDetails);
    } catch (error) {
      console.error('[MarketDetailPage] Error fetching offerings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOfferings = () => {
    let filtered = [...offerings];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.name.toLowerCase().includes(query) ||
          o.tagline?.toLowerCase().includes(query) ||
          o.company?.name.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((o) => o.offering_type === typeFilter);
    }

    setFilteredOfferings(filtered);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Market not found</div>
      </div>
    );
  }

  // Get icon color class
  const getColorClass = (color: string, type: 'text' | 'bg') => {
    const prefix = type === 'text' ? 'text-' : 'bg-';
    return `${prefix}${color}-${type === 'text' ? '600' : '50'}`;
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Markets', href: '/markets' },
          { label: market.name },
        ]}
      />

      {/* Market Header */}
      <div className={`${getColorClass(market.color, 'bg')} rounded-lg p-8`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-16 h-16 rounded-2xl ${getColorClass(market.color, 'bg')} bg-opacity-20 flex items-center justify-center`}>
            <Store className={`w-8 h-8 ${getColorClass(market.color, 'text')}`} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{market.name}</h1>
            <p className={`${getColorClass(market.color, 'text')} font-medium`}>
              {market.tagline}
            </p>
          </div>
        </div>
        <p className="text-gray-700 max-w-3xl">
          {market.description}
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search offerings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OFFERING_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {filteredOfferings.length} {filteredOfferings.length === 1 ? 'offering' : 'offerings'} found
        </p>
      </div>

      {/* Offerings Grid */}
      {filteredOfferings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No offerings yet</h3>
            <p className="text-gray-600">
              {searchQuery || typeFilter !== 'all'
                ? 'No offerings match your search criteria.'
                : `No offerings in ${market.name} yet. Check back soon!`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOfferings.map((offering) => (
            <OfferingCard key={offering.id} {...offering} />
          ))}
        </div>
      )}
    </div>
  );
}