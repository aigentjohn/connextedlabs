import React from 'react';
import { Link } from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export interface UserInfo {
  id?: string;
  name?: string;
  full_name?: string;
  avatar?: string;
  avatar_url?: string;
}

interface UserDisplayProps {
  user: UserInfo | null | undefined;
  fallbackName?: string;
  linkToProfile?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showAvatar?: boolean;
  className?: string;
}

/**
 * UserDisplay - A reusable component for displaying user information
 * Handles deleted/null users gracefully by showing a fallback name
 * 
 * @param user - User object with name/avatar (can be null if user deleted)
 * @param fallbackName - Text to show if user is null (default: "Former Member")
 * @param linkToProfile - Whether to link to user profile (default: true)
 * @param size - Avatar size (default: "sm")
 * @param showAvatar - Whether to show avatar (default: true)
 * @param className - Additional CSS classes
 */
export const UserDisplay: React.FC<UserDisplayProps> = ({
  user,
  fallbackName = 'Former Member',
  linkToProfile = true,
  size = 'sm',
  showAvatar = true,
  className = '',
}) => {
  // Normalize user data (handle both 'name' and 'full_name' fields)
  const displayName = user?.name || user?.full_name || fallbackName;
  const avatarUrl = user?.avatar || user?.avatar_url;
  const userId = user?.id;
  const isDeleted = !user;

  // Avatar size classes
  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const avatarSize = sizeClasses[size];

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      {showAvatar && (
        <Avatar className={avatarSize}>
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className={isDeleted ? 'bg-gray-200 text-gray-500' : ''}>
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
      )}
      <span className={isDeleted ? 'text-gray-500 italic' : ''}>
        {displayName}
      </span>
    </div>
  );

  // If user is deleted or linkToProfile is false, just return the content
  if (isDeleted || !linkToProfile || !userId) {
    return content;
  }

  // Otherwise, wrap in a link
  return (
    <Link 
      to={`/members/${userId}`} 
      className="hover:underline"
    >
      {content}
    </Link>
  );
};

/**
 * UserDisplayName - Simple text-only display (no avatar)
 * Useful for inline text mentions
 */
export const UserDisplayName: React.FC<Omit<UserDisplayProps, 'showAvatar'>> = (props) => {
  return <UserDisplay {...props} showAvatar={false} />;
};

/**
 * UserAvatar - Avatar-only display (no name)
 * Useful for compact displays or avatar grids
 */
export const UserAvatar: React.FC<UserDisplayProps> = ({
  user,
  fallbackName = 'Former Member',
  size = 'sm',
  className = '',
}) => {
  const displayName = user?.name || user?.full_name || fallbackName;
  const avatarUrl = user?.avatar || user?.avatar_url;
  const isDeleted = !user;

  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const avatarSize = sizeClasses[size];

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <Avatar className={`${avatarSize} ${className}`}>
      <AvatarImage src={avatarUrl} alt={displayName} />
      <AvatarFallback className={isDeleted ? 'bg-gray-200 text-gray-500' : ''}>
        {getInitials(displayName)}
      </AvatarFallback>
    </Avatar>
  );
};
