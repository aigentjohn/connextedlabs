/**
 * ProfileHeaderCard Component
 * 
 * The always-visible top card showing avatar, name, headline,
 * role badge, tier badge, join date, badges, connection stats, and bio.
 * 
 * Update frequency: Tier 1 (static identity) - changes monthly or less.
 */

import { Link } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { TierBadge } from '@/app/components/profile/TierBadge';
import { BadgeDisplay } from '@/app/components/badges';
import {
  Edit2,
  Calendar,
  Users,
  Zap,
  Briefcase,
} from 'lucide-react';
import { formatRole } from '@/lib/user-class-utils';

interface ProfileHeaderCardProps {
  profile: any;
  bio: string;
  followersCount: number;
  followingCount: number;
  userBadges: any[];
  onNavigateHome: () => void;
  onScrollToMembership: () => void;
}

export function ProfileHeaderCard({
  profile,
  bio,
  followersCount,
  followingCount,
  userBadges,
  onNavigateHome,
  onScrollToMembership,
}: ProfileHeaderCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-6">
          {/* Avatar */}
          <Avatar className="w-24 h-24">
            <AvatarImage src={profile.avatar || undefined} />
            <AvatarFallback className="text-2xl">{profile.name.charAt(0)}</AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-3xl font-bold">{profile.name}</h1>
                {profile.headline && (
                  <p className="text-lg text-gray-600 mt-1">{profile.headline}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onNavigateHome}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Go to My Home
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-4">
              <Badge variant="outline" className="capitalize">
                {formatRole(profile.role)}
              </Badge>
              <TierBadge
                tier={profile.membership_tier}
                userClass={(profile as any).user_class || 1}
                onClick={onScrollToMembership}
              />
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Joined {new Date(profile.created_at).toLocaleDateString()}
              </div>
            </div>

            {/* Earned Badges Inline */}
            {userBadges.length > 0 && (
              <div className="mb-3">
                <Link to="/profile/badges" className="group">
                  <BadgeDisplay badges={userBadges} maxDisplay={6} size="sm" showIssuer={false} />
                  <span className="text-xs text-gray-500 group-hover:text-indigo-600 mt-1 inline-block">
                    {userBadges.length} badge{userBadges.length !== 1 ? 's' : ''} earned
                  </span>
                </Link>
              </div>
            )}

            {/* Connection Stats */}
            <div className="flex items-center gap-4 mb-4">
              <Link
                to="/profile/followers"
                className="flex items-center gap-2 text-sm hover:text-indigo-600 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>
                  <strong className="font-semibold">{followersCount}</strong> Followers
                </span>
              </Link>
              <Link
                to="/profile/following"
                className="flex items-center gap-2 text-sm hover:text-indigo-600 transition-colors"
              >
                <strong className="font-semibold">{followingCount}</strong> Following
              </Link>
              <Link
                to={`/moments/${profile.id}`}
                className="flex items-center gap-2 text-sm hover:text-indigo-600 transition-colors"
              >
                <Zap className="w-4 h-4" />
                My Moments
              </Link>
              <Link
                to={`/portfolio/${profile.id}`}
                className="flex items-center gap-2 text-sm hover:text-indigo-600 transition-colors"
              >
                <Briefcase className="w-4 h-4" />
                My Portfolio
              </Link>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <p className="text-gray-700">
                {bio || 'No bio yet. Click "Edit Profile" to add one!'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}