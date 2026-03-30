/**
 * Badge Display Component
 * 
 * Displays badges on user or company profiles.
 */

import React from 'react';
import { type UserBadge, type CompanyBadge } from '@/services/badgeService';
import { Award, CheckCircle, Star, Shield, Trophy, Users } from 'lucide-react';

interface BadgeDisplayProps {
  badges: (UserBadge | CompanyBadge)[];
  maxDisplay?: number;
  showIssuer?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function BadgeDisplay({ 
  badges, 
  maxDisplay, 
  showIssuer = true,
  size = 'md' 
}: BadgeDisplayProps) {
  const displayBadges = maxDisplay ? badges.slice(0, maxDisplay) : badges;
  const remainingCount = maxDisplay && badges.length > maxDisplay 
    ? badges.length - maxDisplay 
    : 0;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  function getBadgeIcon(category: string) {
    const iconSize = iconSizes[size];
    
    switch (category) {
      case 'completion':
        return <CheckCircle size={iconSize} />;
      case 'endorsement':
        return <Star size={iconSize} />;
      case 'skill':
        return <Trophy size={iconSize} />;
      case 'verification':
        return <Shield size={iconSize} />;
      case 'achievement':
        return <Award size={iconSize} />;
      case 'membership':
        return <Users size={iconSize} />;
      default:
        return <Award size={iconSize} />;
    }
  }

  if (badges.length === 0) {
    return (
      <div className="text-gray-500 text-sm">
        No badges yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {displayBadges.map((badge) => (
          <div
            key={badge.id}
            className="group relative"
            title={badge.badge_type?.name}
          >
            {/* Badge Icon */}
            <div
              className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-110`}
              style={{ backgroundColor: badge.badge_type?.badge_color || '#3B82F6' }}
            >
              {badge.badge_type?.badge_image_url ? (
                <img
                  src={badge.badge_type.badge_image_url}
                  alt={badge.badge_type.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getBadgeIcon(badge.badge_type?.category || 'achievement')
              )}
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-gray-900 text-white text-sm rounded-lg py-2 px-3 whitespace-nowrap">
                <div className="font-semibold">{badge.badge_type?.name}</div>
                {badge.badge_type?.description && (
                  <div className="text-xs text-gray-300 mt-1">
                    {badge.badge_type.description}
                  </div>
                )}
                {showIssuer && badge.issuer && (
                  <div className="text-xs text-gray-400 mt-1">
                    Issued by {badge.issuer.full_name}
                  </div>
                )}
                {showIssuer && badge.issued_by_system && (
                  <div className="text-xs text-gray-400 mt-1">
                    Issued by CONNEXTED
                  </div>
                )}
                {/* Arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                  <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-900"></div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Show remaining count */}
        {remainingCount > 0 && (
          <div
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center bg-gray-200 text-gray-600 font-semibold`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Detailed Badge Card
 */
interface BadgeCardProps {
  badge: UserBadge | CompanyBadge;
  showRecipient?: boolean;
}

export function BadgeCard({ badge, showRecipient = false }: BadgeCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Badge Icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-md flex-shrink-0"
          style={{ backgroundColor: badge.badge_type?.badge_color || '#3B82F6' }}
        >
          {badge.badge_type?.badge_image_url ? (
            <img
              src={badge.badge_type.badge_image_url}
              alt={badge.badge_type.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <Award size={28} />
          )}
        </div>

        {/* Badge Details */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg">{badge.badge_type?.name}</h3>
          
          {badge.badge_type?.description && (
            <p className="text-sm text-gray-600 mt-1">
              {badge.badge_type.description}
            </p>
          )}

          <div className="mt-2 space-y-1">
            {badge.issuer && (
              <div className="text-sm text-gray-500">
                Issued by <span className="font-medium">{badge.issuer.full_name}</span>
              </div>
            )}
            {badge.issued_by_system && (
              <div className="text-sm text-gray-500">
                Issued by <span className="font-medium">CONNEXTED</span>
              </div>
            )}
            
            {'created_at' in badge && (
              <div className="text-xs text-gray-400">
                {new Date(badge.created_at).toLocaleDateString()}
              </div>
            )}
            {'issued_at' in badge && (
              <div className="text-xs text-gray-400">
                {new Date(badge.issued_at).toLocaleDateString()}
              </div>
            )}
          </div>

          {badge.issuer_message && (
            <div className="mt-3 p-3 bg-gray-50 rounded text-sm italic">
              "{badge.issuer_message}"
            </div>
          )}

          {badge.evidence_url && (
            <div className="mt-2">
              <a
                href={badge.evidence_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View Evidence →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Badge List with Categories
 */
interface BadgeListProps {
  badges: (UserBadge | CompanyBadge)[];
  groupByCategory?: boolean;
}

export function BadgeList({ badges, groupByCategory = true }: BadgeListProps) {
  if (!groupByCategory) {
    return (
      <div className="space-y-3">
        {badges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>
    );
  }

  // Group by category
  const grouped = badges.reduce((acc, badge) => {
    const category = badge.badge_type?.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(badge);
    return acc;
  }, {} as Record<string, (UserBadge | CompanyBadge)[]>);

  const categoryLabels: Record<string, string> = {
    completion: 'Completion Badges',
    endorsement: 'Endorsements',
    skill: 'Skills',
    verification: 'Verifications',
    achievement: 'Achievements',
    membership: 'Membership',
  };

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, categoryBadges]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-3">
            {categoryLabels[category] || category}
          </h3>
          <div className="space-y-3">
            {categoryBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
