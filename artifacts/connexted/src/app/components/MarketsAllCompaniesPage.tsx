import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Search, Building2, Users } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { PageHeader } from '@/app/components/shared/PageHeader';
import CompanyCard from '@/app/components/markets/CompanyCard';

interface Company {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  logo_url: string;
  location: string;
  industry: string;
  stage: string;
  offering_count: number;
  owner_user_id?: string;
  owner_name?: string;
  owner_avatar?: string;
  is_from_network?: boolean;
}

export default function MarketsAllCompaniesPage() {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNetworkOnly, setShowNetworkOnly] = useState(false);
  const [networkCompanyIds, setNetworkCompanyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAllCompanies();
  }, []);

  useEffect(() => {
    filterCompanies();
  }, [companies, searchQuery, showNetworkOnly]);

  const fetchAllCompanies = async () => {
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
        
        // Create set of network company IDs for quick lookup
        if (followingIds.length > 0) {
          const { data: networkCompanies } = await supabase
            .from('market_companies')
            .select('id')
            .in('owner_user_id', followingIds);
          
          setNetworkCompanyIds(new Set(networkCompanies?.map(c => c.id) || []));
        }
      }

      // Get ALL active public companies with owner info
      const { data: companiesData } = await supabase
        .from('market_companies')
        .select(`
          *,
          owner:owner_user_id (
            id,
            name,
            avatar
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (!companiesData) {
        setCompanies([]);
        setLoading(false);
        return;
      }

      // Get offering count for each company
      const companiesWithCounts = await Promise.all(
        companiesData.map(async (company) => {
          const { count } = await supabase
            .from('market_offerings')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .eq('is_public', true)
            .eq('is_active', true);

          const isFromNetwork = followingIds.includes(company.owner_user_id);

          return {
            id: company.id,
            name: company.name,
            slug: company.slug,
            tagline: company.tagline,
            logo_url: company.logo_url,
            location: company.location,
            industry: company.industry,
            stage: company.stage,
            offering_count: count || 0,
            owner_user_id: company.owner_user_id,
            owner_name: company.owner?.name,
            owner_avatar: company.owner?.avatar,
            is_from_network: isFromNetwork,
          };
        })
      );

      setCompanies(companiesWithCounts);
    } catch (error) {
      console.error('Error fetching all companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCompanies = () => {
    let filtered = [...companies];

    // Filter by network if enabled
    if (showNetworkOnly) {
      filtered = filtered.filter(c => c.is_from_network);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.tagline?.toLowerCase().includes(query) ||
          c.industry?.toLowerCase().includes(query) ||
          c.location?.toLowerCase().includes(query) ||
          c.owner_name?.toLowerCase().includes(query)
      );
    }

    setFilteredCompanies(filtered);
  };

  const networkCompaniesCount = companies.filter(c => c.is_from_network).length;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading all companies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Markets', href: '/markets' },
          { label: 'All Companies' },
        ]}
        icon={Building2}
        iconBg="bg-indigo-100"
        iconColor="text-indigo-600"
        title="All Companies"
        description="Discover organizations building innovative solutions"
      />

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search companies by name, industry, location, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Network Filter Toggle */}
          {profile && networkCompaniesCount > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button
                variant={showNetworkOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowNetworkOnly(!showNetworkOnly)}
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                From My Network ({networkCompaniesCount})
              </Button>
              {showNetworkOnly && (
                <span className="text-xs text-gray-500">
                  Showing companies from people you follow
                </span>
              )}
            </div>
          )}

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredCompanies.length} of {companies.length} companies
          </div>
        </CardContent>
      </Card>

      {/* Companies Grid */}
      {filteredCompanies.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-gray-100 rounded-full p-6">
              <Building2 className="w-16 h-16 text-gray-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery ? 'No companies found' : 'No companies yet'}
              </h3>
              <p className="text-gray-600">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Be the first to create a company profile!'}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              All Companies ({filteredCompanies.length})
            </h2>
            <p className="text-sm text-gray-600">
              Organizations from our innovation community
            </p>
          </div>

          {/* COMPANY CARDS - This is what a company looks like */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}