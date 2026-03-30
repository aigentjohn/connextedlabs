import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { 
  Store, ExternalLink, Eye, Settings, Plus, CheckCircle, 
  AlertCircle, TrendingUp, Users, DollarSign 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';

interface Program {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  member_ids: string[];
}

interface MarketOffering {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  offering_type: string;
  is_active: boolean;
  is_featured: boolean;
  linked_program_id: string;
  kit_product_id?: string;
  kit_product_url?: string;
  kit_landing_page_url?: string;
  purchase_type: string;
  cta_text?: string;
  // Pricing fields directly in offering
  base_price?: number;
  final_price?: number;
  discount_percentage?: number;
}

interface MarketPlacement {
  id: string;
  market_id: string;
  offering_id: string;
  is_active: boolean;
  featured: boolean;
  market?: {
    name: string;
    slug: string;
  };
}

interface ProgramOfferingCardProps {
  program: Program;
  onRefresh?: () => void;
  showActions?: boolean;
}

export default function ProgramOfferingCard({ 
  program, 
  onRefresh,
  showActions = true 
}: ProgramOfferingCardProps) {
  const [offering, setOffering] = useState<MarketOffering | null>(null);
  const [placements, setPlacements] = useState<MarketPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasOffering, setHasOffering] = useState(false);

  useEffect(() => {
    fetchOfferingData();
  }, [program.id]);

  const fetchOfferingData = async () => {
    try {
      setLoading(true);

      // Check if this program has a linked market offering
      const { data: offeringData, error: offeringError } = await supabase
        .from('market_offerings')
        .select('*')
        .eq('linked_program_id', program.id)
        .maybeSingle();

      if (offeringError) {
        console.error('Error fetching offering:', offeringError);
        throw offeringError;
      }

      if (offeringData) {
        setOffering(offeringData);
        setHasOffering(true);

        // Fetch market placements for this offering
        const { data: placementsData, error: placementsError } = await supabase
          .from('market_placements')
          .select(`
            *,
            markets(name, slug)
          `)
          .eq('offering_id', offeringData.id);

        if (placementsError) {
          console.error('Error fetching placements:', placementsError);
        }

        setPlacements(placementsData?.map((p: any) => ({
          ...p,
          market: p.markets
        })) || []);
      } else {
        setHasOffering(false);
        setOffering(null);
        setPlacements([]);
      }
    } catch (error: any) {
      console.error('Error fetching offering data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-gray-500">Loading market offering...</p>
        </CardContent>
      </Card>
    );
  }

  if (!hasOffering) {
    return (
      <Card className="border-dashed border-2">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="w-5 h-5 text-gray-400" />
                No Market Offering
              </CardTitle>
              <CardDescription>
                This program is not currently available in the Market
              </CardDescription>
            </div>
            {showActions && (
              <Link to={`/platform-admin/offerings?create=true&program_id=${program.id}`}>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Offering
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            <p className="mb-2">Create a market offering to:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500">
              <li>Make this program discoverable in the Market</li>
              <li>Enable public enrollment via Kit Commerce</li>
              <li>Track conversions and interest</li>
              <li>Feature the program on market landing pages</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50/30">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="w-5 h-5 text-green-600" />
              Market Offering
              {offering?.is_active ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Inactive
                </Badge>
              )}
              {offering?.is_featured && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                  Featured
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {offering?.name}
            </CardDescription>
          </div>
          {showActions && (
            <div className="flex items-center gap-2">
              <Link to={`/markets/offerings/${offering?.slug}`} target="_blank">
                <Button size="sm" variant="ghost">
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
              </Link>
              <Link to={`/platform-admin/offerings?edit=${offering?.id}`}>
                <Button size="sm" variant="outline">
                  <Settings className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Offering Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Type</div>
              <div className="font-medium text-sm capitalize">{offering?.offering_type}</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Purchase</div>
              <div className="font-medium text-sm capitalize">
                {offering?.purchase_type === 'kit_commerce' ? 'Kit Commerce' : offering?.purchase_type}
              </div>
            </div>
            {offering?.base_price && (
              <>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Price</div>
                  <div className="font-medium text-sm">
                    ${offering.final_price}
                    {offering.discount_percentage > 0 && (
                      <span className="text-xs text-gray-500 line-through ml-1">
                        ${offering.base_price}
                      </span>
                    )}
                  </div>
                </div>
                {offering.discount_percentage > 0 && (
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Discount</div>
                    <div className="font-medium text-sm text-green-600">
                      {offering.discount_percentage}% OFF
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Attenders</div>
              <div className="font-medium text-sm flex items-center gap-1">
                <Users className="w-3 h-3" />
                {program.member_ids?.length || 0}
              </div>
            </div>
          </div>

          {/* Tagline */}
          {offering?.tagline && (
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Tagline</div>
              <p className="text-sm text-gray-700">{offering.tagline}</p>
            </div>
          )}

          {/* Market Placements */}
          {placements.length > 0 && (
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-2">Market Placements ({placements.length})</div>
              <div className="flex flex-wrap gap-2">
                {placements.map((placement) => (
                  <Link 
                    key={placement.id}
                    to={`/markets/${placement.market?.slug}`}
                    className="inline-flex items-center gap-1"
                  >
                    <Badge 
                      variant={placement.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer hover:opacity-80"
                    >
                      {placement.market?.name || 'Unknown Market'}
                      {placement.featured && ' ⭐'}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {placements.length === 0 && offering?.is_active && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-800 font-medium">Not Placed in Any Market</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    This offering is active but not visible in any market. Add it to markets to make it discoverable.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex items-center justify-between pt-2 border-t">
              <Link to={`/markets/offerings/${offering?.slug}`} target="_blank">
                <Button variant="link" size="sm" className="text-green-700">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  View in Market
                </Button>
              </Link>
              {offering?.kit_product_id && (
                <a 
                  href={`https://app.kit.com/products/${offering.kit_product_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="link" size="sm" className="text-blue-600">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Kit Commerce Dashboard
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}