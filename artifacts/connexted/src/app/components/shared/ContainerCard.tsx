// Split candidate: ~527 lines — consider extracting ContainerCardBadges, ContainerCardActions, and ContainerCardMetadata into sub-components.
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { 
  Users, 
  Globe, 
  Lock, 
  User,
  FileText,
  Star,
  Tag as TagIcon,
  CheckSquare
} from 'lucide-react';
import FavoriteButton from '@/app/components/shared/FavoriteButton';
import { LikeButton } from '@/app/components/engagement/LikeButton';
import { CONTAINER_TYPES, ContainerType } from '@/lib/container-types';
import { 
  getContainerCTA, 
  getSecondaryAction,
  type OperationalState,
  type LifecycleState,
  type MembershipState,
  type AccessType,
  type Visibility
} from '@/lib/container-cta-logic';
import {
  getOperationalStateBadge,
  getLifecycleStateBadge,
  getMembershipStateBadge,
  getAccessTypeBadge,
  getExpirationBadge,
  getScheduledReleaseBadge,
  StateBadge
} from '@/lib/container-state-badges';

// Map plural ContainerType keys → singular content_type strings used in content_likes / content_favorites
const CONTAINER_CONTENT_TYPE: Record<ContainerType, string> = {
  circles: 'circle',
  playlists: 'playlist',
  builds: 'build',
  tables: 'table',
  elevators: 'elevator',
  meetings: 'meeting',
  pitches: 'pitch',
  standups: 'standup',
  sprints: 'sprint',
  meetups: 'meetup',
  moments: 'moment',
  books: 'book',
  magazines: 'magazine',
  libraries: 'library',
  checklists: 'checklist',
  prompts: 'prompt',
};

// Re-export for backwards compatibility
export { CONTAINER_TYPES };

interface ContainerCardProps {
  // Core fields
  id: string;
  type: ContainerType;
  name: string;
  description: string;
  tagline?: string;
  category?: string;
  link: string; // e.g., "/builds/my-build-slug"
  
  // Optional fields
  visibility?: Visibility;
  memberCount?: number;
  createdBy?: { id: string; name: string } | null;
  adminNames?: string[]; // For Circles which show multiple admins
  tags?: string[];
  isFavorited?: boolean; // Changed from favorites array to boolean flag
  
  // Content counts
  documentCount?: number;
  reviewCount?: number;
  checklistCount?: number;
  
  // State fields (NEW)
  operationalState?: OperationalState;
  lifecycleState?: LifecycleState;
  membershipState?: MembershipState;
  accessType?: AccessType;
  expiresAt?: string | null;
  isPermanent?: boolean;
  scheduledReleaseAt?: string | null;
  scheduledArchiveAt?: string | null;
  
  // User context
  isAdmin?: boolean;
  currentUserId?: string | null;

  // Likes (Era 3 engagement)
  likeCount?: number;
  isLiked?: boolean;
  onLikeUpdate?: (id: string, isLiked: boolean, newCount: number) => void;
  
  // Additional badges/metadata
  customBadge?: {
    label: string;
    color: string;
  };
  
  // Actions
  isMember?: boolean;
  onJoin?: () => void;
  onLeave?: () => void;
  onFavoriteUpdate?: (id: string, isFavorited: boolean) => void; // Updated signature
  onAcceptInvite?: () => void;
  onDeclineInvite?: () => void;
  onWithdrawApplication?: () => void;
  onRequestToJoin?: () => void;
  
  // Join button customization (deprecated in favor of dynamic CTA)
  showJoinButton?: boolean;
  joinDisabled?: boolean;
  joinLabel?: string; // e.g., "Request" for request-only circles
}

const getVisibilityIcon = (visibility: string) => {
  switch (visibility) {
    case 'public':
      return <Globe className="w-4 h-4" />;
    case 'member':
      return <Users className="w-4 h-4" />;
    case 'private':
      return <Lock className="w-4 h-4" />;
    default:
      return <Globe className="w-4 h-4" />;
  }
};

