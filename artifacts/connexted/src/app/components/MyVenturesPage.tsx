import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { checkMarketAccess, getTierPermissions, formatTierLimits } from '@/lib/tier-permissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Building2, Plus, Lock, TrendingUp, Package, AlertCircle, ExternalLink, Settings, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import CompanyCard from '@/app/components/markets/CompanyCard';

interface Company {
  id: string;
  name: string;
  tagline: string;
  logo_url: string;
  industry: string;
  stage: string;
  created_at: string;
  offering_count?: number;
}

// Helper function to format tier limits - now uses the module version
// (kept local getUpgradeMessage for backwards compat with custom messaging)
function getUpgradeMessage(tier: string): string {
  if (tier === 'free') {
    return 'Upgrade your membership tier to create a company and showcase your offerings.';
  }
  return 'Your current tier does not allow creating companies. Please upgrade to access this feature.';
}

export default function MyVenturesPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [marketAccess, setMarketAccess] = useState<any>(null);
  const [tierPermissions, setTierPermissions] = useState<any>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Check user's tier permissions
      const access = await checkMarketAccess(profile.id);
      setMarketAccess(access);

      // Get detailed tier permissions for display
      const tierName = profile.membership_tier || 'free';
      const permissions = await getTierPermissions(tierName);
      setTierPermissions(permissions);

      // Fetch companies owned by user
      const { data: companiesData, error: companiesError } = await supabase
        .from('market_companies')
        .select('*')
        .eq('owner_user_id', profile.id)
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;

      // Fetch offering counts for each company
      if (companiesData && companiesData.length > 0) {
        const companyIds = companiesData.map(c => c.id);
        const { data: offeringsData } = await supabase
          .from('market_offerings')
          .select('id, company_id')
          .in('company_id', companyIds);

        const offeringCounts: { [key: string]: number } = {};
        offeringsData?.forEach(o => {
          offeringCounts[o.company_id] = (offeringCounts[o.company_id] || 0) + 1;
        });

        const enrichedCompanies = companiesData.map(c => ({
          ...c,
          offering_count: offeringCounts[c.id] || 0
        }));

        setCompanies(enrichedCompanies);
      } else {
        setCompanies([]);
      }
    } catch (error) {
      console.error('Error fetching ventures data:', error);
      toast.error('Failed to load your ventures');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = () => {
    if (!marketAccess?.canCreateCompany) {
      toast.error('You cannot create a company with your current membership tier');
      return;
    }

    navigate('/markets/create-company');
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500">Loading your ventures...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User cannot create companies at all
  if (!marketAccess?.canCreateCompany && companies.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Markets', href: '/markets' },
            { label: 'My Ventures', href: '/my-ventures' }
          ]}
        />

        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Ventures</h1>
          <p className="text-gray-600">Manage your companies and market offerings</p>
        </div>

        {/* Upgrade CTA */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Lock className="w-8 h-8 text-amber-600" />
              <div>
                <CardTitle className="text-amber-900">Upgrade Required</CardTitle>
                <CardDescription className="text-amber-700">
                  Your current tier: <strong>{tierPermissions?.tier_name || 'Free'}</strong>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-amber-800">
              {getUpgradeMessage(profile?.membership_tier || 'free')}
            </p>
            <div className="flex gap-3">
              <Button variant="default" className="bg-amber-600 hover:bg-amber-700">
                Upgrade Membership
              </Button>
              <Button variant="outline" onClick={() => navigate('/markets')}>
                Browse Markets
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* What You Can Do */}
        <Card>
          <CardHeader>
            <CardTitle>What you can do as a {tierPermissions?.tier_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Browse all markets and discover offerings
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Inquire about products and services
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Connect with innovators
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Markets', href: '/markets' },
          { label: 'My Ventures', href: '/my-ventures' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Ventures</h1>
          <p className="text-gray-600">Manage your companies and market offerings</p>
        </div>
        {marketAccess?.canCreateCompany && (
          <Button onClick={handleCreateCompany} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Company
          </Button>
        )}
      </div>

      {/* Tier Status Card */}
      <Card className="border-indigo-200 bg-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-indigo-600" />
              <div>
                <CardTitle className="text-indigo-900">
                  {tierPermissions?.tier_name} Tier
                </CardTitle>
                <CardDescription className="text-indigo-700">
                  {tierPermissions ? formatTierLimits(tierPermissions, marketAccess?.accessibleMarketNames) : ''}
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Upgrade
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Companies</p>
              <p className="text-2xl font-bold text-indigo-900">
                {marketAccess?.currentCompanyCount} / {marketAccess?.maxCompanies === -1 ? '∞' : marketAccess?.maxCompanies}
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Offerings</p>
              <p className="text-2xl font-bold text-indigo-900">
                {marketAccess?.currentOfferingCount} / {marketAccess?.maxOfferingsPerCompany === -1 ? '∞' : marketAccess?.maxOfferingsPerCompany}
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Market Access</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {marketAccess?.accessibleMarketNames && marketAccess.accessibleMarketNames.length > 0 ? (
                  marketAccess.accessibleMarketNames.map((name: string) => (
                    <Badge key={name} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-gray-500 italic">None</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blockers (if any) */}
      {marketAccess?.blockers && marketAccess.blockers.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                {marketAccess.blockers.map((blocker: string, index: number) => (
                  <p key={index} className="text-sm text-amber-800">{blocker}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Companies List */}
      {companies.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No companies yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first company to start showcasing your products and services
            </p>
            {marketAccess?.canCreateCompany && (
              <Button onClick={handleCreateCompany} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Company
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start" onClick={() => navigate('/markets')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Browse All Markets
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => navigate('/markets/all-offerings')}>
              <Package className="w-4 h-4 mr-2" />
              View All Offerings
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => navigate('/markets/all-companies')}>
              <Building2 className="w-4 h-4 mr-2" />
              Explore Companies
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}