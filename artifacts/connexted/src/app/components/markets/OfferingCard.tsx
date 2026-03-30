import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { 
  Package, 
  ExternalLink, 
  ArrowRight, 
  Microscope, 
  Rocket, 
  Store,
  Building2,
  User,
  DollarSign,
  Clock,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface OfferingCardProps {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  logo_url?: string;
  offering_type: 'product' | 'service';
  pricing_model?: 'free' | 'freemium' | 'paid' | 'contact';
  market_types?: ('discovery' | 'launch' | 'marketplace')[];
  company?: {
    name: string;
    slug: string;
    logo_url?: string;
  };
  owner?: {
    name: string;
    avatar?: string;
  };
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  onClick?: () => void;
}

export function OfferingCard({
  id,
  name,
  slug,
  tagline,
  logo_url,
  offering_type,
  pricing_model,
  market_types = [],
  company,
  owner,
  className,
  variant = 'default',
  onClick,
}: OfferingCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/markets/offerings/${slug}`);
    }
  };

  const getMarketBadge = (marketType: string) => {
    switch (marketType) {
      case 'discovery':
        return { icon: Microscope, label: 'Discovery Lab', color: 'bg-purple-100 text-purple-700' };
      case 'launch':
        return { icon: Rocket, label: 'Launch Pad', color: 'bg-blue-100 text-blue-700' };
      case 'marketplace':
        return { icon: Store, label: 'Marketplace', color: 'bg-green-100 text-green-700' };
      default:
        return null;
    }
  };

  const getPricingBadge = (pricing: string) => {
    switch (pricing) {
      case 'free':
        return { label: 'Free', color: 'bg-green-100 text-green-700' };
      case 'freemium':
        return { label: 'Freemium', color: 'bg-blue-100 text-blue-700' };
      case 'paid':
        return { label: 'Paid', color: 'bg-orange-100 text-orange-700' };
      case 'contact':
        return { label: 'Contact for Pricing', color: 'bg-gray-100 text-gray-700' };
      default:
        return null;
    }
  };

  // Compact variant - minimal info (for lists)
  if (variant === 'compact') {
    return (
      <Card
        className={cn(
          'hover:shadow-md transition-all cursor-pointer border hover:border-indigo-300',
          className
        )}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Logo */}
            {logo_url ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <img src={logo_url} alt={name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                <Package className="w-6 h-6" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{name}</h3>
              {tagline && (
                <p className="text-xs text-gray-600 line-clamp-1">{tagline}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {company ? (
                  <span className="text-xs text-gray-500">by {company.name}</span>
                ) : owner ? (
                  <span className="text-xs text-gray-500">by {owner.name}</span>
                ) : null}
              </div>
            </div>

            {/* Arrow */}
            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Detailed variant - full info with rich metadata
  if (variant === 'detailed') {
    return (
      <Card
        className={cn(
          'hover:shadow-lg transition-all cursor-pointer border-2 hover:border-indigo-200',
          className
        )}
        onClick={handleClick}
      >
        <CardContent className="p-6 space-y-4">
          {/* Header with Logo */}
          <div className="flex items-start gap-4">
            {logo_url ? (
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                <img src={logo_url} alt={name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                <Package className="w-10 h-10" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold mb-1">{name}</h3>
              {tagline && (
                <p className="text-sm text-gray-600 line-clamp-2">{tagline}</p>
              )}
            </div>
          </div>

          {/* Market Placement Badges */}
          {market_types.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {market_types.map((marketType) => {
                const badge = getMarketBadge(marketType);
                if (!badge) return null;
                const Icon = badge.icon;
                return (
                  <Badge key={marketType} className={cn('text-xs font-medium', badge.color)}>
                    <Icon className="w-3 h-3 mr-1" />
                    {badge.label}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">
              {offering_type}
            </Badge>
            {pricing_model && (() => {
              const pricingBadge = getPricingBadge(pricing_model);
              return pricingBadge ? (
                <Badge className={cn('text-xs', pricingBadge.color)}>
                  {pricingBadge.label}
                </Badge>
              ) : null;
            })()}
          </div>

          {/* Company/Owner Info */}
          <div className="pt-2 border-t">
            {company ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span>by <span className="font-medium text-gray-900">{company.name}</span></span>
              </div>
            ) : owner ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4 text-gray-400" />
                <span>by <span className="font-medium text-gray-900">{owner.name}</span></span>
              </div>
            ) : null}
          </div>

          {/* CTA */}
          <Button variant="outline" size="sm" className="w-full">
            View Details
            <ExternalLink className="w-3 h-3 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Default variant - balanced (most common use case)
  return (
    <Card
      className={cn(
        'hover:shadow-lg transition-all cursor-pointer border hover:border-indigo-200',
        className
      )}
      onClick={handleClick}
    >
      <CardContent className="p-5 space-y-4">
        {/* Logo */}
        <div className="flex items-start justify-between">
          {logo_url ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img src={logo_url} alt={name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
              <Package className="w-8 h-8" />
            </div>
          )}

          {/* Market badge (primary) */}
          {market_types.length > 0 && (() => {
            const primaryMarket = market_types[0];
            const badge = getMarketBadge(primaryMarket);
            if (!badge) return null;
            const Icon = badge.icon;
            return (
              <Badge className={cn('text-xs', badge.color)}>
                <Icon className="w-3 h-3 mr-1" />
                {badge.label}
              </Badge>
            );
          })()}
        </div>

        {/* Title and Description */}
        <div>
          <h3 className="font-bold text-lg mb-1">{name}</h3>
          {tagline && (
            <p className="text-sm text-gray-600 line-clamp-2">{tagline}</p>
          )}
        </div>

        {/* Meta Badges */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize text-xs">
            {offering_type}
          </Badge>
          {pricing_model && (() => {
            const pricingBadge = getPricingBadge(pricing_model);
            return pricingBadge ? (
              <Badge className={cn('text-xs', pricingBadge.color)}>
                {pricingBadge.label}
              </Badge>
            ) : null;
          })()}
        </div>

        {/* Footer - Company/Owner */}
        <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t">
          {company ? (
            <div className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span>{company.name}</span>
            </div>
          ) : owner ? (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{owner.name}</span>
            </div>
          ) : (
            <span></span>
          )}
          
          <Button variant="ghost" size="sm" className="h-auto p-0 text-indigo-600 hover:text-indigo-700">
            Learn More
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
