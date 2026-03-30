import { MemberState } from '@/lib/participant-states';
import * as LucideIcons from 'lucide-react';

interface StateBadgeProps {
  state: MemberState | { id: string; name: string; color: string; icon?: string };
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200'
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5'
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
};

export function StateBadge({ state, size = 'md', showIcon = true }: StateBadgeProps) {
  const colorClass = colorClasses[state.color as keyof typeof colorClasses] || colorClasses.gray;
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];
  
  // Get the icon component
  const IconComponent = state.icon 
    ? (LucideIcons as any)[state.icon.split('-').map((w: string, i: number) => 
        i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1)
      ).join('')] 
    : null;
  
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${colorClass} ${sizeClass}`}>
      {showIcon && IconComponent && <IconComponent className={iconSize} />}
      {state.name}
    </span>
  );
}
