import { Card, CardContent } from '@/app/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface StatsCardProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  value?: number;
  subtitle?: string;
  primaryValue?: number;
  primaryLabel?: string;
  secondaryValue?: number;
  secondaryLabel?: string;
  linkTo?: string;
  children?: React.ReactNode;
}

export function StatsCard({ 
  icon: Icon, 
  iconColor = 'text-indigo-600',
  title, 
  value, 
  subtitle,
  primaryValue,
  primaryLabel,
  secondaryValue,
  secondaryLabel,
  children
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <Icon className={cn('w-8 h-8', iconColor)} />
        </div>
        {value !== undefined ? (
          <>
            <div className={cn('text-3xl font-bold', iconColor.replace('text-', 'text-'))}>
              {value}
            </div>
            <div className="text-sm text-gray-600 mt-1">{title}</div>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </>
        ) : (
          <>
            <div className="space-y-1">
              {primaryValue !== undefined && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold">{primaryValue}</span>
                  {primaryLabel && <span className="text-xs text-gray-600">{primaryLabel}</span>}
                </div>
              )}
              {secondaryValue !== undefined && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold">{secondaryValue}</span>
                  {secondaryLabel && <span className="text-xs text-gray-600">{secondaryLabel}</span>}
                </div>
              )}
            </div>
            <div className="text-sm text-gray-600 mt-2">{title}</div>
          </>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
