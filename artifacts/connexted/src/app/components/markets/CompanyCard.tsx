import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { 
  Package, 
  Settings, 
  ChevronDown, 
  ChevronUp, 
  Edit,
  ExternalLink,
  Users
} from 'lucide-react';
import { Separator } from '@/app/components/ui/separator';
import { useCompanyBadges } from '@/hooks/useBadges';
import { BadgeDisplay } from '@/app/components/badges';

interface Company {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  logo_url: string;
  industry: string;
  stage: string;
  created_at: string;
  offering_count?: number;
  owner_user_id?: string;
  owner_name?: string;
  owner_avatar?: string;
  is_from_network?: boolean;
}

interface Offering {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  offering_type: string;
  pricing_model: string;
  is_active: boolean;
}

interface CompanyCardProps {
  company: Company;
}

export default function CompanyCard({ company }: CompanyCardProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(false);
  const { badges: companyBadges } = useCompanyBadges(company.id);

  const isOwnCompany = profile?.id === company.owner_user_id;

  useEffect(() => {
    if (expanded && offerings.length === 0) {
      fetchOfferings();
    }
  }, [expanded]);

  const fetchOfferings = async () => {
    try {
      setLoadingOfferings(true);
      const { data, error } = await supabase
        .from('market_offerings')
        .select('id, name, slug, tagline, offering_type, pricing_model, is_active')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOfferings(data || []);
    } catch (error) {
      console.error('Error fetching offerings:', error);
    } finally {
      setLoadingOfferings(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer" 
            onClick={() => navigate(`/markets/companies/${company.slug}`)}
          >
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                {company.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg hover:text-indigo-600 transition-colors">{company.name}</CardTitle>
                {company.is_from_network && (
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                    <Users className="w-3 h-3" />
                    Network
                  </Badge>
                )}
              </div>
              <CardDescription>{company.tagline}</CardDescription>
            </div>
          </div>
          <Badge variant="outline">{company.stage}</Badge>
        </div>

        {/* Owner Info */}
        {company.owner_name && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={company.owner_avatar || undefined} />
                <AvatarFallback className="text-xs">
                  {company.owner_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-600">
                Founded by <span className="font-medium text-gray-900">{company.owner_name}</span>
              </span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Industry:</span>
          <span className="font-medium">{company.industry}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Offerings:</span>
          <span className="font-medium">{company.offering_count || 0}</span>
        </div>

        {/* Inline badges */}
        {companyBadges.length > 0 && (
          <div className="pt-1">
            <BadgeDisplay badges={companyBadges} maxDisplay={4} size="sm" showIssuer={false} />
          </div>
        )}
        
        {/* Action Buttons - Only show for own companies */}
        {isOwnCompany && (
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate(`/markets/create-offering?companyId=${company.id}`)}
            >
              <Package className="w-4 h-4 mr-2" />
              Add Offering
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate(`/markets/edit-company/${company.id}`)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* View Offerings Toggle */}
        {company.offering_count && company.offering_count > 0 && (
          <>
            <Separator />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() => setExpanded(!expanded)}
            >
              <span className="text-sm font-medium">
                View Offerings ({company.offering_count})
              </span>
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>

            {/* Offerings List */}
            {expanded && (
              <div className="space-y-2 mt-2">
                {loadingOfferings ? (
                  <p className="text-sm text-gray-500 text-center py-2">Loading offerings...</p>
                ) : offerings.length > 0 ? (
                  offerings.map((offering) => (
                    <div
                      key={offering.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {offering.name}
                          </h4>
                          {!offering.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        {offering.tagline && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {offering.tagline}
                          </p>
                        )}
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {offering.offering_type}
                          </Badge>
                          {offering.pricing_model && (
                            <Badge variant="outline" className="text-xs">
                              {offering.pricing_model}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/markets/offerings/${offering.slug}`)}
                          title="View"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/markets/edit-offering/${offering.id}`)}
                          title="Edit"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-2">No offerings yet</p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}