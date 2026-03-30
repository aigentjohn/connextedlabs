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
  Sparkles,
  TrendingUp,
  ExternalLink,
  Users,
  Building2,
  ShoppingBag,
  Package,
  Zap,
  Target,
  Award,
  Star,
  Briefcase,
  Box,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';

// Map icon name strings (from admin config) to actual Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  Store,
  Microscope,
  Rocket,
  ShoppingBag,
  Package,
  Building2,
  Sparkles,
  Zap,
  TrendingUp,
  Target,
  Award,
  Star,
  Briefcase,
  Box,
  Globe,
};

// Map color name strings to Tailwind classes
const COLOR_MAP: Record<string, { bg: string; light: string; text: string }> = {
  purple: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600' },
  blue:   { bg: 'bg-blue-500',   light: 'bg-blue-50',   text: 'text-blue-600' },
  green:  { bg: 'bg-green-500',  light: 'bg-green-50',  text: 'text-green-600' },
  red:    { bg: 'bg-red-500',    light: 'bg-red-50',    text: 'text-red-600' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600' },
  yellow: { bg: 'bg-yellow-500', light: 'bg-yellow-50', text: 'text-yellow-600' },
  pink:   { bg: 'bg-pink-500',   light: 'bg-pink-50',   text: 'text-pink-600' },
  indigo: { bg: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-600' },
  teal:   { bg: 'bg-teal-500',   light: 'bg-teal-50',   text: 'text-teal-600' },
  gray:   { bg: 'bg-gray-500',   light: 'bg-gray-50',   text: 'text-gray-600' },
};

const DEFAULT_COLOR = { bg: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-600' };

interface MarketRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  tagline: string;
  icon: string;
  color: string;
  display_order: number;
  is_active: boolean;
  is_public: boolean;
  offering_count: number;
}

interface FeaturedOffering {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  logo_url: string;
  offering_type: string;
  company?: {
    name: string;
    slug: string;
  };
  owner?: {
    name: string;
  };
}

export default function MarketsPage() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [featuredOfferings, setFeaturedOfferings] = useState<FeaturedOffering[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets();
    fetchCompanyCount();
    fetchFeaturedOfferings();
  }, []);

  const fetchMarkets = async () => {
    try {
      // Fetch active, public markets
      const { data: marketsData, error } = await supabase
        .from('markets')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true)
        .order('display_order');

      if (error) throw error;

      // Get offering counts per market
      const marketsWithCounts: MarketRow[] = await Promise.all(
        (marketsData || []).map(async (m: any) => {
          const { count } = await supabase
            .from('market_placements')
            .select('*', { count: 'exact', head: true })
            .eq('market_id', m.id)
            .eq('is_active', true);

          return { ...m, offering_count: count || 0 };
        })
      );

      setMarkets(marketsWithCounts);
    } catch (error) {
      console.error('Error fetching markets:', error);
    }
  };

  const fetchCompanyCount = async () => {
    try {
      const { count } = await supabase
        .from('market_companies')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true);
      setTotalCompanies(count || 0);
    } catch (error) {
      console.error('Error fetching company count:', error);
    }
  };

  const fetchFeaturedOfferings = async () => {
    try {
      setLoading(true);

      // Get featured offerings
      const { data: placements } = await supabase
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
            company_id,
            owner_user_id
          )
        `)
        .eq('featured', true)
        .eq('is_active', true)
        .limit(6);

      if (!placements) {
        setLoading(false);
        return;
      }

      // Get company and owner info
      const offerings = await Promise.all(
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

      setFeaturedOfferings(offerings);
    } catch (error) {
      console.error('Error fetching featured offerings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/markets/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const totalOfferings = markets.reduce((sum, m) => sum + m.offering_count, 0);

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: 'Markets' }]} />

      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Store className="w-12 h-12 text-indigo-600" />
        </div>
        <h1 className="text-4xl font-bold">Markets</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover innovative products and services built by our community members
        </p>

        {/* Search */}
        <div className="max-w-2xl mx-auto mt-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search products, services, or companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 text-sm text-gray-600 pt-4">
          <div>
            <span className="font-semibold text-gray-900">{totalCompanies}</span> Companies
          </div>
          <div>
            <span className="font-semibold text-gray-900">{totalOfferings}</span> Offerings
          </div>
        </div>
      </div>

      {/* Market Cards — driven by admin-defined markets table */}
      {markets.length > 0 && (
        <div className={`grid gap-6 ${markets.length === 1 ? 'md:grid-cols-1 max-w-lg mx-auto' : markets.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          {markets.map((market) => {
            const Icon = ICON_MAP[market.icon] || Store;
            const colors = COLOR_MAP[market.color] || DEFAULT_COLOR;
            return (
              <Card
                key={market.id}
                className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-indigo-200"
                onClick={() => navigate(`/markets/${market.slug}`)}
              >
                <CardContent className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl ${colors.light} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <Badge className={colors.bg}>
                      {market.offering_count} {market.offering_count === 1 ? 'listing' : 'listings'}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="text-xl font-bold mb-2">{market.name}</h3>
                    {market.tagline && (
                      <p className="text-gray-600 text-sm font-medium mb-1">{market.tagline}</p>
                    )}
                    {market.description && (
                      <p className="text-gray-500 text-sm">{market.description}</p>
                    )}
                  </div>

                  {/* CTA */}
                  <Button className="w-full" variant="outline">
                    Explore {market.name}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {markets.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <Store className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No markets available yet</p>
          <p className="text-sm">Markets are configured by administrators.</p>
        </div>
      )}

      {/* Featured Offerings */}
      {featuredOfferings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Featured This Month</h2>
              <p className="text-gray-600">Handpicked innovations from our community</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {featuredOfferings.map((offering) => (
              <Card
                key={offering.id}
                className="hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate(`/markets/offerings/${offering.slug}`)}
              >
                <CardContent className="p-6 space-y-4">
                  {offering.logo_url && (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                      <img src={offering.logo_url} alt={offering.name} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div>
                    <h3 className="font-bold text-lg mb-1">{offering.name}</h3>
                    {offering.tagline && (
                      <p className="text-sm text-gray-600">{offering.tagline}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    {offering.company ? (
                      <span>by {offering.company.name}</span>
                    ) : offering.owner ? (
                      <span>by {offering.owner.name}</span>
                    ) : null}
                    <Badge variant="outline" className="capitalize">
                      {offering.offering_type}
                    </Badge>
                  </div>

                  <Button variant="outline" size="sm" className="w-full">
                    Learn More
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CTA for Members */}
      <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <CardContent className="p-8 text-center space-y-4">
          <Sparkles className="w-12 h-12 mx-auto" />
          <h2 className="text-2xl font-bold">Have a product or service?</h2>
          <p className="text-indigo-100 max-w-2xl mx-auto">
            Showcase your innovation to our community. List your product and connect with potential customers.
          </p>
          <Button size="lg" variant="secondary" onClick={() => navigate('/my-ventures')}>
            List Your Product
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Browse All */}
      <div className="flex justify-center gap-4 py-8">
        <Button variant="outline" size="lg" onClick={() => navigate('/markets/all-offerings')}>
          Browse All Offerings
          <TrendingUp className="w-4 h-4 ml-2" />
        </Button>
        <Button variant="outline" size="lg" onClick={() => navigate('/markets/all-companies')}>
          <Building2 className="w-4 h-4 mr-2" />
          All Companies
        </Button>
        <Button variant="default" size="lg" onClick={() => navigate('/markets/network-companies')}>
          <Users className="w-4 h-4 mr-2" />
          Network Companies
        </Button>
      </div>
    </div>
  );
}