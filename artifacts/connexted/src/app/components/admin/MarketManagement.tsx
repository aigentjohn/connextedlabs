// Split candidate: ~592 lines — consider extracting MarketCard, MarketOfferingsPanel, and MarketEditDialog into sub-components.
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { 
  Building2, 
  Package, 
  Star,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  Settings,
  AlertCircle,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';

interface Market {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  is_active: boolean;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  industry: string;
  owner_user_id: string;
  is_public: boolean;
  created_at: string;
}

interface Offering {
  id: string;
  name: string;
  slug: string;
  company_id: string;
  owner_user_id: string;
  offering_type: string;
  stage: string;
  is_public: boolean;
  is_active: boolean;
  created_at: string;
  company?: {
    name: string;
  };
}

interface MarketPlacement {
  id: string;
  offering_id: string;
  market_id: string;
  is_active: boolean;
  featured: boolean;
  placed_at: string;
}

type ViewMode = 'offerings' | 'companies';

export default function MarketManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('offerings');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [placements, setPlacements] = useState<MarketPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch markets
      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (marketsError) throw marketsError;
      setMarkets(marketsData || []);

      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('market_companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Fetch offerings with company info
      const { data: offeringsData, error: offeringsError } = await supabase
        .from('market_offerings')
        .select(`
          *,
          market_companies!left(name)
        `)
        .order('created_at', { ascending: false });

      if (offeringsError) throw offeringsError;
      
      const formattedOfferings = offeringsData?.map((o: any) => ({
        ...o,
        company: o.market_companies ? { name: o.market_companies.name } : null,
      })) || [];
      
      setOfferings(formattedOfferings);

      // Fetch placements
      const { data: placementsData, error: placementsError } = await supabase
        .from('market_placements')
        .select('*');

      if (placementsError) throw placementsError;
      setPlacements(placementsData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isOfferingInMarket = (offeringId: string, marketId: string) => {
    return placements.some(
      p => p.offering_id === offeringId && p.market_id === marketId && p.is_active
    );
  };

  const isOfferingFeatured = (offeringId: string, marketId: string) => {
    const placement = placements.find(
      p => p.offering_id === offeringId && p.market_id === marketId
    );
    return placement?.featured || false;
  };

  const handleAddToMarket = async (offeringId: string, marketId: string) => {
    try {
      const { error } = await supabase
        .from('market_placements')
        .insert({
          offering_id: offeringId,
          market_id: marketId,
          is_active: true,
          featured: false,
        });

      if (error) throw error;

      const market = markets.find(m => m.id === marketId);
      toast.success(`Added to ${market?.name || 'market'}`);
      fetchData();
    } catch (error: any) {
      console.error('Error adding to market:', error);
      toast.error(`Failed to add: ${error.message}`);
    }
  };

  const handleRemoveFromMarket = async (offeringId: string, marketId: string) => {
    try {
      const { error } = await supabase
        .from('market_placements')
        .delete()
        .eq('offering_id', offeringId)
        .eq('market_id', marketId);

      if (error) throw error;

      const market = markets.find(m => m.id === marketId);
      toast.success(`Removed from ${market?.name || 'market'}`);
      fetchData();
    } catch (error: any) {
      console.error('Error removing from market:', error);
      toast.error(`Failed to remove: ${error.message}`);
    }
  };

  const handleToggleFeatured = async (offeringId: string, marketId: string) => {
    try {
      const placement = placements.find(
        p => p.offering_id === offeringId && p.market_id === marketId
      );

      if (!placement) return;

      const { error } = await supabase
        .from('market_placements')
        .update({ featured: !placement.featured })
        .eq('id', placement.id);

      if (error) throw error;

      toast.success(`Featured status updated`);
      fetchData();
    } catch (error: any) {
      console.error('Error toggling featured:', error);
      toast.error(`Failed to update: ${error.message}`);
    }
  };

  const filteredOfferings = offerings.filter(o =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.company?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.offering_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMarketPlacementCount = (marketId: string) => {
    return placements.filter(p => p.market_id === marketId && p.is_active).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Platform Admin', href: '/platform-admin' },
            { label: 'Market Management' },
          ]}
        />

        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Markets Configured</h3>
            <p className="text-gray-600 mb-6">
              Before managing placements, you need to create market categories.
            </p>
            <Button asChild>
              <Link to="/platform-admin/markets/configuration">
                <Settings className="w-4 h-4 mr-2" />
                Configure Markets
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Market Management' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Market Management</h1>
          <p className="text-gray-600">
            Manage which offerings appear in which markets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/platform-admin/markets/configuration">
              <Settings className="w-4 h-4 mr-2" />
              Configure Markets
            </Link>
          </Button>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Building2 className="w-4 h-4 mr-2" />
              Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Package className="w-4 h-4 mr-2" />
              Offerings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offerings.length}</div>
          </CardContent>
        </Card>

        {markets.slice(0, 2).map((market) => (
          <Card key={market.id}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-medium text-${market.color}-600 flex items-center`}>
                <Package className="w-4 h-4 mr-2" />
                {market.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getMarketPlacementCount(market.id)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-4">
        <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="offerings">
              <div className="flex items-center">
                <Package className="w-4 h-4 mr-2" />
                Manage Offerings
              </div>
            </SelectItem>
            <SelectItem value="companies">
              <div className="flex items-center">
                <Building2 className="w-4 h-4 mr-2" />
                View Companies
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder={viewMode === 'offerings' ? 'Search offerings...' : 'Search companies...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Offerings Table */}
      {viewMode === 'offerings' && (
        <Card>
          <CardHeader>
            <CardTitle>Offerings & Market Placements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Offering</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Stage</TableHead>
                    {markets.map((market) => (
                      <TableHead key={market.id} className="text-center">
                        {market.name}
                      </TableHead>
                    ))}
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOfferings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5 + markets.length} className="text-center py-8 text-gray-500">
                        No offerings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOfferings.map((offering) => (
                      <TableRow key={offering.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{offering.name}</div>
                            <div className="text-xs text-gray-500">{offering.slug}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {offering.company?.name || (
                            <span className="text-gray-400 italic">No company</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{offering.offering_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{offering.stage}</Badge>
                        </TableCell>

                        {/* Dynamic Market Columns */}
                        {markets.map((market) => (
                          <TableCell key={market.id} className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isOfferingInMarket(offering.id, market.id) ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant={isOfferingFeatured(offering.id, market.id) ? 'default' : 'ghost'}
                                    onClick={() => handleToggleFeatured(offering.id, market.id)}
                                  >
                                    <Star className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveFromMarket(offering.id, market.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddToMarket(offering.id, market.id)}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        ))}

                        <TableCell>
                          <div className="flex gap-2">
                            {offering.is_public && (
                              <Badge variant="outline" className="bg-green-50">
                                Public
                              </Badge>
                            )}
                            {offering.is_active && (
                              <Badge variant="outline" className="bg-blue-50">
                                Active
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Companies Table */}
      {viewMode === 'companies' && (
        <Card>
          <CardHeader>
            <CardTitle>Companies Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Offerings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No companies found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCompanies.map((company) => {
                      const companyOfferings = offerings.filter(
                        o => o.company_id === company.id
                      );
                      return (
                        <TableRow key={company.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{company.name}</div>
                              <div className="text-xs text-gray-500">{company.slug}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {company.industry || (
                              <span className="text-gray-400 italic">Not specified</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{companyOfferings.length}</Badge>
                          </TableCell>
                          <TableCell>
                            {company.is_public ? (
                              <Badge variant="outline" className="bg-green-50">
                                Public
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50">
                                Private
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(company.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Add to market</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              <span>Toggle featured</span>
            </div>
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>Remove from market</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