const getVisibilityColor = (visibility: string) => {
  switch (visibility) {
    case 'public':
      return 'bg-green-100 text-green-800';
    case 'member':
      return 'bg-blue-100 text-blue-800';
    case 'private':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function ContainerCard({
  id,
  type,
  name,
  description,
  tagline,
  category,
  link,
  visibility,
  memberCount,
  createdBy,
  adminNames,
  tags = [],
  isFavorited,
  documentCount,
  reviewCount,
  checklistCount,
  operationalState,
  lifecycleState,
  membershipState,
  accessType,
  expiresAt,
  isPermanent = false,
  scheduledReleaseAt,
  scheduledArchiveAt,
  isAdmin = false,
  currentUserId,
  likeCount,
  isLiked,
  onLikeUpdate,
  customBadge,
  isMember,
  onJoin,
  onLeave,
  onFavoriteUpdate,
  onAcceptInvite,
  onDeclineInvite,
  onWithdrawApplication,
  onRequestToJoin,
  showJoinButton = true,
  joinDisabled = false,
  joinLabel = 'Join'
}: ContainerCardProps) {
  const config = CONTAINER_TYPES[type];
  
  // Fallback in case of invalid type
  if (!config) {
    console.error(`Invalid container type: ${type}`);
    return null;
  }
  
  const Icon = config.icon;
  
  // Get dynamic CTA based on all state context
  const primaryCTA = getContainerCTA({
    operationalState,
    lifecycleState,
    membershipState,
    accessType,
    visibility,
    isAdmin,
    isGuest: !currentUserId
  });
  
  const secondaryCTA = getSecondaryAction({
    operationalState,
    lifecycleState,
    membershipState,
    accessType,
    visibility,
    isAdmin,
    isGuest: !currentUserId
  });
  
  // Get badge configs
  const opStateBadge = operationalState && operationalState !== 'active' 
    ? getOperationalStateBadge(operationalState) 
    : null;
  const lifecycleBadge = lifecycleState && (lifecycleState === 'engaged' || lifecycleState === 'stale')
    ? getLifecycleStateBadge(lifecycleState)
    : null;
  const membershipBadge = getMembershipStateBadge(membershipState);
  const accessBadge = getAccessTypeBadge(accessType);
  const expirationBadge = getExpirationBadge(expiresAt || null, isPermanent, scheduledArchiveAt);
  const scheduledBadge = operationalState === 'hidden' ? getScheduledReleaseBadge(scheduledReleaseAt || null) : null;
  
  // Action handler mapper
  const handleCTAClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    switch (primaryCTA.action) {
      case 'join':
        onJoin?.();
        break;
      case 'request':
        onRequestToJoin?.();
        break;
      case 'accept':
        onAcceptInvite?.();
        break;
      case 'withdraw':
        onWithdrawApplication?.();
        break;
      // 'open' and 'manage' navigate to the link (handled by card itself)
      default:
        // No action or navigate to link
        break;
    }
  };
  
  const handleSecondaryCTAClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    switch (secondaryCTA?.action) {
      case 'leave':
        onLeave?.();
        break;
      case 'decline':
        onDeclineInvite?.();
        break;
      case 'withdraw':
        onWithdrawApplication?.();
        break;
      default:
        break;
    }
  };
  
  return (
    <Card className="hover:shadow-lg transition-shadow h-full relative">
      {/* Favorite Button - absolutely positioned in top right */}
      {onFavoriteUpdate && (
        <div className="absolute top-4 right-4 z-10">
          <FavoriteButton
            itemId={id}
            itemType={CONTAINER_CONTENT_TYPE[type]}
            isFavorited={isFavorited}
            onUpdate={onFavoriteUpdate}
            className="bg-white/90 backdrop-blur-sm hover:bg-white"
          />
        </div>
      )}
      
      {/* Entire card is clickable */}
      <Link to={link} className="block">
        <CardHeader>
          {/* Icon Badge + Title */}
          <div className="flex items-start gap-3 mb-2">
            <div className={`w-12 h-12 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="line-clamp-1 text-lg">{name}</CardTitle>
              
              {/* Tagline - prominent subtitle */}
              {tagline && (
                <p className="text-sm text-gray-600 mt-0.5 line-clamp-1 font-medium">{tagline}</p>
              )}
              
              {/* Category Badge - topic indicator */}
              {category && (
                <Badge className="mt-1.5 bg-indigo-100 text-indigo-700 border-indigo-200">
                  {category}
                </Badge>
              )}
              
              {customBadge && (
                <Badge className={`mt-1 ${customBadge.color}`}>
                  {customBadge.label}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Description */}
          <CardDescription className="line-clamp-2">{description}</CardDescription>
          
          {/* Creator or Admin Names */}
          {adminNames && adminNames.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
              <User className="w-3 h-3" />
              <span>{type === 'circles' ? 'Led by' : 'Admins'}: {adminNames.join(', ')}</span>
            </div>
          )}
          {createdBy && !adminNames && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
              <User className="w-3 h-3" />
              <span>Created by {createdBy.name}</span>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {/* State Badges Row - NEW */}
            {(opStateBadge || lifecycleBadge || membershipBadge || accessBadge || expirationBadge || scheduledBadge) && (
              <div className="flex items-center gap-2 flex-wrap">
                {opStateBadge && <StateBadge config={opStateBadge} />}
                {lifecycleBadge && <StateBadge config={lifecycleBadge} />}
                {membershipBadge && <StateBadge config={membershipBadge} />}
                {accessBadge && <StateBadge config={accessBadge} />}
                {expirationBadge && <StateBadge config={expirationBadge} />}
                {scheduledBadge && <StateBadge config={scheduledBadge} />}
              </div>
            )}
            
            {/* Visibility Badge */}
            {visibility && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`flex items-center gap-1 ${getVisibilityColor(visibility)}`}
                >
                  {getVisibilityIcon(visibility)}
                  <span className="capitalize text-xs">
                    {visibility.replace('-', ' ')}
                  </span>
                </Badge>
              </div>
            )}
            
            {/* Stats Row */}
            <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
              {memberCount !== undefined && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                </div>
              )}
              {documentCount !== undefined && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{documentCount} {documentCount === 1 ? 'doc' : 'docs'}</span>
                </div>
              )}
              {reviewCount !== undefined && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  <span>{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</span>
                </div>
              )}
              {checklistCount !== undefined && (
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  <span>{checklistCount} {checklistCount === 1 ? 'checklist' : 'checklists'}</span>
                </div>
              )}
            </div>
            
            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <TagIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {tags.slice(0, 3).map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {tags.length > 3 && (
                  <span className="text-xs text-gray-500">+{tags.length - 3}</span>
                )}
              </div>
            )}
            
            {/* CTA Message - if any */}
            {primaryCTA.message && (
              <div className="text-xs text-gray-500 italic">
                {primaryCTA.message}
              </div>
            )}
          </div>
        </CardContent>
      </Link>
      
      {/* Dynamic Action Buttons - NEW */}
      {primaryCTA.type && (
        <div className="px-6 pb-6">
          <div className="flex gap-2">
            {/* Primary CTA */}
            {primaryCTA.action === 'open' || primaryCTA.action === 'manage' ? (
              <Button 
                asChild 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" 
                variant="default"
              >
                <Link to={link}>{primaryCTA.label}</Link>
              </Button>
            ) : (
              <Button
                onClick={handleCTAClick}
                className={`flex-1 ${
                  primaryCTA.type === 'primary' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : primaryCTA.type === 'secondary'
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                    : primaryCTA.type === 'warning'
                    ? 'bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-300'
                    : primaryCTA.type === 'danger'
                    ? 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                }`}
                variant={
                  primaryCTA.type === 'primary' ? 'default' :
                  primaryCTA.type === 'secondary' ? 'outline' :
                  primaryCTA.type === 'warning' ? 'outline' :
                  primaryCTA.type === 'danger' ? 'outline' :
                  'ghost'
                }
                disabled={primaryCTA.disabled}
              >
                {primaryCTA.label}
              </Button>
            )}
            
            {/* Secondary CTA */}
            {secondaryCTA && (
              <Button
                onClick={handleSecondaryCTAClick}
                className={
                  secondaryCTA.type === 'danger' 
                    ? 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                }
                variant="outline"
                size="sm"
              >
                {secondaryCTA.label}
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Fallback to old button system if no dynamic CTA */}
      {!primaryCTA.type && showJoinButton && (onJoin || onLeave) && (
        <div className="px-6 pb-6">
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link to={link}>View {config.label}</Link>
            </Button>
            {isMember && onLeave ? (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  onLeave();
                }}
                variant="secondary"
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-2" />
                Joined
              </Button>
            ) : onJoin ? (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  onJoin();
                }}
                className="flex-1"
                disabled={joinDisabled}
              >
                <Users className="w-4 h-4 mr-2" />
                {joinLabel}
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* Inline Like Button — only rendered for types that opted in via onLikeUpdate */}
      {onLikeUpdate && CONTAINER_CONTENT_TYPE[type] && (
        <div className="px-6 pb-4">
          <LikeButton
            contentType={CONTAINER_CONTENT_TYPE[type]!}
            contentId={id}
            initialIsLiked={isLiked ?? false}
            initialLikesCount={likeCount ?? 0}
            userId={currentUserId ?? undefined}
            size="sm"
            onLikeChange={(liked, count) => onLikeUpdate(id, liked, count)}
          />
        </div>
      )}
    </Card>
  );
}