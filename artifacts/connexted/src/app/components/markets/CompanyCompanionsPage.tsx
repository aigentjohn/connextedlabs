import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Skeleton } from '@/app/components/ui/skeleton';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { LayoutGrid, Building2, ArrowRight } from 'lucide-react';

interface CompanyCompanion {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  logo_url: string | null;
  industry: string | null;
  isOwner: boolean;
  itemCount: number;
}

export default function CompanyCompanionsPage() {
  const { profile } = useAuth();
  const [companions, setCompanions] = useState<CompanyCompanion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) fetchCompanions();
  }, [profile?.id]);

  async function fetchCompanions() {
    if (!profile?.id) return;
    try {
      setLoading(true);

      // Companies user owns
      const { data: owned } = await supabase
        .from('market_companies')
        .select('id, name, slug, tagline, logo_url, industry, owner_user_id')
        .eq('owner_user_id', profile.id)
        .order('name');

      // Companies user is a member of — two-step to avoid join RLS issues
      const { data: memberships } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', profile.id);

      const memberIds = (memberships || []).map((m: any) => m.company_id);
      let memberCompanies: any[] = [];
      if (memberIds.length > 0) {
        const { data: memberData } = await supabase
          .from('market_companies')
          .select('id, name, slug, tagline, logo_url, industry, owner_user_id')
          .in('id', memberIds);
        memberCompanies = (memberData || []).filter((c: any) => c.owner_user_id !== profile.id);
      }

      // Merge all companies, tag ownership
      const ownedIds = new Set((owned || []).map((c: any) => c.id));
      const allCompanies = [
        ...(owned || []).map((c: any) => ({ ...c, isOwner: true })),
        ...memberCompanies.map((c: any) => ({ ...c, isOwner: false })),
      ];

      if (allCompanies.length === 0) {
        setCompanions([]);
        return;
      }

      // Fetch companion item counts for all companies
      const ids = allCompanies.map(c => c.id);
      const { data: items } = await supabase
        .from('company_companion_items')
        .select('company_id')
        .in('company_id', ids);

      const counts: Record<string, number> = {};
      (items || []).forEach((i: any) => {
        counts[i.company_id] = (counts[i.company_id] || 0) + 1;
      });

      setCompanions(
        allCompanies.map(c => ({ ...c, itemCount: counts[c.id] || 0 }))
      );
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load company companions');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'My Business', href: '/my-ventures' },
          { label: 'Company Companions' },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Companions</h1>
        <p className="text-gray-500 mt-1">
          Companion pages for your ventures and teams
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : companions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <LayoutGrid className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No company companions yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Create a venture or join a company team to access companion pages.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link to="/my-ventures">My Ventures</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/markets/all-companies">Browse Companies</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companions.map(company => (
            <Link
              key={company.id}
              to={`/markets/companies/${company.slug}/companion`}
              className="block"
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarImage src={company.logo_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-blue-600 text-white font-semibold text-sm">
                        {company.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 line-clamp-1">{company.name}</h3>
                      {company.tagline && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{company.tagline}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={company.isOwner ? 'default' : 'secondary'} className="text-xs">
                        {company.isOwner ? 'Owner' : 'Member'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <LayoutGrid className="w-3 h-3 mr-1" />
                        {company.itemCount} {company.itemCount === 1 ? 'item' : 'items'}
                      </Badge>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>

                  {company.industry && (
                    <p className="text-xs text-gray-400 mt-2">{company.industry}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
