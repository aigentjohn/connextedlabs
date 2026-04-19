import { Badge } from '@/app/components/ui/badge';
import { Globe, Users, Star, Lock } from 'lucide-react';
import type { Visibility } from '@/app/components/unified/PrivacySelector';

interface VisibilityBadgeProps {
  visibility: Visibility | string;
  size?: 'sm' | 'md' | 'lg';
}

export function VisibilityBadge({ visibility, size = 'md' }: VisibilityBadgeProps) {
  const config: Record<string, { icon: typeof Globe; label: string; color: string }> = {
    public: {
      icon: Globe,
      label: 'Public',
      color: 'bg-green-100 text-green-800 border-green-300',
    },
    member: {
      icon: Users,
      label: 'Members Only',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    premium: {
      icon: Star,
      label: 'Course & Program',
      color: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    private: {
      icon: Lock,
      label: 'Private',
      color: 'bg-red-100 text-red-800 border-red-300',
    },
  };

  const selectedConfig = config[visibility] ?? config.private;
  const { icon: Icon, label, color } = selectedConfig;
  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <Badge variant="outline" className={`flex items-center gap-1 ${color}`}>
      <Icon className={iconSize} />
      <span className={textSize}>{label}</span>
    </Badge>
  );
}
