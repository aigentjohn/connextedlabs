import { Link } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Users, ArrowRight } from 'lucide-react';

interface Circle {
  id: string;
  name: string;
  description: string;
  slug: string;
  member_ids: string[];
  image?: string;
  access_type?: string;
}

interface JourneyCircleSectionProps {
  circle: Circle | null;
  compact?: boolean;
}

export function JourneyCircleSection({ circle, compact = false }: JourneyCircleSectionProps) {
  if (!circle) {
    return (
      <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
        <div className="text-sm text-gray-500 text-center">
          ⚠️ No circle assigned to this journey
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Users className="w-4 h-4" />
        Group Circle
      </div>
      
      <Link to={`/circles/${circle.slug || circle.id}`}>
        <Card className="border-2 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {/* Circle Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                {circle.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              
              {/* Circle Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm group-hover:text-blue-600 transition-colors">
                  {circle.name}
                </div>
                {!compact && circle.description && (
                  <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                    {circle.description}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {circle.member_ids?.length || 0} members
                  </Badge>
                  {circle.access_type && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {circle.access_type}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Arrow Icon */}
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}