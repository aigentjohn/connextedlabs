import React from 'react';
import { Heart, Bookmark, Star, Share2, Eye } from 'lucide-react';

interface EngagementStatsProps {
  likesCount?: number;
  favoritesCount?: number;
  avgRating?: number;
  ratingsCount?: number;
  sharesCount?: number;
  viewsCount?: number;
  layout?: 'horizontal' | 'vertical' | 'compact';
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function EngagementStats({
  likesCount = 0,
  favoritesCount = 0,
  avgRating = 0,
  ratingsCount = 0,
  sharesCount = 0,
  viewsCount = 0,
  layout = 'horizontal',
  showLabels = true,
  size = 'md'
}: EngagementStatsProps) {
  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const iconSize = iconSizes[size];
  const textSize = textSizes[size];

  const stats = [
    {
      icon: Heart,
      count: likesCount,
      label: 'Likes',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      show: likesCount > 0 || layout !== 'compact'
    },
    {
      icon: Bookmark,
      count: favoritesCount,
      label: 'Saved',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      show: favoritesCount > 0 || layout !== 'compact'
    },
    {
      icon: Star,
      count: avgRating > 0 ? `${avgRating.toFixed(1)} (${ratingsCount})` : ratingsCount,
      label: 'Ratings',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      show: (avgRating > 0 || ratingsCount > 0) || layout !== 'compact'
    },
    {
      icon: Share2,
      count: sharesCount,
      label: 'Shares',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      show: sharesCount > 0 || layout !== 'compact'
    },
    {
      icon: Eye,
      count: viewsCount,
      label: 'Views',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      show: viewsCount > 0 || layout !== 'compact'
    }
  ];

  const visibleStats = stats.filter(stat => stat.show);

  if (layout === 'compact') {
    return (
      <div className="flex items-center gap-3 text-gray-600">
        {visibleStats.map((stat, index) => (
          <div key={index} className="flex items-center gap-1">
            <stat.icon size={iconSize} className={stat.color} />
            <span className={`${textSize} font-medium tabular-nums`}>
              {typeof stat.count === 'number' ? stat.count.toLocaleString() : stat.count}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'vertical') {
    return (
      <div className="space-y-2">
        {visibleStats.map((stat, index) => (
          <div key={index} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${stat.bgColor}`}>
            <stat.icon size={iconSize} className={stat.color} />
            <div className="flex-1">
              {showLabels && (
                <div className={`${textSize} text-gray-600`}>{stat.label}</div>
              )}
              <div className={`${textSize} font-semibold tabular-nums text-gray-900`}>
                {typeof stat.count === 'number' ? stat.count.toLocaleString() : stat.count}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Horizontal layout (default)
  return (
    <div className="flex flex-wrap items-center gap-3">
      {visibleStats.map((stat, index) => (
        <div
          key={index}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${stat.bgColor}`}
        >
          <stat.icon size={iconSize} className={stat.color} />
          {showLabels && (
            <span className={`${textSize} text-gray-600`}>{stat.label}:</span>
          )}
          <span className={`${textSize} font-semibold tabular-nums text-gray-900`}>
            {typeof stat.count === 'number' ? stat.count.toLocaleString() : stat.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// Simplified version that shows just counts
export function EngagementCounts({
  likesCount = 0,
  favoritesCount = 0,
  sharesCount = 0,
  commentsCount = 0
}: {
  likesCount?: number;
  favoritesCount?: number;
  sharesCount?: number;
  commentsCount?: number;
}) {
  return (
    <div className="flex items-center gap-4 text-sm text-gray-600">
      {likesCount > 0 && (
        <span className="flex items-center gap-1">
          <Heart size={14} className="text-red-600" />
          {likesCount}
        </span>
      )}
      {favoritesCount > 0 && (
        <span className="flex items-center gap-1">
          <Bookmark size={14} className="text-blue-600" />
          {favoritesCount}
        </span>
      )}
      {sharesCount > 0 && (
        <span className="flex items-center gap-1">
          <Share2 size={14} className="text-green-600" />
          {sharesCount}
        </span>
      )}
      {commentsCount > 0 && (
        <span>{commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}</span>
      )}
    </div>
  );
}
