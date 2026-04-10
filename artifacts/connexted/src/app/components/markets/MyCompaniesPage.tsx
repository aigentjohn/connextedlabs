import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { Building2, LayoutGrid, ExternalLink, Users } from 'lucide-react';

interface AssociatedCompany {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  logo_url: string | null;
  industry: string | null;
  owner_user_id: string;
  isOwner: boolean;
  companion_count: number;
}

export default function MyCompaniesPage() {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<AssociatedCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) fetchCompanies();
  }, [profile?.id]);

  async function fetchCompanies() {
    if (!profile?.id) return;
    try {
      setLoading(true);

      // Owned companies
      const { data: owned } = await supabase
        .from('market_companies')
        .select('id, name, slug, tagline, logo_url, industry, owner_user_id')
        .eq('owner_user_id', profile.id)
        .order('name');

      // Member company_ids
      const { data: memberships, error: memberError } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', profile.id);

      if (memberError) throw memberError;

      const memberIds = (memberships || []).map((m: any) => m.company_id);
      const ownedIds = new Set((owned || []).map((c: any) => c.id));

      // Fetch member companies that are not already owned
      const nonOwnedMemberIds = memberIds.filter((id: string) => !ownedIds.has(id));
      let memberCompanies: any[] = [];
      if (nonOwnedMemberIds.length > 0) {
        const { data: memberData } = await supabase
          .from('market_companies')
          .select('id, name, slug, tagline, logo_url, industry, owner_user_id')
          .in('id', nonOwnedMemberIds)
          .order('name');
        memberCompanies = memberData || [];
      }

      // Combine: owned first, then member
      const allCompanies = [
        ...(owned || []).map((c: any) => ({ ...c, isOwner: true })),
        ...memberCompanies.map((c: any) => ({ ...c, isOwner: false })),
      ];

      if (allCompanies.length === 0) {
        setCompanies([]);
        return;
      }

      // Companion item counts
      const allIds = allCompanies.map(c => c.id);
      const { data: items } = await supabase
        .from('company_companion_items')
        .select('company_id')
        .in('company_id', allIds);

      const counts: Record<string, number> = {};
      (items || []).forEach((i: any) => {
        counts[i.company_id] = (counts[i.company_id] || 0) + 1;
      });

      setCompanies(allCompanies.map(c => ({ ...c, companion_count: counts[c.id] || 0 })));
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'My Business', href: '/my-ventures' },
          { label: 'My Companies' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Companies</h1>
          <p className="text-gray-500 mt-1">All companies you own or are a member of</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/markets/all-companies">
            <Building2 className="w-4 h-4 mr-2" />
            Browse All
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No companies yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Create a venture or ask a company owner to add you as a member.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companies.map(company => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12 shrink-0">
                    <AvatarImage src={company.logo_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-blue-600 text-white font-semibold">
                      {company.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                      <Badge
                        variant={company.isOwner ? 'default' : 'secondary'}
                        className={`text-xs shrink-0 ${company.isOwner ? 'bg-indigo-600 text-white' : ''}`}
                      >
                        {company.isOwner ? 'Owner' : 'Member'}
                      </Badge>
                    </div>
                    {company.tagline && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{company.tagline}</p>
                    )}
                    {company.industry && (
                      <p className="text-xs text-gray-400 mt-0.5">{company.industry}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to={`/markets/companies/${company.slug}`}>
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Profile
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to={`/markets/companies/${company.slug}/companion`}>
                      <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                      Companion
                      {company.companion_count > 0 && (
                        <span className="ml-1 text-xs text-gray-400">({company.companion_count})</span>
                      )}
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/markets/edit-company/${company.id}`}>
                      Manage
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
