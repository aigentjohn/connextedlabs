import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Search, Users, Building2, AlertCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { PageHeader } from '@/app/components/shared/PageHeader';
import CompanyCard from '@/app/components/markets/CompanyCard';
import { Link } from 'react-router';

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

export default function NetworkCompaniesPage() {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (profile?.id) {
      fetchNetworkCompanies();
    }
  }, [profile?.id]);

  useEffect(() => {
    filterCompanies();
  }, [companies, searchQuery]);

  const fetchNetworkCompanies = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Get user's following list
      const { data: connectionsData } = await supabase
        .from('user_connections')
        .select('following_id')
        .eq('follower_id', profile.id);

      const followingIds = connectionsData?.map(c => c.following_id) || [];
      setFollowingCount(followingIds.length);

      if (followingIds.length === 0) {
        setCompanies([]);
        setLoading(false);
        return;
      }

      // Get companies owned by people in the user's network
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
        .in('owner_user_id', followingIds)
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
            is_from_network: true,
          };
        })
      );

      setCompanies(companiesWithCounts);
    } catch (error) {
      console.error('Error fetching network companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCompanies = () => {
    let filtered = [...companies];

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

  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: 'Markets', href: '/markets' },
            { label: 'Network Companies' },
          ]}
          icon={Users}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          title="Network Companies"
          description="Sign in to see companies from your network"
        />
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-blue-100 rounded-full p-6">
              <AlertCircle className="w-16 h-16 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Sign In Required</h3>
              <p className="text-gray-600">
                Please sign in to see companies from your network.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading network companies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Markets', href: '/markets' },
          { label: 'Network Companies' },
        ]}
        icon={Users}
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
        title="Network Companies"
        description="Discover companies founded by people you follow"
      />

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search network companies by name, industry, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Results count */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredCompanies.length} of {companies.length} companies from {followingCount} people you follow
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies Grid */}
      {companies.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-gray-100 rounded-full p-6">
              <Building2 className="w-16 h-16 text-gray-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                No Companies from Your Network Yet
              </h3>
              <p className="text-gray-600 mb-4">
                {followingCount === 0
                  ? "You're not following anyone yet. Start connecting with innovators!"
                  : "None of the people you follow have created companies yet."}
              </p>
              <div className="flex gap-3 justify-center">
                {followingCount === 0 && (
                  <Button asChild>
                    <Link to="/members">Discover Members</Link>
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <Link to="/markets/all-companies">Browse All Companies</Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : filteredCompanies.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-gray-100 rounded-full p-6">
              <Search className="w-16 h-16 text-gray-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
              <p className="text-gray-600">
                Try adjusting your search to find companies from your network
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Companies from Your Network ({filteredCompanies.length})
            </h2>
            <p className="text-sm text-gray-600">
              Founded by {followingCount} people you follow
            </p>
          </div>

          {/* COMPANY CARDS */}
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