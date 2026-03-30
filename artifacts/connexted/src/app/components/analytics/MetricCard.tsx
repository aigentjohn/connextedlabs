import { Card, CardContent } from '@/app/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  subtitle?: string;
}

export default function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-blue-600 bg-blue-50',
  description,
  trend,
  subtitle,
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="w-4 h-4" />;
    if (trend.value < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-green-600 bg-green-50';
    if (trend.value < 0) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${iconColor}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        
        {description && (
          <p className="text-sm text-gray-600 mt-2">{description}</p>
        )}
        
        {trend && (
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline" className={`${getTrendColor()} border-0`}>
              <span className="flex items-center gap-1">
                {getTrendIcon()}
                <span className="text-xs font-medium">
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                </span>
              </span>
            </Badge>
            <span className="text-xs text-gray-500">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
