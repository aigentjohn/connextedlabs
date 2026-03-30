import { Badge } from '@/app/components/ui/badge';
import { cn } from '@/app/components/ui/utils';
import { 
  User, 
  Users, 
  Crown, 
  Sparkles,
  ChevronRight 
} from 'lucide-react';

interface TierBadgeProps {
  tier: string; // 'free', 'basic', 'pro', 'enterprise'
  userClass: number; // 1-10
  onClick?: () => void;
}

export function TierBadge({ tier, userClass, onClick }: TierBadgeProps) {
  const tierConfig = {
    free: { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: User },
    basic: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Users },
    pro: { color: 'bg-purple-100 text-purple-800 border-purple-300', icon: Crown },
    enterprise: { color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Sparkles },
  };
  
  const normalizedTier = tier.toLowerCase();
  const config = tierConfig[normalizedTier as keyof typeof tierConfig] || tierConfig.free;
  const Icon = config.icon;
  
  return (
    <Badge
      className={cn(
        'capitalize cursor-pointer hover:shadow-md transition-all',
        config.color,
        !onClick && 'cursor-default'
      )}
      onClick={onClick}
    >
      <Icon className="w-3 h-3 mr-1" />
      {tier} Member (Class {userClass})
      {onClick && <ChevronRight className="w-3 h-3 ml-1" />}
    </Badge>
  );
}
